"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { postsApi, logsApi, settingsApi } from "./lib/api";

interface DashboardStats {
  totalPosts: number;
  drafts: number;
  pendingReview: number;
  publishedToday: number;
  failedJobs: number;
}

interface RecentActivity {
  time: string;
  action: string;
  symbol: string;
  status: string;
  postId?: string;
}

interface ScheduledJob {
  symbol: string;
  schedule: string;
  nextRun: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalPosts: 0,
    drafts: 0,
    pendingReview: 0,
    publishedToday: 0,
    failedJobs: 0,
  });
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [scheduledJobs, setScheduledJobs] = useState<ScheduledJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true);
      setError(null);
      try {
        // Fetch stats, posts, settings, and logs in parallel
        const [
          allPostsRes,
          draftsRes,
          pendingRes,
          failedRes,
          publishedRes,
          logsRes,
          settingsRes,
        ] = await Promise.all([
          postsApi.list({ limit: "100" }).catch(() => ({ posts: [], total: 0 })),
          postsApi.list({ status: "draft", limit: "1" }).catch(() => ({ posts: [], total: 0 })),
          postsApi.list({ status: "pending_review", limit: "1" }).catch(() => ({ posts: [], total: 0 })),
          postsApi.list({ status: "failed", limit: "1" }).catch(() => ({ posts: [], total: 0 })),
          postsApi.list({ status: "published", limit: "50" }).catch(() => ({ posts: [], total: 0 })),
          logsApi.list({ limit: "10" }).catch(() => ({ logs: [], total: 0 })),
          settingsApi.get().catch(() => ({ settings: [] })),
        ]);

        if (allPostsRes.total === 0 && logsRes.total === 0 && settingsRes.settings?.length === 0) {
          throw new Error("Unable to contact the backend server. Verify port 4000.");
        }

        // Map post IDs to symbols for lookup in audit logs
        const postSymbolMap: Record<string, string> = {};
        allPostsRes.posts.forEach((p: any) => {
          postSymbolMap[p.id] = p.symbol;
        });

        // 1. Calculate KPI Stats
        const todayStr = new Date().toDateString();
        const pubToday = publishedRes.posts.filter((p: any) => {
          if (!p.published_at) return false;
          return new Date(p.published_at).toDateString() === todayStr;
        }).length;

        setStats({
          totalPosts: allPostsRes.total,
          drafts: draftsRes.total,
          pendingReview: pendingRes.total,
          publishedToday: pubToday,
          failedJobs: failedRes.total,
        });

        // 2. Parse Recent Activity from Audit Logs
        const formattedActivities: RecentActivity[] = logsRes.logs.map((log: any) => {
          // Try to extract symbol
          let symbol = "—";
          if (log.post_id && postSymbolMap[log.post_id]) {
            symbol = postSymbolMap[log.post_id];
          } else if (log.details?.symbol) {
            symbol = log.details.symbol;
          }

          return {
            time: new Date(log.created_at).toLocaleString(),
            action: log.action.replace(/_/g, " "),
            symbol,
            status: log.status,
            postId: log.post_id || undefined,
          };
        });
        setActivities(formattedActivities);

        // 3. Create Scheduled Jobs from settings
        const cronSetting = settingsRes.settings?.find((s: any) => s.key === "cron_expression");
        const defaultSymbolSetting = settingsRes.settings?.find((s: any) => s.key === "default_symbol");
        
        const cronExpr = cronSetting ? JSON.parse(cronSetting.value) : "0 9 * * *";
        const defSymbol = defaultSymbolSetting ? JSON.parse(defaultSymbolSetting.value) : "BTCUSD";

        // Calculate a mock "Next Run" based on current time
        const nextRunTime = new Date();
        nextRunTime.setHours(9, 0, 0, 0);
        if (nextRunTime <= new Date()) {
          nextRunTime.setDate(nextRunTime.getDate() + 1);
        }

        setScheduledJobs([
          {
            symbol: defSymbol,
            schedule: cronExpr,
            nextRun: nextRunTime.toLocaleString(),
          },
          {
            symbol: "ETHUSD",
            schedule: cronExpr,
            nextRun: nextRunTime.toLocaleString(),
          }
        ]);

      } catch (err: any) {
        console.error("Failed to load dashboard:", err);
        setError(err.message || "Could not load dashboard metrics from backend.");
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-description">Loading system analytics...</p>
          </div>
        </div>

        {/* Stats Grid Skeleton */}
        <div className="stats-grid">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="card skeleton skeleton-card" />
          ))}
        </div>

        {/* Tables Skeleton */}
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "var(--space-lg)", marginTop: "var(--space-xl)" }}>
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: "var(--space-md)" }}>Recent Activity</h3>
            <div className="skeleton skeleton-row" />
            <div className="skeleton skeleton-row" />
            <div className="skeleton skeleton-row" />
          </div>
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: "var(--space-md)" }}>Scheduled Jobs</h3>
            <div className="skeleton skeleton-row" />
            <div className="skeleton skeleton-row" />
          </div>
        </div>
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

      {error && (
        <div className="card" style={{ marginBottom: "var(--space-lg)", borderLeft: "4px solid var(--error)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
            <span style={{ fontSize: "1.5rem" }}>⚠️</span>
            <div>
              <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>Backend Connection Error</div>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: 0 }}>
                {error}. Please check that the server is running and database connection is configured.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--space-md)", marginBottom: "var(--space-xl)" }}>
        <div className="card" id="stat-total-posts">
          <div className="card-header">
            <span className="card-title">Total Posts</span>
            <div className="stat-icon info">📊</div>
          </div>
          <div className="card-value">{stats.totalPosts}</div>
          <div className="card-subtitle">Pipeline total</div>
        </div>

        <div className="card" id="stat-drafts">
          <div className="card-header">
            <span className="card-title">Drafts</span>
            <div className="stat-icon info" style={{ backgroundColor: "rgba(156, 163, 175, 0.15)", color: "#9CA3AF" }}>📝</div>
          </div>
          <div className="card-value">{stats.drafts}</div>
          <div className="card-subtitle">Unprocessed drafts</div>
        </div>

        <div className="card" id="stat-pending-review">
          <div className="card-header">
            <span className="card-title">Pending Review</span>
            <div className="stat-icon warning">⏳</div>
          </div>
          <div className="card-value">{stats.pendingReview}</div>
          <div className="card-subtitle">Awaiting approval</div>
        </div>

        <div className="card" id="stat-published-today">
          <div className="card-header">
            <span className="card-title">Published Today</span>
            <div className="stat-icon success">✅</div>
          </div>
          <div className="card-value">{stats.publishedToday}</div>
          <div className="card-subtitle">Published today</div>
        </div>

        <div className="card" id="stat-failed-jobs">
          <div className="card-header">
            <span className="card-title">Failed Jobs</span>
            <div className="stat-icon error">❌</div>
          </div>
          <div className="card-value">{stats.failedJobs}</div>
          <div className="card-subtitle">Requires attention</div>
        </div>
      </div>

      {/* Tables Section */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "var(--space-lg)" }}>
        
        {/* Recent Activity Table */}
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: "var(--space-md)", color: "var(--text-primary)" }}>Recent Activity</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Action</th>
                  <th>Symbol</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {activities.length > 0 ? (
                  activities.map((act, idx) => (
                    <tr key={idx} style={{ cursor: act.postId ? "pointer" : "default" }}>
                      <td>
                        {act.postId ? (
                          <Link href={`/posts/${act.postId}`} style={{ color: "inherit" }}>
                            {act.time}
                          </Link>
                        ) : (
                          act.time
                        )}
                      </td>
                      <td style={{ textTransform: "capitalize", fontWeight: 500 }}>{act.action}</td>
                      <td><span style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}>{act.symbol}</span></td>
                      <td>
                        <span className={`badge ${act.status === "success" ? "badge-published" : act.status === "failure" ? "badge-failed" : "badge-pending_review"}`}>
                          {act.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", color: "var(--text-muted)" }}>
                      No recent activities recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Upcoming Scheduled Jobs */}
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: "var(--space-md)", color: "var(--text-primary)" }}>Upcoming Scheduled Jobs</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Schedule</th>
                  <th>Next Run</th>
                </tr>
              </thead>
              <tbody>
                {scheduledJobs.length > 0 ? (
                  scheduledJobs.map((job, idx) => (
                    <tr key={idx}>
                      <td>
                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--accent-primary)" }}>
                          {job.symbol}
                        </span>
                      </td>
                      <td>
                        <code style={{ fontSize: "0.8rem", color: "var(--text-secondary)", backgroundColor: "rgba(255,255,255,0.05)", padding: "2px 6px", borderRadius: "4px" }}>
                          {job.schedule}
                        </code>
                      </td>
                      <td style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{job.nextRun}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} style={{ textAlign: "center", color: "var(--text-muted)" }}>
                      No scheduled automation jobs active.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
