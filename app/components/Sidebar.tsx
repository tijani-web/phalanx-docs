"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  {
    label: "overview",
    items: [
      { href: "/", name: "introduction" },
      { href: "/architecture", name: "architecture" },
      { href: "/protocol", name: "protocol" },
    ],
  },
  {
    label: "operations",
    items: [
      { href: "/deployment", name: "deployment" },
      { href: "/cli", name: "cli reference" },
      { href: "/api", name: "api reference" },
    ],
  },
  {
    label: "developers",
    items: [
      { href: "/integration", name: "integration" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="topbar">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {/* Mobile hamburger */}
          <button
            className="mobile-toggle"
            onClick={() => setOpen(!open)}
            aria-label="Toggle navigation"
          >
            <span
              style={{
                transform: open ? "rotate(45deg) translate(3px, 3px)" : "none",
                transition: "transform 200ms ease",
              }}
            />
            <span
              style={{
                opacity: open ? 0 : 1,
                transition: "opacity 150ms ease",
              }}
            />
            <span
              style={{
                transform: open ? "rotate(-45deg) translate(3px, -3px)" : "none",
                transition: "transform 200ms ease",
              }}
            />
          </button>

          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.85rem",
              fontWeight: 600,
              color: "var(--color-text-heading)",
              letterSpacing: "0.04em",
            }}
          >
            PHALANX
          </span>
          <span
            className="hide-on-mobile"
            style={{
              fontSize: "0.7rem",
              color: "var(--color-text-dim)",
              fontFamily: "var(--font-mono)",
            }}
          >
            consensus engine
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
          <span
            className="hide-on-mobile"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.7rem",
              color: "var(--color-text-dim)",
            }}
          >
            v1.0.0
          </span>
          <a
            href="https://github.com/tijani-web/phalanx"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--color-text-muted)", display: "flex" }}
            aria-label="GitHub Repository"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
            </svg>
          </a>
        </div>
      </header>

      {/* Overlay for mobile */}
      {open && (
        <div
          className="mobile-overlay"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <nav className={`sidebar${open ? " open" : ""}`}>
        <div style={{ padding: "1.25rem 0 0.5rem" }}>
          {nav.map((section) => (
            <div key={section.label}>
              <div className="nav-section">- {section.label}</div>
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-item${pathname === item.href ? " active" : ""}`}
                  onClick={() => setOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          ))}
        </div>
      </nav>
    </>
  );
}
