import ArchitectureDiagram from "../components/ArchitectureDiagram";

export default function ArchitecturePage() {
  return (
    <>
      <h1>architecture</h1>
      <p style={{ color: "var(--color-text-muted)", fontSize: "0.95rem", marginBottom: "2rem" }}>
        how phalanx moves data from a client request to a committed, replicated state change.
      </p>

      <h2>multi-threaded concurrency</h2>
 
       <p>
         Phalanx operates on a <strong>concurrent handler model</strong>. While the core consensus
         logic remains sequential and deterministic, the <em>access</em> to the state machine is
         multi-threaded. By decoupling gRPC network handling from background tasks, we enable
         vertical scaling and parallel processing of client requests.
       </p>

      <p>
         Concurrency is managed via a <code>sync.RWMutex</code>. Incoming gRPC handlers execute in
         their own goroutines, locking the mutex only while interacting with the Raft core.
       </p>
 
       <table>
         <thead>
           <tr>
             <th>component</th>
             <th>concurrency</th>
             <th>action</th>
           </tr>
         </thead>
         <tbody>
           <tr>
             <td><code>HandleAppendEntries</code></td>
             <td>gRPC goroutine</td>
             <td>acquires <code>Lock()</code> to step the state machine</td>
           </tr>
           <tr>
             <td><code>HandlePropose</code></td>
             <td>gRPC goroutine</td>
             <td>acquires <code>Lock()</code> to append to log</td>
           </tr>
           <tr>
             <td><code>HandleRead</code></td>
             <td>gRPC goroutine</td>
             <td>acquires <code>RLock()</code> for parallel quorum checks</td>
           </tr>
           <tr>
             <td><code>Background Run</code></td>
             <td>dedicated thread</td>
             <td>acquires <code>Lock()</code> for ticks and discovery</td>
           </tr>
         </tbody>
       </table>

      <pre><code>{`// node.go — the simplified background loop
 for {
     select {
     case <-ctx.Done():
         return n.shutdown()
 
     case <-ticker.C:
         n.mu.Lock()
         n.raft.Tick()
         n.applyCommitted()
         n.persistState()
         n.dispatchMessages()
         n.mu.Unlock()
 
     case event := <-n.discoveryEvents():
         n.mu.Lock()
         n.handleDiscoveryEvent(event)
         n.mu.Unlock()
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
   → HandlePropose() goroutine
   → n.mu.Lock()
   → raft.Propose(data)
   → n.mu.Unlock()
   → broadcastHeartbeat → AppendEntries
   → majority ack → commitIndex advances
   → applyCommitted() → fsm.Apply(SET key=value)
   → signal doneCh
   → respond to client: success`}</code></pre>
 
       <h3>read path (linearizable)</h3>
 
       <pre><code>{`Client
   → gRPC Read(key)
   → HandleRead() goroutine
   → n.mu.RLock()
   → HasLeaderQuorum() → verify majority lease
   → n.mu.RUnlock()
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
             <td>concurrency orchestrator</td>
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
