export default function ProtocolPage() {
  return (
    <>
      <h1>protocol specification</h1>
      <p style={{ color: "var(--color-text-muted)", fontSize: "0.95rem", marginBottom: "2rem" }}>
        raft implementation details, safety properties, and production extensions.
      </p>

      <p>
        Phalanx strictly adheres to the Raft paper while implementing modern extensions
        for production stability. Every safety property listed here is covered by dedicated
        unit tests.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        <span className="spec-badge">§5 leader election</span>
        <span className="spec-badge">§5.3 log replication</span>
        <span className="spec-badge">§5.4.2 commit safety</span>
        <span className="spec-badge">§6 membership</span>
        <span className="spec-badge">§8 no-op entry</span>
        <span className="spec-badge">§9.6 pre-vote</span>
        <span className="spec-badge">lease reads</span>
        <span className="spec-badge">leader stickiness</span>
      </div>

      <h2>§5 &amp; §6 — core consensus</h2>

      <h3>leader election</h3>
      <p>
        Election timeouts are randomized in <code>[ET, 2×ET)</code> ticks to prevent correlated
        elections. The random source is seeded deterministically from the node ID via DJB2 hashing,
        making elections reproducible in tests while still distributed in production.
      </p>

      <pre><code>{`func (r *Raft) resetElectionTimeout() {
    r.electionTimeout = r.baseElectionTimeout +
        r.rand.Intn(r.baseElectionTimeout)
}`}</code></pre>

      <h3>log replication</h3>
      <p>
        Leaders replicate entries via <code>AppendEntries</code>. Followers perform the consistency
        check — matching <code>PrevLogIndex</code> and <code>PrevLogTerm</code> before accepting entries.
        On conflict, the follower truncates <strong>only from the point of conflict</strong>, not the
        entire log:
      </p>

      <pre><code>{`for i, entry := range msg.Entries {
    idx := msg.PrevLogIndex + uint64(i) + 1
    if idx <= r.lastLogIndex() {
        if r.logTerm(idx) != entry.Term {
            // Truncate ONLY from conflict point
            r.log = r.log[:idx]
            r.log = append(r.log, msg.Entries[i:]...)
            break
        }
        // Matching entry — preserve
    } else {
        r.log = append(r.log, msg.Entries[i:]...)
        break
    }
}`}</code></pre>

      <h3>commit advancement</h3>
      <p>
        The leader advances <code>commitIndex</code> only when an entry from the <strong>current
        term</strong> has been replicated to a majority. This is the §5.4.2 safety constraint
        that prevents committed entries from being overwritten.
      </p>

      <h2>§8 — no-op commit safety</h2>

      <p>
        When a leader is elected, it immediately appends an empty no-op entry in its current term
        and broadcasts it to all followers:
      </p>

      <pre><code>{`func (r *Raft) becomeLeader() {
    r.state = Leader
    r.leaderID = r.id

    // §8: Append no-op to unlock commit pipeline
    noop := &pb.LogEntry{
        Index: lastIdx + 1,
        Term:  r.currentTerm,
        Type:  pb.EntryCommand,
        Data:  nil,  // empty marker
    }
    r.log = append(r.log, noop)
    r.broadcastHeartbeat()
}`}</code></pre>

      <blockquote>
        <p>
          without the no-op, a new leader cannot determine which entries from prior terms are
          committed. §5.4.2 only allows committing entries from the current term. the no-op
          &ldquo;unlocks&rdquo; the commit pipeline — once replicated to a majority, all preceding
          entries are also committed.
        </p>
      </blockquote>

      <h2>§9.6 — pre-vote extension</h2>

      <p>
        Before starting a real election, a candidate sends pre-vote requests. These do <strong>not</strong> increment
        the local term:
      </p>

      <pre><code>{`Follower → [election timeout expires]
  → Send MsgRequestVote with IsPreVote=true
  → term is NOT incremented
  → If quorum of pre-votes received:
      → Start REAL election (increment term, become Candidate)
  → If no quorum:
      → Stay follower (term unchanged, no disruption)`}</code></pre>

      <p>
        A node isolated by a network partition will continuously timeout and attempt pre-votes.
        But since it never gets a quorum, it never increments its term. When it reconnects,
        its term hasn&apos;t inflated, so it doesn&apos;t force the cluster to step down. This eliminates
        the &ldquo;disruptive rejoin&rdquo; problem.
      </p>

      <h2>lease-based linearizable reads</h2>

      <p>
        Standard Raft requires a round-trip to the quorum for every read (ReadIndex).
        Phalanx uses lease-based reads for lower latency:
      </p>

      <table>
        <thead>
          <tr>
            <th>step</th>
            <th>mechanism</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1</td>
            <td>leader resets <code>heartbeatAcked = 1</code> (self) at start of each heartbeat round</td>
          </tr>
          <tr>
            <td>2</td>
            <td>each successful <code>AppendEntriesResponse</code> increments the counter</td>
          </tr>
          <tr>
            <td>3</td>
            <td><code>HasLeaderQuorum()</code> returns true only if <code>heartbeatAcked &gt;= quorumSize()</code></td>
          </tr>
          <tr>
            <td>4</td>
            <td>reads served from FSM only when leader confirms majority lease</td>
          </tr>
        </tbody>
      </table>

      <pre><code>{`func (r *Raft) HasLeaderQuorum() bool {
    return r.state == Leader &&
           r.heartbeatAcked >= r.quorumSize()
}`}</code></pre>

      <p>
        If the leader has lost quorum (network partition), reads are rejected with an error.
        No stale reads are ever served.
      </p>

      <h2>leader stickiness</h2>

      <p>
        When a follower has heard from a valid leader within the election timeout, it rejects
        all vote requests — both pre-vote and real. This prevents a partitioned node from
        triggering unnecessary elections when it rejoins.
      </p>

      <p>
        Stickiness decays automatically: when <code>electionElapsed &gt;= electionTimeout</code> without
        hearing from the leader, <code>leaderActive</code> is set to <code>false</code>.
      </p>

      <h2>memory safety</h2>

      <p>
        In <code>broadcastHeartbeat()</code>, log entries are deep-copied via <code>LogEntry.Clone()</code> before
        being placed in outbound messages. This prevents a subtle bug where subsequent
        append/truncate operations on the internal log could silently corrupt in-flight
        messages. Verified by <code>TestHeartbeatMemorySafety</code>.
      </p>
    </>
  );
}
