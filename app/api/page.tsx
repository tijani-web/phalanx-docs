export default function APIPage() {
  return (
    <>
      <h1>api reference</h1>
      <p style={{ color: "var(--color-text-muted)", fontSize: "0.95rem", marginBottom: "2rem" }}>
        gRPC services, request/response formats, and the debug HTTP interface.
      </p>

      <p>
        Phalanx exposes two gRPC services and one HTTP debug endpoint. All gRPC communication
        uses a <strong>JSON codec</strong> — no protoc compiler required. Clients in any language can
        interact with phalanx by sending JSON-encoded payloads over gRPC with the{" "}
        <code>content-subtype: json</code> call option.
      </p>

      <h2>consensus service</h2>

      <p>
        Internal node-to-node RPCs. Not intended for client use.
      </p>

      <table>
        <thead>
          <tr>
            <th>method</th>
            <th>request</th>
            <th>response</th>
            <th>description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>/phalanx.Consensus/AppendEntries</code></td>
            <td>AppendEntriesRequest</td>
            <td>AppendEntriesResponse</td>
            <td>log replication + heartbeats</td>
          </tr>
          <tr>
            <td><code>/phalanx.Consensus/RequestVote</code></td>
            <td>RequestVoteRequest</td>
            <td>RequestVoteResponse</td>
            <td>leader election + pre-vote</td>
          </tr>
        </tbody>
      </table>

      <h2>kv service</h2>

      <p>
        Client-facing RPCs for reading and writing data.
      </p>

      <h3>KV.Propose</h3>

      <p>Submit a mutation (SET or DELETE) to the cluster. The request blocks until
      the entry is committed to a majority.</p>

      <div className="code-label">request — ProposeRequest</div>
      <pre><code>{`{
  "data": "<base64-encoded fsm.Command>"
}`}</code></pre>

      <div className="code-label">command format (json inside data)</div>
      <pre><code>{`{
  "op": "SET",       // or "DELETE"
  "key": "mykey",
  "value": "myvalue" // omitted for DELETE
}`}</code></pre>

      <div className="code-label">response — ProposeResponse</div>
      <pre><code>{`{
  "success": true,
  "leader_addr": "",     // populated on redirect
  "error": ""            // populated on failure
}`}</code></pre>

      <h3>error: not leader</h3>
      <p>
        If the node receiving the request is not the leader, it returns:
      </p>
      <pre><code>{`{
  "success": false,
  "leader_addr": "127.0.0.1:9000",
  "error": "not leader"
}`}</code></pre>

      <hr />

      <h3>KV.Read</h3>

      <p>Read a value by key. Linearizable — the leader verifies quorum before responding.</p>

      <div className="code-label">request — ReadRequest</div>
      <pre><code>{`{
  "key": "mykey"
}`}</code></pre>

      <div className="code-label">response — ReadResponse</div>
      <pre><code>{`{
  "value": "myvalue",
  "found": true,
  "leader_addr": "",
  "error": ""
}`}</code></pre>

      <h3>error: lost quorum</h3>
      <pre><code>{`{
  "value": "",
  "found": false,
  "error": "leader lost quorum — cannot serve linearizable read"
}`}</code></pre>

      <h2>http debug interface</h2>

      <p>
        Every node exposes a debug HTTP server (default port 8080).
      </p>

      <h3>GET /health</h3>
      <pre><code>{`{
  "status": "ok",
  "node": "node-0",
  "state": "LEADER"
}`}</code></pre>

      <h3>GET /debug/status</h3>
      <pre><code>{`{
  "node_id": "node-0",
  "state": "LEADER",
  "term": 5,
  "leader_id": "node-0",
  "commit_index": 42,
  "applied_index": 42,
  "log_length": 43,
  "peers": ["node-1", "node-2"],
  "kv_size": 15,
  "kv_data": {
    "foo": "bar",
    "config.ttl": "3600"
  },
  "metrics": {
    "messages_sent_total": 1247,
    "election_count": 1,
    "proposals_total": 15,
    "reads_total": 8,
    "applied_index": 42,
    "current_state": "LEADER"
  }
}`}</code></pre>

      <h2>metrics</h2>

      <p>
        All metrics use <code>atomic.Uint64</code> for lock-free concurrent access.
      </p>

      <table>
        <thead>
          <tr>
            <th>metric</th>
            <th>type</th>
            <th>description</th>
          </tr>
        </thead>
        <tbody>
          <tr><td><code>messages_sent_total</code></td><td>counter</td><td>total raft messages dispatched</td></tr>
          <tr><td><code>election_count</code></td><td>counter</td><td>elections initiated</td></tr>
          <tr><td><code>last_commit_index</code></td><td>gauge</td><td>highest committed log index</td></tr>
          <tr><td><code>proposals_total</code></td><td>counter</td><td>client proposals received</td></tr>
          <tr><td><code>reads_total</code></td><td>counter</td><td>client reads served</td></tr>
          <tr><td><code>applied_index</code></td><td>gauge</td><td>highest index applied to FSM</td></tr>
          <tr><td><code>current_state</code></td><td>string</td><td>FOLLOWER / CANDIDATE / LEADER</td></tr>
        </tbody>
      </table>

      <h2>grpc codec</h2>

      <p>
        Phalanx registers a custom JSON codec with gRPC. Clients must use the
        <code>json</code> content subtype:
      </p>

      <pre><code>{`conn, _ := grpc.Dial(addr,
    grpc.WithTransportCredentials(insecure.NewCredentials()),
    grpc.WithDefaultCallOptions(
        grpc.CallContentSubtype("json"),
    ),
)

// Then invoke directly:
conn.Invoke(ctx, "/phalanx.KV/Propose", req, resp)`}</code></pre>

      <blockquote>
        <p>
          this means any language with a gRPC client can interact with phalanx
          without generating protobuf stubs. just send JSON.
        </p>
      </blockquote>
    </>
  );
}
