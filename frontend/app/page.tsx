"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { postsApi, healthApi } from "./lib/api";

interface DashboardStats {
  totalPosts: number;
  pendingReview: number;
  publishedToday: number;
  failedPosts: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalPosts: 0, pendingReview: 0, publishedToday: 0, failedPosts: 0,
  });
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const [health, setHealth] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [allPosts, pending, failed, healthData] = await Promise.allSettled([
          postsApi.list({ limit: "10" }),
          postsApi.list({ status: "pending_review" }),
          postsApi.list({ status: "failed" }),
          healthApi.check(),
        ]);

        if (allPosts.status === "fulfilled") {
          setRecentPosts(allPosts.value.posts);
          setStats((s) => ({ ...s, totalPosts: allPosts.value.total }));
        }
        if (pending.status === "fulfilled") {
          setStats((s) => ({ ...s, pendingReview: pending.value.total }));
        }
        if (failed.status === "fulfilled") {
          setStats((s) => ({ ...s, failedPosts: failed.value.total }));
        }
        if (healthData.status === "fulfilled") {
          setHealth(healthData.value.checks);
        }

        // Check if all API calls failed (backend likely offline)
        const allFailed = [allPosts, pending, failed, healthData].every(r => r.status === "rejected");
        if (allFailed) {
          setError("Cannot connect to backend API. Make sure the backend server is running on port 4000.");
        }
      } catch (err) {
        console.error("Failed to load dashboard", err);
        setError("Failed to load dashboard data. Check the console for details.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="loading-spinner" />
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-description">Overview of your chart automation pipeline</p>
        </div>
        <Link href="/capture" className="btn btn-primary">
          📸 New Capture
        </Link>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="card" style={{ marginBottom: "var(--space-lg)", borderLeft: "4px solid var(--error)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
            <span style={{ fontSize: "1.5rem" }}>⚠️</span>
            <div>
              <div style={{ fontWeight: 600, marginBottom: "var(--space-xs)" }}>Connection Error</div>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: 0 }}>{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="card" id="stat-total">
          <div className="card-header">
            <span className="card-title">Total Posts</span>
            <div className="stat-icon info">📊</div>
          </div>
          <div className="card-value">{stats.totalPosts}</div>
          <div className="card-subtitle">All time</div>
        </div>

        <div className="card" id="stat-pending">
          <div className="card-header">
            <span className="card-title">Pending Review</span>
            <div className="stat-icon warning">⏳</div>
          </div>
          <div className="card-value">{stats.pendingReview}</div>
          <div className="card-subtitle">Awaiting approval</div>
        </div>

        <div className="card" id="stat-published">
          <div className="card-header">
            <span className="card-title">Published Today</span>
            <div className="stat-icon success">✅</div>
          </div>
          <div className="card-value">{stats.publishedToday}</div>
          <div className="card-subtitle">Across all platforms</div>
        </div>

        <div className="card" id="stat-failed">
          <div className="card-header">
            <span className="card-title">Failed</span>
            <div className="stat-icon error">❌</div>
          </div>
          <div className="card-value">{stats.failedPosts}</div>
          <div className="card-subtitle">Needs attention</div>
        </div>
      </div>

      {/* System Health */}
      <div style={{ marginBottom: "var(--space-2xl)" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "var(--space-md)" }}>
          System Health
        </h2>
        <div style={{ display: "flex", gap: "var(--space-md)", flexWrap: "wrap" }}>
          {Object.entries(health).length > 0 ? (
            Object.entries(health).map(([key, val]) => (
              <div key={key} className="card" style={{ minWidth: 140, padding: "var(--space-md)" }}>
                <div className="card-title" style={{ marginBottom: "var(--space-xs)" }}>{key}</div>
                <span
                  className={`badge ${val === "ok" ? "badge-published" : "badge-failed"}`}
                >
                  {val}
                </span>
              </div>
            ))
          ) : (
            <div className="card" style={{ padding: "var(--space-md)", color: "var(--text-muted)" }}>
              Health data unavailable — backend may be offline
            </div>
          )}
        </div>
      </div>

      {/* Recent Posts */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-md)" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 600 }}>Recent Posts</h2>
          <Link href="/posts" className="btn btn-secondary btn-sm">View All →</Link>
        </div>

        {recentPosts.length > 0 ? (
          <div className="post-list">
            {recentPosts.map((post) => (
              <Link key={post.id} href={`/posts/${post.id}`} style={{ textDecoration: "none" }}>
                <div className="post-card" id={`post-${post.id}`}>
                  <div
                    className="post-card-thumb"
                    style={{
                      backgroundImage: post.screenshot_url ? `url(${post.screenshot_url})` : undefined,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--text-muted)",
                    }}
                  >
                    {!post.screenshot_url && "📈"}
                  </div>
                  <div className="post-card-info">
                    <div className="post-card-symbol">{post.symbol}</div>
                    <div className="post-card-caption">
                      {post.caption || "Awaiting analysis..."}
                    </div>
                    <div className="post-card-meta">
                      {new Date(post.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="post-card-actions">
                    <span className={`badge badge-${post.status}`}>
                      {post.status.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <p>No posts yet. Start by capturing a chart!</p>
            <Link href="/capture" className="btn btn-primary" style={{ marginTop: "var(--space-md)" }}>
              📸 Capture First Chart
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
