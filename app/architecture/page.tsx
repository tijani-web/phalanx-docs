import ArchitectureDiagram from "../components/ArchitectureDiagram";

export default function ArchitecturePage() {
  return (
    <>
      <h1>architecture</h1>
      <p style={{ color: "var(--color-text-muted)", fontSize: "0.95rem", marginBottom: "2rem" }}>
        how phalanx moves data from a client request to a committed, replicated state change.
      </p>

      <h2>the single-threaded event loop</h2>

      <p>
        Phalanx operates on the principle of <strong>single-threaded control</strong>. While modern
        hardware is multi-core, consensus is inherently sequential — a state machine that processes
        one input at a time. By channeling all state mutations through a single <code>select</code> loop,
        we eliminate the complexity of distributed locking within the process.
      </p>

      <p>
        The event loop in <code>node.go</code> multiplexes six distinct signal channels:
      </p>

      <table>
        <thead>
          <tr>
            <th>signal</th>
            <th>source</th>
            <th>action</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>ticker.C</code></td>
            <td>internal ticker</td>
            <td>triggers election timeouts or leader heartbeats</td>
          </tr>
          <tr>
            <td><code>grpc.RPCs()</code></td>
            <td>gRPC server</td>
            <td>ingests AppendEntries or RequestVote messages</td>
          </tr>
          <tr>
            <td><code>grpc.Proposes()</code></td>
            <td>client API</td>
            <td>ingests new commands into the Raft log</td>
          </tr>
          <tr>
            <td><code>grpc.Reads()</code></td>
            <td>client API</td>
            <td>triggers quorum check for linearizable reads</td>
          </tr>
          <tr>
            <td><code>responseCh</code></td>
            <td>async gRPC clients</td>
            <td>handles callbacks from peer RPC responses</td>
          </tr>
          <tr>
            <td><code>discovery.Events()</code></td>
            <td>gossip mesh</td>
            <td>ingests NodeJoin events to trigger config changes</td>
          </tr>
        </tbody>
      </table>

      <pre><code>{`// node.go — the complete event loop
for {
    select {
    case <-ctx.Done():
        return n.shutdown()

    case <-ticker.C:
        n.raft.Tick()
        n.applyCommitted()
        n.persistState()
        n.dispatchMessages()

    case rpc := <-n.grpc.RPCs():
        n.handleRPC(rpc)

    case op := <-n.grpc.Proposes():
        n.handlePropose(op)

    case op := <-n.grpc.Reads():
        n.handleRead(op)

    case resp := <-n.responseCh:
        n.raft.Step(resp)
        n.applyCommitted()
        n.dispatchMessages()

    case event := <-n.discoveryEvents():
        n.handleDiscoveryEvent(event)
    }
}`}</code></pre>

      <h2>the pure state machine pattern</h2>

      <p>
        <code>raft.go</code> does not know the network exists. It has no imports of <code>net</code>,
        no <code>time.Now()</code>, no goroutines. When a message is processed via <code>Step(msg)</code>,
        the state machine appends outgoing messages to an internal buffer. The caller (Node) is
        responsible for the actual wire delivery:
      </p>

      <pre><code>{`// The Raft state machine produces messages.
// The Node dispatches them over gRPC.
msgs := raft.Messages()
for _, m := range msgs {
    go transport.Send(m)
}`}</code></pre>

      <p>
        This design allows Phalanx to run <strong>1,000+ consensus rounds in a unit test in under
        10ms</strong>, as no real time passes and no network overhead exists. The state machine is
        fully deterministic — given the same sequence of <code>Tick()</code> and <code>Step()</code> calls,
        it produces identical outputs regardless of wall-clock time.
      </p>

      <h2>system topology</h2>

      <ArchitectureDiagram />

      <h2>data flow</h2>

      <h3>write path (propose)</h3>

      <pre><code>{`Client
  → gRPC Propose(data)
  → Node event loop
  → raft.Propose(data)
  → append to leader log (index N)
  → broadcastHeartbeat → AppendEntries to all followers
  → majority ack → commitIndex advances to N
  → applyCommitted() → fsm.Apply(SET key=value)
  → signal pending proposal channel
  → respond to client: success`}</code></pre>

      <h3>read path (linearizable)</h3>

      <pre><code>{`Client
  → gRPC Read(key)
  → Node event loop
  → check: am I leader? (if not → return leader_addr for redirect)
  → HasLeaderQuorum() → verify majority acked this heartbeat round
  → fsm.Get(key)
  → respond to client: value`}</code></pre>

      <h2>component boundaries</h2>

      <table>
        <thead>
          <tr>
            <th>package</th>
            <th>responsibility</th>
            <th>knows about</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>raft/</code></td>
            <td>consensus logic</td>
            <td>nothing (pure state machine)</td>
          </tr>
          <tr>
            <td><code>network/</code></td>
            <td>gRPC transport</td>
            <td><code>pb/</code> types only</td>
          </tr>
          <tr>
            <td><code>storage/</code></td>
            <td>BadgerDB persistence</td>
            <td><code>pb/</code> types only</td>
          </tr>
          <tr>
            <td><code>fsm/</code></td>
            <td>KV state machine</td>
            <td>nothing</td>
          </tr>
          <tr>
            <td><code>discovery/</code></td>
            <td>SWIM gossip</td>
            <td>nothing</td>
          </tr>
          <tr>
            <td><code>node.go</code></td>
            <td>event loop glue</td>
            <td>everything</td>
          </tr>
        </tbody>
      </table>

      <blockquote>
        <p>
          every package except <code>node.go</code> is independently testable with zero dependencies
          on other Phalanx packages. this is by design.
        </p>
      </blockquote>
    </>
  );
}
