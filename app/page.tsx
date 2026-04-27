export default function IntroductionPage() {
  return (
    <>
      <h1>phalanx</h1>
      <p style={{ color: "var(--color-text-muted)", fontSize: "0.95rem", marginBottom: "2rem" }}>
        a distributed consensus engine built for high-throughput, low-latency state replication
        across a 5-node global mesh.
      </p>

      <p>
        Phalanx is a custom implementation of the <strong>Raft consensus protocol</strong> in Go,
        hardened with production extensions (§8, §9.6) and deployed as a <strong>5-node global
        mesh</strong> across Johannesburg, London, Chicago, Singapore, and Frankfurt. It provides a
        replicated key-value store backed by BadgerDB with automatic peer discovery via SWIM gossip.
      </p>

      <p>
        Unlike black-box coordination services, Phalanx exposes a <strong>transparent, deterministic
          state machine</strong> that decouples consensus logic from I/O. The entire Raft core runs
        inside a single-threaded event loop with zero mutex contention on the hot path.
      </p>

      <h2>at a glance</h2>

      <div className="feature-grid">
        <div className="feature-cell">
          <h4>deterministic core</h4>
          <p>Pure state machine. No time.Now(), no rand in consensus logic. Fully reproducible execution.</p>
        </div>
        <div className="feature-cell">
          <h4>zero-lock hot path</h4>
          <p>Single-threaded event loop eliminates mutex contention. Predictable sub-millisecond latency.</p>
        </div>
        <div className="feature-cell">
          <h4>edge-native</h4>
          <p>Built-in IPv6 support and SWIM gossip for zero-conf peer discovery on Fly.io.</p>
        </div>
        <div className="feature-cell">
          <h4>badgerdb persistence</h4>
          <p>LSM-tree storage with separate value logs. Optimized for append-heavy Raft workloads.</p>
        </div>
        <div className="feature-cell">
          <h4>linearizable reads</h4>
          <p>Lease-based quorum verification. Reads served locally when leader holds majority lease.</p>
        </div>
        <div className="feature-cell">
          <h4>pre-vote protocol</h4>
          <p>§9.6 extension prevents partitioned nodes from disrupting healthy clusters on rejoin.</p>
        </div>
      </div>

      <h2>quick start</h2>

      <div className="code-label">build</div>
      <pre><code>{`go build -ldflags="-s -w" -o phalanx-server ./cmd/server
go build -ldflags="-s -w" -o phalanx ./cmd/phalanx`}</code></pre>

      <div className="code-label">run a single node</div>
      <pre><code>{`NODE_ID=node-1 DATA_DIR=./data GRPC_ADDR=127.0.0.1:9000 \\
  DEBUG_ADDR=127.0.0.1:8080 ./phalanx-server`}</code></pre>

      <div className="code-label">write and read</div>
      <pre><code>{`phalanx put mykey myvalue -addr 127.0.0.1:9000
phalanx get mykey -addr 127.0.0.1:9000`}</code></pre>

      <h2>test suite</h2>

      <p>
        31 tests across all packages. Zero flaky tests. The integration test (<code>TestClientKV</code>)
        starts a real cluster over gRPC, elects a leader, replicates a write, and verifies
        all nodes converge — in under 500ms. Production runs a 5-node global mesh with Q=3.
      </p>

      <pre><code>{`$ go test ./... -v -timeout 60s

ok  phalanx          0.48s   (TestClientKV — 3-node integration)
ok  phalanx/raft     0.68s   (17 consensus tests)
ok  phalanx/storage  0.48s   (3 persistence tests)
ok  phalanx/discovery 5.27s  (4 gossip tests)
ok  phalanx/network  0.24s   (8 transport tests)`}</code></pre>

      <h2>dependencies</h2>

      <table>
        <thead>
          <tr>
            <th>package</th>
            <th>purpose</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>dgraph-io/badger/v4</code></td>
            <td>persistent storage (LSM-tree + value log)</td>
          </tr>
          <tr>
            <td><code>google.golang.org/grpc</code></td>
            <td>production RPC transport</td>
          </tr>
          <tr>
            <td><code>hashicorp/memberlist</code></td>
            <td>SWIM gossip peer discovery</td>
          </tr>
        </tbody>
      </table>

      <blockquote>
        <p>
          no protoc compiler required. gRPC uses a hand-written JSON codec and service descriptors.
          no cobra/viper. no prometheus. stdlib only where possible.
        </p>
      </blockquote>
    </>
  );
}
