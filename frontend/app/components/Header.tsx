"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { healthApi, postsApi } from "../lib/api";
import Link from "next/link";

interface AuditLog {
  id: string;
  action: string;
  status: string;
  created_at: string;
}

export default function Header() {
  const pathname = usePathname();
  const [status, setStatus] = useState<"connected" | "capturing" | "publishing" | "error">("connected");
  const [showNotifications, setShowNotifications] = useState(false);
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Map pathnames to human-friendly titles
  const getPageTitle = () => {
    if (pathname === "/") return "Dashboard";
    if (pathname === "/posts") return "Posts Queue";
    if (pathname.startsWith("/posts/") && pathname.endsWith("/draft")) return "Process Draft";
    if (pathname.startsWith("/posts/")) return "Post Details";
    if (pathname === "/capture") return "Capture";
    if (pathname === "/analysis") return "AI Analysis";
    if (pathname === "/publishing") return "Publishing";
    if (pathname === "/logs") return "Logs";
    if (pathname === "/settings") return "Settings";
    return "Operations Dashboard";
  };

  useEffect(() => {
    async function checkStatus() {
      try {
        const health = await healthApi.check();
        
        // Fetch posts to see if any are currently capturing or publishing
        const { posts } = await postsApi.list({ limit: "20" });
        const hasCapturing = posts.some((p: any) => p.status === "capturing" || p.status === "analyzing");
        const hasPublishing = posts.some((p: any) => p.status === "publishing");

        if (hasPublishing) {
          setStatus("publishing");
        } else if (hasCapturing) {
          setStatus("capturing");
        } else if (health.status === "ok") {
          setStatus("connected");
        } else {
          setStatus("error");
        }
      } catch (err) {
        setStatus("error");
      }
    }

    async function fetchNotifications() {
      try {
        // Fetch posts list to get recent activities
        const { posts } = await postsApi.list({ limit: "5" });
        const mockLogs: AuditLog[] = posts.map((p: any) => ({
          id: p.id,
          action: p.status === "published" 
            ? `Published ${p.symbol}` 
            : p.status === "failed" 
            ? `Failed ${p.symbol}` 
            : `Updated ${p.symbol}`,
          status: p.status === "failed" ? "failure" : "success",
          created_at: p.updated_at || p.created_at,
        }));
        setRecentLogs(mockLogs);
        // Say we have 1 or 2 unread if there are failed posts
        const failedCount = posts.filter((p: any) => p.status === "failed").length;
        setUnreadCount(failedCount);
      } catch {
        // Ignore
      }
    }

    checkStatus();
    fetchNotifications();

    const interval = setInterval(() => {
      checkStatus();
    }, 10000);

    return () => clearInterval(interval);
  }, [pathname]);

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications) {
      setUnreadCount(0);
    }
  };

  return (
    <header className="header" style={{ position: "fixed", top: 0, right: 0, left: "var(--sidebar-width)", height: "var(--header-height)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 var(--space-xl)", zIndex: 100, borderBottom: "1px solid var(--borders)" }}>
      <div className="header-title" style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)" }}>
        {getPageTitle()}
      </div>
      
      <div className="header-actions" style={{ display: "flex", alignItems: "center", gap: "var(--space-lg)", position: "relative" }}>
        
        {/* System Status Badge */}
        <div className="status-indicator">
          <span className={`status-dot ${status}`} />
          <span style={{ textTransform: "capitalize", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
            {status === "connected" ? "Connected" : status === "capturing" ? "Capturing" : status === "publishing" ? "Publishing" : "Offline / Error"}
          </span>
        </div>

        {/* Notification Bell */}
        <div style={{ position: "relative" }}>
          <button 
            onClick={toggleNotifications}
            style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: "1.2rem", cursor: "pointer", display: "flex", alignItems: "center", position: "relative", transition: "color var(--transition-fast)" }}
            onMouseEnter={(e) => e.currentTarget.style.color = "var(--text-primary)"}
            onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-secondary)"}
          >
            🔔
            {unreadCount > 0 && (
              <span style={{ position: "absolute", top: -4, right: -4, background: "var(--error)", color: "white", borderRadius: "50%", width: 14, height: 14, fontSize: "0.65rem", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {showNotifications && (
            <div className="card" style={{ position: "absolute", right: 0, top: 35, width: 320, padding: "var(--space-md)", zIndex: 200, boxShadow: "var(--shadow-lg)", border: "1px solid var(--borders)", backgroundColor: "var(--bg-card)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--borders)", paddingBottom: "var(--space-sm)", marginBottom: "var(--space-sm)" }}>
                <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>System Status Alerts</span>
                <button 
                  onClick={() => setShowNotifications(false)}
                  style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.8rem" }}
                >
                  ✕
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)", maxHeight: 240, overflowY: "auto" }}>
                {recentLogs.length > 0 ? (
                  recentLogs.map((log) => (
                    <div key={log.id} style={{ display: "flex", flexDirection: "column", gap: "2px", padding: "6px", borderRadius: "var(--radius-sm)", backgroundColor: "rgba(255,255,255,0.02)", borderLeft: `3px solid ${log.status === "success" ? "var(--success)" : "var(--error)"}` }}>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-primary)", fontWeight: 500 }}>{log.action}</span>
                      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{new Date(log.created_at).toLocaleString()}</span>
                    </div>
                  ))
                ) : (
                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", textAlign: "center", padding: "var(--space-md)" }}>No recent events.</p>
                )}
              </div>
              <div style={{ borderTop: "1px solid var(--borders)", paddingTop: "var(--space-sm)", marginTop: "var(--space-sm)", textAlign: "center" }}>
                <Link href="/logs" style={{ fontSize: "0.75rem", color: "var(--accent-primary)", fontWeight: 500 }} onClick={() => setShowNotifications(false)}>
                  View Audit Logs
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Avatar */}
        <div className="user-avatar" title="Al Rashids Admin">
          AR
        </div>

      </div>
    </header>
  );
}
