"use client";

type Node = { id: string; label: string; x: number; y: number };
type Edge = [string, string];

const nodes: Node[] = [
  // Client
  { id: "client", label: "Client (CLI)", x: 370, y: 15 },

  // 5-Node Global Mesh
  { id: "node0", label: "Node 0\nJNB · Johannesburg", x: 40, y: 130 },
  { id: "node1", label: "Node 1\nLHR · London", x: 200, y: 130 },
  { id: "node2", label: "Node 2\nORD · Chicago", x: 360, y: 130 },
  { id: "node3", label: "Node 3\nSIN · Singapore", x: 520, y: 130 },
  { id: "node4", label: "Node 4\nFRA · Frankfurt", x: 680, y: 130 },

  // Internal stacks
  { id: "raft0", label: "Raft", x: 55, y: 210 },
  { id: "raft1", label: "Raft", x: 215, y: 210 },
  { id: "raft2", label: "Raft", x: 375, y: 210 },
  { id: "raft3", label: "Raft", x: 535, y: 210 },
  { id: "raft4", label: "Raft", x: 695, y: 210 },

  { id: "fsm0", label: "KV FSM", x: 55, y: 252 },
  { id: "fsm1", label: "KV FSM", x: 215, y: 252 },
  { id: "fsm2", label: "KV FSM", x: 375, y: 252 },
  { id: "fsm3", label: "KV FSM", x: 535, y: 252 },
  { id: "fsm4", label: "KV FSM", x: 695, y: 252 },

  { id: "store0", label: "BadgerDB", x: 55, y: 294 },
  { id: "store1", label: "BadgerDB", x: 215, y: 294 },
  { id: "store2", label: "BadgerDB", x: 375, y: 294 },
  { id: "store3", label: "BadgerDB", x: 535, y: 294 },
  { id: "store4", label: "BadgerDB", x: 695, y: 294 },

  // Gossip
  { id: "gossip", label: "SWIM Gossip Mesh · 5 Regions", x: 280, y: 370 },
];

const edges: Edge[] = [
  // Client → All nodes
  ["client", "node0"],
  ["client", "node1"],
  ["client", "node2"],
  ["client", "node3"],
  ["client", "node4"],
  // Internal stacks
  ["node0", "raft0"], ["node1", "raft1"], ["node2", "raft2"], ["node3", "raft3"], ["node4", "raft4"],
  ["raft0", "fsm0"], ["raft1", "fsm1"], ["raft2", "fsm2"], ["raft3", "fsm3"], ["raft4", "fsm4"],
  ["fsm0", "store0"], ["fsm1", "store1"], ["fsm2", "store2"], ["fsm3", "store3"], ["fsm4", "store4"],
  // Gossip
  ["store0", "gossip"], ["store1", "gossip"], ["store2", "gossip"], ["store3", "gossip"], ["store4", "gossip"],
];

const nodeW = 110;
const smallW = 90;
const nodeH = 36;

export default function ArchitectureDiagram() {
  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]));

  const isLeader = (id: string) => id === "node2"; // ORD is primary
  const isInternal = (id: string) =>
    id.startsWith("raft") || id.startsWith("fsm") || id.startsWith("store");
  const isGossip = (id: string) => id === "gossip";
  const isClient = (id: string) => id === "client";
  const isNode = (id: string) => id.startsWith("node");

  const getNodeW = (id: string) => {
    if (isGossip(id)) return 240;
    if (isClient(id)) return 110;
    if (isNode(id)) return nodeW;
    return smallW;
  };

  const getFill = (id: string) => {
    if (isClient(id)) return "rgba(24,24,24,0.95)";
    if (isLeader(id)) return "rgba(30,30,30,0.95)";
    if (isGossip(id)) return "rgba(18,18,18,0.9)";
    if (isInternal(id)) return "rgba(14,14,14,0.9)";
    return "rgba(20,20,20,0.9)";
  };

  const getStroke = (id: string) => {
    if (isLeader(id)) return "#444";
    if (isClient(id)) return "#333";
    if (isGossip(id)) return "#333";
    if (isNode(id)) return "#2a2a2a";
    return "#1e1e1e";
  };

  const getTextColor = (id: string) => {
    if (isLeader(id)) return "#d4d4d4";
    if (isClient(id)) return "#a1a1a1";
    if (isGossip(id)) return "#666";
    if (isNode(id)) return "#888";
    if (isInternal(id)) return "#555";
    return "#666";
  };

  return (
    <div
      style={{
        border: "1px solid #222",
        background: "#0d0d0d",
        overflow: "auto",
        padding: "1rem",
        marginBottom: "1.5rem",
      }}
    >
      <svg viewBox="0 0 850 420" width="100%" style={{ maxHeight: 420, minWidth: 600 }}>
        <defs>
          <marker id="arw" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="#2a2a2a" />
          </marker>
        </defs>

        {/* Edges */}
        {edges.map(([fromId, toId], i) => {
          const from = nodeMap[fromId];
          const to = nodeMap[toId];
          if (!from || !to) return null;

          const fw = getNodeW(fromId);
          const tw = getNodeW(toId);

          const x1 = from.x + fw / 2;
          const y1 = from.y + nodeH;
          const x2 = to.x + tw / 2;
          const y2 = to.y;

          // Vertical (same column) vs curved (different columns)
          if (Math.abs(x1 - x2) < 30) {
            return (
              <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="#1e1e1e" strokeWidth="1" markerEnd="url(#arw)" />
            );
          }

          const midY = (y1 + y2) / 2;
          return (
            <path key={i}
              d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
              fill="none" stroke="#1e1e1e" strokeWidth="1" markerEnd="url(#arw)" />
          );
        })}

        {/* Gossip dashed line */}
        <line x1={80} y1={385} x2={770} y2={385}
          stroke="#2a2a2a" strokeWidth="1" strokeDasharray="6,4" />

        {/* gRPC label */}
        <text x={425} y={90} textAnchor="middle" fontSize="8" fontFamily="monospace" fill="#333">
          gRPC :9000
        </text>

        {/* Quorum indicator */}
        <text x={425} y={415} textAnchor="middle" fontSize="7" fontFamily="monospace" fill="#333">
          N=5  Q=3  · tolerates 2 region failures
        </text>

        {/* Nodes */}
        {nodes.map((node) => {
          const lines = node.label.split("\n");
          const w = getNodeW(node.id);

          return (
            <g key={node.id}>
              <rect x={node.x} y={node.y} width={w} height={nodeH}
                rx={0} fill={getFill(node.id)} stroke={getStroke(node.id)} strokeWidth="1" />
              {lines.map((line, li) => (
                <text key={li}
                  x={node.x + w / 2}
                  y={node.y + nodeH / 2 + (lines.length === 1 ? 1 : li === 0 ? -5 : 8)}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={li === 1 && isNode(node.id) ? "7" : "8.5"}
                  fontFamily="monospace"
                  fill={li === 1 ? "#444" : getTextColor(node.id)}
                >
                  {line}
                </text>
              ))}
              {/* Leader badge */}
              {isLeader(node.id) && (
                <text x={node.x + w / 2} y={node.y - 6} textAnchor="middle"
                  fontSize="6.5" fontFamily="monospace" fill="#555">
                  LEADER
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <p style={{
        fontFamily: "monospace", fontSize: "0.65rem", color: "#333",
        marginTop: "0.5rem", marginBottom: 0,
      }}>
        phalanx global mesh — 5-node consensus cluster across 5 continents
      </p>
    </div>
  );
}
