# ⚔️ PHALANX | Technical Manual

This repository contains the documentation and technical manual for **Phalanx**, a high-performance, globally distributed consensus engine built in Go.

The manual is built with **Next.js 15**, **Tailwind CSS**, and **Turbopack**, designed for extreme readability and sub-millisecond navigation.

**Main Engine Repository:** [github.com/tijani-web/phalanx](https://github.com/tijani-web/phalanx)

## 🚀 Deployment

The documentation is automatically deployed to **Vercel** on every push to the `main` branch.

- **Production URL:** [phalanx-docs.vercel.app](https://phalanx-docs.vercel.app)
- **Root Directory:** `./`
- **Framework Preset:** Next.js

## 🛠️ Local Development

To run the documentation locally:

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📖 Architecture Overview

Phalanx leverages:
- **Custom Raft Implementation**: Strong consistency over global WAN.
- **SWIM Gossip**: Dynamic peer discovery via `memberlist`.
- **BadgerDB**: SSD-optimized LSM-tree storage.
- **gRPC Transport**: High-throughput, low-latency communication.

For full technical specifications, please refer to the [Internal Architecture](https://phalanx-docs.vercel.app/architecture) section.

## 📄 License

This documentation and the Phalanx engine are licensed under the **MIT License**.
