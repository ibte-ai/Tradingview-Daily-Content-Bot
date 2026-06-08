"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();
  
  const links = [
    { href: "/", icon: "📊", label: "Dashboard" },
    { href: "/posts", icon: "📝", label: "Post Queue" },
    { href: "/capture", icon: "📸", label: "Capture" },
    { href: "/logs", icon: "📋", label: "Audit Logs" },
    { href: "/settings", icon: "⚙️", label: "Settings" },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">📈</div>
        <span className="sidebar-brand-name">ChartPost</span>
      </div>
      <nav className="sidebar-nav">
        {links.map((link) => {
          // Highlight active link if pathname matches exactly or starts with it (for nested subroutes)
          const isActive = link.href === "/" 
            ? pathname === "/" 
            : pathname.startsWith(link.href);

          return (
            <Link 
              key={link.href} 
              href={link.href} 
              className={`sidebar-link ${isActive ? "active" : ""}`}
            >
              <span className="sidebar-link-icon">{link.icon}</span>
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div style={{ padding: "var(--space-md)", fontSize: "0.75rem", color: "var(--text-muted)" }}>
        v1.0.0 — AI Automation
      </div>
    </aside>
  );
}
