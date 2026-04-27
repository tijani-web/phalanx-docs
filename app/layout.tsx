import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "./components/Sidebar";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Phalanx — Technical Manual",
  description:
    "A high-performance, distributed consensus engine for the global edge. Custom Raft implementation with Pre-Vote, linearizable reads, and SWIM gossip discovery.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        {/* ─── Sidebar ─── */}
        <Sidebar />

        {/* ─── Content ─── */}
        <main className="content-area">
          <div className="content">{children}</div>
          <footer className="footer">
            phalanx · distributed consensus engine · mit license
          </footer>
        </main>
      </body>
    </html>
  );
}
