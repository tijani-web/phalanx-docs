export default function IntegrationPage() {
  return (
    <>
      <h1>integration</h1>
      <p style={{ color: "var(--color-text-muted)", fontSize: "0.95rem", marginBottom: "2rem" }}>
        embedding phalanx in your own application or using it as a service.
      </p>

      <p>
        There are two ways to use Phalanx: as a <strong>standalone service</strong> you deploy and
        talk to over gRPC, or as a <strong>Go library</strong> you embed directly into your application.
      </p>

      <h2>option 1 — use as a service</h2>

      <p>
        Deploy a Phalanx cluster and interact with it via gRPC from any language.
        This is the simplest approach and works today.
      </p>

      <h3>from go</h3>
      <pre><code>{`import (
    "google.golang.org/grpc"
    "google.golang.org/grpc/credentials/insecure"
    "google.golang.org/grpc/encoding"
)

// Register the JSON codec (once, at init)
encoding.RegisterCodec(jsonCodec{})

// Connect to the cluster leader
conn, _ := grpc.Dial("leader:9000",
    grpc.WithTransportCredentials(insecure.NewCredentials()),
    grpc.WithDefaultCallOptions(grpc.CallContentSubtype("json")),
)

// Write
req := map[string]any{"data": encodeCommand("SET", "foo", "bar")}
resp := map[string]any{}
conn.Invoke(ctx, "/phalanx.KV/Propose", req, &resp)

// Read
readReq := map[string]any{"key": "foo"}
readResp := map[string]any{}
conn.Invoke(ctx, "/phalanx.KV/Read", readReq, &readResp)`}</code></pre>

      <h3>from python</h3>
      <pre><code>{`import grpc
import json

# Custom JSON codec channel
channel = grpc.insecure_channel('leader:9000')

# Use generic unary call with JSON serialization
method = '/phalanx.KV/Propose'
request = json.dumps({
    "data": base64.b64encode(json.dumps({
        "op": "SET", "key": "foo", "value": "bar"
    }).encode()).decode()
}).encode()

response = channel.unary_unary(method)(request)`}</code></pre>

      <h3>from any http client (via grpc-web proxy)</h3>
      <p>
        If you front Phalanx with a gRPC-Web proxy like Envoy or grpcwebproxy,
        any HTTP client can interact with the KV service using JSON payloads.
      </p>

      <h2>option 2 — embed as a go library</h2>

      <p>
        Import Phalanx packages directly into your Go application. This gives you
        full control over the consensus engine — you can build distributed locks,
        replicated queues, or coordination services.
      </p>

      <h3>import the raft core</h3>

      <p>
        The <code>raft/</code> package is a pure state machine with zero I/O dependencies.
        You drive it with <code>Tick()</code> and <code>Step()</code> calls:
      </p>

      <pre><code>{`import (
    "phalanx/raft"
    "phalanx/pb"
)

r := raft.NewRaft(raft.Config{
    ID:               "my-node",
    Peers:            []string{"peer-1", "peer-2"},
    ElectionTimeout:  10,
    HeartbeatTimeout: 3,
    Logger:           slog.Default(),
    Term:             &atomic.Uint64{},
})

// Drive the state machine
r.Tick()                        // advance logical clock
r.Step(incomingMessage)         // process a message
msgs := r.Messages()            // get outbound messages
entries := r.ApplicableEntries() // get committed entries`}</code></pre>

      <h3>use the full node</h3>

      <pre><code>{`import phalanx "phalanx"

node, _ := phalanx.NewNode(phalanx.NodeConfig{
    ID:               "my-node",
    Peers:            []string{"peer-1", "peer-2"},
    TickInterval:     100 * time.Millisecond,
    ElectionTimeout:  10,
    HeartbeatTimeout: 3,
    DataDir:          "/data/my-app",
    GRPCAddr:         "[::]:9000",
    DebugAddr:        "[::]:8080",
    Logger:           myLogger,
    Term:             &atomic.Uint64{},
})

// Wire peer addresses
node.SetPeerAddr("peer-1", "10.0.0.2:9000")
node.SetPeerAddr("peer-2", "10.0.0.3:9000")

// Run the event loop (blocks until ctx is cancelled)
ctx, cancel := signal.NotifyContext(context.Background(),
    syscall.SIGINT, syscall.SIGTERM)
defer cancel()
node.Run(ctx)`}</code></pre>

      <h3>build a custom state machine</h3>

      <p>
        The current KV FSM (<code>fsm/kv.go</code>) implements SET and DELETE. To build your
        own state machine, follow the same pattern:
      </p>

      <pre><code>{`// Your custom state machine
type DistributedQueue struct {
    mu    sync.RWMutex
    items []string
}

func (q *DistributedQueue) Apply(data []byte) error {
    var cmd QueueCommand
    json.Unmarshal(data, &cmd)
    q.mu.Lock()
    defer q.mu.Unlock()
    switch cmd.Op {
    case "PUSH":
        q.items = append(q.items, cmd.Value)
    case "POP":
        if len(q.items) > 0 {
            q.items = q.items[1:]
        }
    }
    return nil
}`}</code></pre>

      <blockquote>
        <p>
          to fully replace the KV FSM with your own, you would modify <code>node.go</code> to accept
          a <code>StateMachine</code> interface instead of the hardcoded <code>fsm.KV</code>. this is
          a planned refactor — see the architecture notes on component boundaries.
        </p>
      </blockquote>

      <h2>package reference</h2>

      <table>
        <thead>
          <tr>
            <th>package</th>
            <th>import path</th>
            <th>what you get</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>raft/</code></td>
            <td><code>phalanx/raft</code></td>
            <td>pure consensus state machine — Tick, Step, Propose, HasLeaderQuorum</td>
          </tr>
          <tr>
            <td><code>fsm/</code></td>
            <td><code>phalanx/fsm</code></td>
            <td>KV state machine — Apply, Get, Snapshot</td>
          </tr>
          <tr>
            <td><code>storage/</code></td>
            <td><code>phalanx/storage</code></td>
            <td>BadgerDB persistence — SaveState, LoadState, AppendLog</td>
          </tr>
          <tr>
            <td><code>network/</code></td>
            <td><code>phalanx/network</code></td>
            <td>gRPC transport — send/receive RPCs, KV channels</td>
          </tr>
          <tr>
            <td><code>discovery/</code></td>
            <td><code>phalanx/discovery</code></td>
            <td>SWIM gossip — automatic peer discovery, join/leave events</td>
          </tr>
          <tr>
            <td><code>pb/</code></td>
            <td><code>phalanx/pb</code></td>
            <td>RPC types — LogEntry, request/response structs, service interfaces</td>
          </tr>
          <tr>
            <td><code>observability/</code></td>
            <td><code>phalanx/observability</code></td>
            <td>metrics + debug HTTP handler</td>
          </tr>
          <tr>
            <td><code>logger/</code></td>
            <td><code>phalanx/logger</code></td>
            <td>structured slog with atomic term injection</td>
          </tr>
        </tbody>
      </table>

      <h2>design constraints for embedders</h2>

      <ul>
        <li>
          the Raft state machine is <strong>not thread-safe</strong>. all calls to <code>Tick()</code>,{" "}
          <code>Step()</code>, <code>Propose()</code>, and <code>Messages()</code> must happen from
          a single goroutine (the event loop).
        </li>
        <li>
          <code>Messages()</code> drains the outbound buffer. call it once per event cycle, not
          multiple times.
        </li>
        <li>
          <code>ApplicableEntries()</code> advances <code>lastApplied</code>. call it once, apply all
          returned entries to your FSM in order, and do not retry.
        </li>
        <li>
          peer addresses must be registered via <code>SetPeerAddr()</code> before <code>Run()</code> unless
          you&apos;re using gossip discovery.
        </li>
      </ul>
    </>
  );
}
