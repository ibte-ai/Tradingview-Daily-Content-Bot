"use client";

import { useEffect, useState } from "react";
import { postsApi } from "../lib/api";
import Link from "next/link";

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "capturing", label: "Capturing" },
  { value: "analyzing", label: "Analyzing" },
  { value: "pending_review", label: "Pending Review" },
  { value: "approved", label: "Approved" },
  { value: "published", label: "Published" },
  { value: "failed", label: "Failed" },
];

export default function PostsPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);

  // Edit Caption Modal State
  const [editingPost, setEditingPost] = useState<any | null>(null);
  const [editCaption, setEditCaption] = useState("");
  const [editRiskNote, setEditRiskNote] = useState("");

  async function loadPosts() {
    setLoading(true);
    try {
      const params: Record<string, string> = { limit: "100" };
      if (filter !== "all") params.status = filter;
      const data = await postsApi.list(params);
      setPosts(data.posts);
      setTotal(data.total);
    } catch (err: any) {
      showToast(err.message || "Failed to load posts", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPosts();
  }, [filter]);

  function showToast(message: string, type: string) {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleApprove(id: string) {
    try {
      await postsApi.approve(id);
      showToast("Post approved successfully!", "success");
      loadPosts();
    } catch (err: any) {
      showToast(err.message || "Approval failed", "error");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete/fail this post?")) return;
    try {
      await postsApi.delete(id);
      showToast("Post deleted successfully", "success");
      loadPosts();
    } catch (err: any) {
      showToast(err.message || "Delete failed", "error");
    }
  }

  function openEditModal(post: any, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setEditingPost(post);
    setEditCaption(post.caption || "");
    setEditRiskNote(post.risk_note || "");
  }

  async function saveEdit() {
    if (!editingPost) return;
    try {
      await postsApi.update(editingPost.id, {
        caption: editCaption,
        risk_note: editRiskNote,
      });
      showToast("Post details updated", "success");
      setEditingPost(null);
      loadPosts();
    } catch (err: any) {
      showToast(err.message || "Update failed", "error");
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Posts Queue</h1>
          <p className="page-description">{total} total posts captured</p>
        </div>
        <Link href="/capture" className="btn btn-primary">+ Capture New</Link>
      </div>

      {/* Filter Chips */}
      <div className="filters-bar">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s.value}
            className={`filter-chip ${filter === s.value ? "active" : ""}`}
            onClick={() => setFilter(s.value)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        /* Skeleton Table Loader */
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Screenshot</th>
                  <th>Symbol</th>
                  <th>Status</th>
                  <th>Created At</th>
                  <th>Platforms</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4].map((i) => (
                  <tr key={i}>
                    <td><div className="skeleton skeleton-thumb" /></td>
                    <td><div className="skeleton" style={{ width: 80, height: 16 }} /></td>
                    <td><div className="skeleton" style={{ width: 100, height: 24, borderRadius: 12 }} /></td>
                    <td><div className="skeleton" style={{ width: 140, height: 16 }} /></td>
                    <td><div className="skeleton" style={{ width: 60, height: 20 }} /></td>
                    <td><div className="skeleton" style={{ width: 160, height: 32 }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : posts.length > 0 ? (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Screenshot</th>
                  <th>Symbol</th>
                  <th>Status</th>
                  <th>Created At</th>
                  <th>Platforms</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => {
                  const hasFacebook = post.published_platforms?.facebook?.status === "success";
                  const hasInstagram = post.published_platforms?.instagram?.status === "success";
                  const hasWhatsapp = post.published_platforms?.whatsapp?.status === "success";

                  const isReviewable = post.status === "pending_review";

                  return (
                    <tr key={post.id}>
                      <td>
                        <Link href={`/posts/${post.id}`}>
                          {post.screenshot_url ? (
                            <img
                              src={post.screenshot_url}
                              alt={post.symbol}
                              style={{
                                width: 100,
                                height: 56,
                                objectFit: "cover",
                                borderRadius: "var(--radius-sm)",
                                border: "1px solid var(--borders)",
                                display: "block",
                                transition: "transform var(--transition-fast)"
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"}
                              onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                            />
                          ) : (
                            <div
                              style={{
                                width: 100,
                                height: 56,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background: "rgba(255,255,255,0.02)",
                                border: "1px dashed var(--borders)",
                                borderRadius: "var(--radius-sm)",
                                fontSize: "1.2rem",
                                color: "var(--text-muted)",
                              }}
                            >
                              📈
                            </div>
                          )}
                        </Link>
                      </td>
                      <td>
                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "0.95rem" }}>
                          {post.symbol}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-${post.status}`}>
                          {post.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                        {new Date(post.created_at).toLocaleString()}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "var(--space-xs)" }}>
                          <span
                            className="platform-icon platform-instagram"
                            style={{ opacity: hasInstagram ? 1 : 0.2, width: 22, height: 22, fontSize: "0.75rem" }}
                            title={hasInstagram ? "Published to Instagram" : "Not Published"}
                          >
                            📷
                          </span>
                          <span
                            className="platform-icon platform-facebook"
                            style={{ opacity: hasFacebook ? 1 : 0.2, width: 22, height: 22, fontSize: "0.75rem", fontWeight: 700 }}
                            title={hasFacebook ? "Published to Facebook" : "Not Published"}
                          >
                            f
                          </span>
                          <span
                            className="platform-icon platform-whatsapp"
                            style={{ opacity: hasWhatsapp ? 1 : 0.2, width: 22, height: 22, fontSize: "0.75rem" }}
                            title={hasWhatsapp ? "Published to WhatsApp" : "Not Published"}
                          >
                            💬
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "var(--space-xs)" }}>
                          <Link href={post.status === "draft" ? `/posts/${post.id}/draft` : `/posts/${post.id}`} className="btn btn-secondary btn-sm">
                            View
                          </Link>
                          <button onClick={(e) => openEditModal(post, e)} className="btn btn-secondary btn-sm">
                            Edit
                          </button>
                          {isReviewable && (
                            <button onClick={() => handleApprove(post.id)} className="btn btn-success btn-sm">
                              ✓ Approve
                            </button>
                          )}
                          <button onClick={() => handleDelete(post.id)} className="btn btn-danger btn-sm" style={{ padding: "4px 8px" }}>
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="empty-state card" style={{ padding: "var(--space-2xl)", borderStyle: "dashed" }}>
          <div className="empty-state-icon" style={{ fontSize: "3.5rem" }}>📭</div>
          <h3 style={{ color: "var(--text-primary)", marginBottom: "var(--space-xs)" }}>No posts found</h3>
          <p style={{ color: "var(--text-secondary)", marginBottom: "var(--space-lg)" }}>
            Create your first TradingView capture to start the AI automation pipeline.
          </p>
          <Link href="/capture" className="btn btn-primary">
            📸 Capture First Chart
          </Link>
        </div>
      )}

      {/* Quick Edit Modal */}
      {editingPost && (
        <div className="modal-overlay">
          <div className="modal-container">
            <h2 className="modal-title">Quick Edit Post ({editingPost.symbol})</h2>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label" htmlFor="modal-caption">Caption</label>
                <textarea
                  id="modal-caption"
                  className="form-textarea"
                  value={editCaption}
                  onChange={(e) => setEditCaption(e.target.value)}
                  rows={5}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="modal-risk">Risk Disclaimer</label>
                <input
                  id="modal-risk"
                  type="text"
                  className="form-input"
                  value={editRiskNote}
                  onChange={(e) => setEditRiskNote(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setEditingPost(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveEdit}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast ${toast.type}`}>
          <span>{toast.type === "success" ? "✅" : "❌"}</span>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
