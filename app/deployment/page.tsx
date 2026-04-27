export default function DeploymentPage() {
  return (
    <>
      <h1>deployment</h1>
      <p style={{ color: "var(--color-text-muted)", fontSize: "0.95rem", marginBottom: "2rem" }}>
        from local development to a 5-node global mesh on fly.io.
      </p>

      <h2>local development</h2>

      <h3>build</h3>
      <pre><code>{`go build -ldflags="-s -w" -o phalanx-server ./cmd/server
go build -ldflags="-s -w" -o phalanx ./cmd/phalanx`}</code></pre>

      <h3>single node</h3>
      <pre><code>{`NODE_ID=node-1 DATA_DIR=./data \\
  GRPC_ADDR=127.0.0.1:9000 DEBUG_ADDR=127.0.0.1:8080 \\
  TICK_MS=100 ELECTION=10 HEARTBEAT=3 \\
  ./phalanx-server`}</code></pre>

      <blockquote>
        <p>
          local development uses faster tick values (100ms/10/3) since there&apos;s no
          cross-continental latency. production defaults are tuned for global RTT.
        </p>
      </blockquote>

      <h3>5-node local cluster</h3>
      <pre><code>{`# terminal 1 (simulating Johannesburg)
NODE_ID=node-0 PEERS=node-1,node-2,node-3,node-4 DATA_DIR=./data/0 \\
  GRPC_ADDR=127.0.0.1:9000 DEBUG_ADDR=127.0.0.1:8080 \\
  TICK_MS=100 ELECTION=10 HEARTBEAT=3 ./phalanx-server

# terminal 2 (simulating London)
NODE_ID=node-1 PEERS=node-0,node-2,node-3,node-4 DATA_DIR=./data/1 \\
  GRPC_ADDR=127.0.0.1:9001 DEBUG_ADDR=127.0.0.1:8081 \\
  TICK_MS=100 ELECTION=10 HEARTBEAT=3 ./phalanx-server

# terminal 3 (simulating Chicago)
NODE_ID=node-2 PEERS=node-0,node-1,node-3,node-4 DATA_DIR=./data/2 \\
  GRPC_ADDR=127.0.0.1:9002 DEBUG_ADDR=127.0.0.1:8082 \\
  TICK_MS=100 ELECTION=10 HEARTBEAT=3 ./phalanx-server

# terminal 4 (simulating Singapore)
NODE_ID=node-3 PEERS=node-0,node-1,node-2,node-4 DATA_DIR=./data/3 \\
  GRPC_ADDR=127.0.0.1:9003 DEBUG_ADDR=127.0.0.1:8083 \\
  TICK_MS=100 ELECTION=10 HEARTBEAT=3 ./phalanx-server

# terminal 5 (simulating Frankfurt)
NODE_ID=node-4 PEERS=node-0,node-1,node-2,node-3 DATA_DIR=./data/4 \\
  GRPC_ADDR=127.0.0.1:9004 DEBUG_ADDR=127.0.0.1:8084 \\
  TICK_MS=100 ELECTION=10 HEARTBEAT=3 ./phalanx-server`}</code></pre>

      <h2>docker</h2>

      <pre><code>{`docker build -t phalanx .
docker run -v phalanx_data:/data -p 9000:9000 -p 8080:8080 phalanx`}</code></pre>

      <h2>global deployment — fly.io</h2>

      <p>
        Phalanx is designed to run as a <strong>5-node global mesh</strong> across 5 continents.
        Each node runs in a different Fly.io region with persistent storage and automatic
        peer discovery via SWIM gossip.
      </p>

      <table>
        <thead>
          <tr>
            <th>region</th>
            <th>code</th>
            <th>continent</th>
            <th>role</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Johannesburg</td><td><code>JNB</code></td><td>Africa</td><td>voter</td></tr>
          <tr><td>London</td><td><code>LHR</code></td><td>Europe</td><td>voter</td></tr>
          <tr><td>Chicago</td><td><code>ORD</code></td><td>North America</td><td>primary region</td></tr>
          <tr><td>Singapore</td><td><code>SIN</code></td><td>Asia-Pacific</td><td>voter</td></tr>
          <tr><td>Frankfurt</td><td><code>FRA</code></td><td>Central Europe</td><td>voter</td></tr>
        </tbody>
      </table>

      <h3>step 1 — create the app</h3>
      <pre><code>{`fly launch --copy-config --name phalanx --region ord`}</code></pre>

      <h3>step 2 — create persistent volumes (one per region)</h3>
      <p>
        Each node requires its own BadgerDB volume. Volumes are region-bound and survive
        VM restarts and redeploys.
      </p>
      <pre><code>{`fly volumes create phalanx_data --size 1 --region jnb
fly volumes create phalanx_data --size 1 --region lhr
fly volumes create phalanx_data --size 1 --region ord
fly volumes create phalanx_data --size 1 --region sin
fly volumes create phalanx_data --size 1 --region fra`}</code></pre>

      <h3>step 3 — deploy</h3>
      <pre><code>{`fly deploy`}</code></pre>

      <h3>step 4 — scale to 5 nodes</h3>
      <pre><code>{`fly scale count 5`}</code></pre>

      <h3>step 5 — verify global mesh</h3>
      <pre><code>{`# check each region
fly proxy 8080:8080
curl http://localhost:8080/debug/status | jq .

# write from any region
phalanx put hello world -addr <fly-app>:9000

# read from any region (linearizable — leader verifies quorum)
phalanx get hello -addr <fly-app>:9000`}</code></pre>

      <h2>why 5 nodes, not 6?</h2>

      <p>
        Raft requires a <strong>strict majority</strong> to commit writes. For odd and even cluster sizes:
      </p>

      <table>
        <thead>
          <tr>
            <th>nodes</th>
            <th>quorum</th>
            <th>fault tolerance</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>3</td><td>2</td><td>1 failure</td></tr>
          <tr><td>4</td><td>3</td><td>1 failure</td></tr>
          <tr><td><strong>5</strong></td><td><strong>3</strong></td><td><strong>2 failures</strong></td></tr>
          <tr><td>6</td><td>4</td><td>2 failures</td></tr>
          <tr><td>7</td><td>4</td><td>3 failures</td></tr>
        </tbody>
      </table>

      <p>
        4 nodes requires the same quorum as 3 (Q=3 vs Q=2) but only gains
        one more machine to fail — the 4th node adds cost without improving fault tolerance.
        6 nodes has the same fault tolerance as 5 (both survive 2 failures) but requires
        an extra machine and more heartbeat traffic. <strong>Odd numbers are always more
        efficient for consensus.</strong>
      </p>

      <h2>cross-continental latency tuning</h2>

      <p>
        The worst-case RTT in the global mesh is Johannesburg ↔ Singapore (~300ms). The timing
        constants are tuned to prevent election &ldquo;flapping&rdquo; on high-latency paths:
      </p>

      <table>
        <thead>
          <tr>
            <th>parameter</th>
            <th>value</th>
            <th>effective time</th>
            <th>rationale</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>TICK_MS</code></td>
            <td>200</td>
            <td>200ms per tick</td>
            <td>absorbs cross-Atlantic RTT without wasting CPU on fast ticks</td>
          </tr>
          <tr>
            <td><code>HEARTBEAT</code></td>
            <td>5 ticks</td>
            <td>1 second</td>
            <td>allows 3 RTTs within a heartbeat interval for reliable ack delivery</td>
          </tr>
          <tr>
            <td><code>ELECTION</code></td>
            <td>20 ticks</td>
            <td>4–8 seconds (randomized)</td>
            <td>wide window prevents false elections from transient latency spikes</td>
          </tr>
        </tbody>
      </table>

      <blockquote>
        <p>
          rule of thumb: election timeout should be at least 4× heartbeat interval.
          here it&apos;s 4× minimum (20 vs 5 ticks), 8× maximum (40 vs 5 ticks).
        </p>
      </blockquote>

      <h2>how start.sh works</h2>

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
            <td>derives <code>NODE_ID</code> from <code>FLY_MACHINE_ID</code></td>
          </tr>
          <tr>
            <td>2</td>
            <td>detects region from <code>FLY_REGION</code> for operational tagging</td>
          </tr>
          <tr>
            <td>3</td>
            <td>discovers peers via DNS AAAA records on <code>&lt;app&gt;.internal</code></td>
          </tr>
          <tr>
            <td>4</td>
            <td>builds gossip seed list from discovered IPv6 addresses</td>
          </tr>
          <tr>
            <td>5</td>
            <td>logs effective timing constants for operational visibility</td>
          </tr>
          <tr>
            <td>6</td>
            <td>starts the server with persistent storage at <code>/data</code></td>
          </tr>
        </tbody>
      </table>

      <h2>configuration reference</h2>

      <table>
        <thead>
          <tr>
            <th>variable</th>
            <th>default</th>
            <th>description</th>
          </tr>
        </thead>
        <tbody>
          <tr><td><code>NODE_ID</code></td><td>hostname</td><td>unique node identifier</td></tr>
          <tr><td><code>PEERS</code></td><td>—</td><td>comma-separated peer node IDs</td></tr>
          <tr><td><code>DATA_DIR</code></td><td>/data</td><td>BadgerDB storage directory</td></tr>
          <tr><td><code>GRPC_ADDR</code></td><td>[::]:9000</td><td>gRPC listen address</td></tr>
          <tr><td><code>DEBUG_ADDR</code></td><td>[::]:8080</td><td>debug HTTP listen address</td></tr>
          <tr><td><code>SEEDS</code></td><td>—</td><td>comma-separated gossip seed addresses</td></tr>
          <tr><td><code>BIND_ADDR</code></td><td>::</td><td>gossip protocol bind address</td></tr>
          <tr><td><code>BIND_PORT</code></td><td>7946</td><td>gossip protocol bind port</td></tr>
          <tr><td><code>TICK_MS</code></td><td>200</td><td>tick interval in milliseconds (tuned for global RTT)</td></tr>
          <tr><td><code>ELECTION</code></td><td>20</td><td>election timeout in ticks (= 4s effective)</td></tr>
          <tr><td><code>HEARTBEAT</code></td><td>5</td><td>heartbeat interval in ticks (= 1s effective)</td></tr>
        </tbody>
      </table>

      <h2>chaos testing</h2>

      <p>
        Phalanx ships with a chaos script that proves zero-downtime availability
        under machine restarts in the 5-node global mesh:
      </p>

      <pre><code>{`./scripts/chaos.sh phalanx "[fdaa::1]:9000"`}</code></pre>

      <p>
        The script starts a background writer, randomly restarts Fly.io machines
        across different regions, and verifies read-after-write consistency after each
        round. With Q=3 and N=5, the cluster survives any 2 simultaneous region failures.
      </p>
    </>
  );
}
