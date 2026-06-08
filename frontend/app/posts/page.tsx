"use client";

import { useEffect, useState } from "react";
import { postsApi } from "../lib/api";
import Link from "next/link";

const STATUS_FILTERS = [
  "all", "draft", "capturing", "analyzing", "pending_review",
  "approved", "publishing", "published", "partially_published", "failed",
];

export default function PostsPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  async function loadPosts() {
    setLoading(true);
    try {
      const params: Record<string, string> = { limit: "50" };
      if (filter !== "all") params.status = filter;
      const data = await postsApi.list(params);
      setPosts(data.posts);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadPosts(); }, [filter]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Post Queue</h1>
          <p className="page-description">{total} total posts</p>
        </div>
        <Link href="/capture" className="btn btn-primary">+ New Post</Link>
      </div>

      <div className="filters-bar">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            className={`filter-chip ${filter === s ? "active" : ""}`}
            onClick={() => setFilter(s)}
          >
            {s === "all" ? "All" : s.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-overlay">
          <div className="loading-spinner" />
        </div>
      ) : posts.length > 0 ? (
        <div className="post-list">
          {posts.map((post) => (
            <Link key={post.id} href={`/posts/${post.id}`} style={{ textDecoration: "none" }}>
              <div className="post-card" id={`post-card-${post.id}`}>
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
                    fontSize: "1.5rem",
                  }}
                >
                  {!post.screenshot_url && "📈"}
                </div>
                <div className="post-card-info">
                  <div className="post-card-symbol">{post.symbol}</div>
                  <div className="post-card-caption">
                    {post.caption || "Processing..."}
                  </div>
                  <div className="post-card-meta">
                    Created: {new Date(post.created_at).toLocaleString()}
                    {post.published_at && ` • Published: ${new Date(post.published_at).toLocaleString()}`}
                  </div>
                </div>
                <div className="post-card-actions">
                  <span className={`badge badge-${post.status}`}>
                    {post.status.replace(/_/g, " ")}
                  </span>
                  {post.ai_analysis?.market_trend && (
                    <span className={`badge badge-${post.ai_analysis.market_trend === "bullish" ? "published" : post.ai_analysis.market_trend === "bearish" ? "failed" : "pending_review"}`}>
                      {post.ai_analysis.market_trend}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <p>No posts found{filter !== "all" ? ` with status "${filter.replace(/_/g, " ")}"` : ""}.</p>
        </div>
      )}
    </div>
  );
}
