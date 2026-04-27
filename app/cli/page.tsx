export default function CLIPage() {
  return (
    <>
      <h1>cli reference</h1>
      <p style={{ color: "var(--color-text-muted)", fontSize: "0.95rem", marginBottom: "2rem" }}>
        the <code>phalanx</code> binary — a lightweight client for interacting with a running cluster.
      </p>

      <h2>install</h2>

      <pre><code>{`go build -ldflags="-s -w" -o phalanx ./cmd/phalanx`}</code></pre>

      <h2>phalanx put</h2>

      <p>Write a key-value pair to the cluster via the <code>KV.Propose</code> RPC.</p>

      <div className="code-label">usage</div>
      <pre><code>{`phalanx put <key> <value> [-addr host:port]`}</code></pre>

      <div className="code-label">example</div>
      <pre><code>{`$ phalanx put config.ttl 3600 -addr 127.0.0.1:9000
✓ SET config.ttl = 3600`}</code></pre>

      <p>
        The command blocks until the entry is committed to a majority of the cluster.
        Default timeout is 5 seconds.
      </p>

      <h2>phalanx get</h2>

      <p>Read a value by key via the <code>KV.Read</code> RPC. Linearizable — the leader
      verifies it still holds a majority lease before responding.</p>

      <div className="code-label">usage</div>
      <pre><code>{`phalanx get <key> [-addr host:port]`}</code></pre>

      <div className="code-label">example</div>
      <pre><code>{`$ phalanx get config.ttl -addr 127.0.0.1:9000
config.ttl = 3600`}</code></pre>

      <div className="code-label">key not found</div>
      <pre><code>{`$ phalanx get nonexistent -addr 127.0.0.1:9000
(not found) nonexistent`}</code></pre>

      <h2>phalanx status</h2>

      <p>
        Query the debug HTTP endpoint and display a formatted table of the node&apos;s
        health, Raft state, and metrics.
      </p>

      <div className="code-label">usage</div>
      <pre><code>{`phalanx status [-addr host:port]`}</code></pre>

      <div className="code-label">example output</div>
      <pre><code>{`$ phalanx status -addr 127.0.0.1:8080
┌──────────────────────────────────────────────────┐
│                  NODE STATUS                     │
├──────────────────────────────────────────────────┤
│ Node ID                                  node-0 │
│ State                                    LEADER │
│ Term                                          3 │
│ Leader                                   node-0 │
│ Commit Index                                 42 │
│ Applied Index                                42 │
│ Log Length                                   43 │
│ KV Size                                      15 │
│ Peers                        node-1, node-2     │
│                                                  │
│                    METRICS                       │
├──────────────────────────────────────────────────┤
│ Messages Sent                              1247 │
│ Elections                                     1 │
│ Proposals                                    15 │
│ Reads                                         8 │
└──────────────────────────────────────────────────┘`}</code></pre>

      <blockquote>
        <p>
          note: <code>put</code> and <code>get</code> connect to the gRPC port (default 9000).
          <code>status</code> connects to the HTTP debug port (default 8080).
        </p>
      </blockquote>

      <h2>leader redirection</h2>

      <p>
        If you send a request to a follower, the response includes the leader&apos;s address:
      </p>

      <pre><code>{`$ phalanx put foo bar -addr 127.0.0.1:9001
✗ failed: not leader (try: -addr 127.0.0.1:9000)`}</code></pre>

      <p>
        The CLI does not auto-redirect. This is intentional — the operator should know
        which node is the leader and can use the hint to retry.
      </p>

      <h2>default addresses</h2>

      <table>
        <thead>
          <tr>
            <th>command</th>
            <th>protocol</th>
            <th>default address</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>put</code></td>
            <td>gRPC</td>
            <td><code>localhost:9000</code></td>
          </tr>
          <tr>
            <td><code>get</code></td>
            <td>gRPC</td>
            <td><code>localhost:9000</code></td>
          </tr>
          <tr>
            <td><code>status</code></td>
            <td>HTTP</td>
            <td><code>localhost:8080</code></td>
          </tr>
        </tbody>
      </table>
    </>
  );
}
