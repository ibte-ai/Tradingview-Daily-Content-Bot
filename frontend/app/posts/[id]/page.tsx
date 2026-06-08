"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { postsApi } from "../../lib/api";
import Link from "next/link";

type PlatformStatus = "idle" | "loading" | "success" | "error";

interface PlatformState {
  status: PlatformStatus;
  message?: string;
}

export default function PostDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [post, setPost] = useState<any>(null);
  const [auditTrail, setAuditTrail] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [caption, setCaption] = useState("");
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);

  const [platformStates, setPlatformStates] = useState<Record<string, PlatformState>>({
    facebook: { status: "idle" },
    instagram: { status: "idle" },
    whatsapp: { status: "idle" },
  });

  async function loadPost() {
    try {
      const data = await postsApi.get(id);
      setPost(data.post);
      setAuditTrail(data.auditTrail);
      setCaption(data.post.caption || "");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadPost(); }, [id]);

  function showToast(message: string, type: string) {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  }

  async function handleSaveCaption() {
    try {
      await postsApi.update(id, { caption });
      showToast("Caption updated", "success");
      setEditing(false);
      loadPost();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  }

  async function handleApprove() {
    try {
      await postsApi.approve(id);
      showToast("Post approved", "success");
      loadPost();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  }

  async function handlePublishPlatform(platform: string) {
    setPlatformStates((prev) => ({
      ...prev,
      [platform]: { status: "loading" },
    }));

    try {
      const result = await postsApi.publishDirect(id, [platform]);
      const platformResult = result.results[platform];

      if (platformResult?.status === "success") {
        setPlatformStates((prev) => ({
          ...prev,
          [platform]: { status: "success", message: `Published to ${platform}` },
        }));
        showToast(`Published to ${platform}!`, "success");
      } else {
        setPlatformStates((prev) => ({
          ...prev,
          [platform]: { status: "error", message: platformResult?.errorMessage || "Failed" },
        }));
        showToast(`Failed to publish to ${platform}`, "error");
      }

      loadPost();
    } catch (err: any) {
      setPlatformStates((prev) => ({
        ...prev,
        [platform]: { status: "error", message: err.message },
      }));
      showToast(err.message, "error");
    }
  }

  async function handlePublishAll() {
    const platforms = ["facebook", "instagram", "whatsapp"];
    for (const p of platforms) {
      setPlatformStates((prev) => ({ ...prev, [p]: { status: "loading" } }));
    }

    try {
      const result = await postsApi.publishDirect(id, platforms);

      for (const p of platforms) {
        const r = result.results[p];
        setPlatformStates((prev) => ({
          ...prev,
          [p]: r?.status === "success"
            ? { status: "success", message: `Published to ${p}` }
            : { status: "error", message: r?.errorMessage || "Failed" },
        }));
      }

      showToast(result.message, result.status === "published" ? "success" : "warning");
      loadPost();
    } catch (err: any) {
      for (const p of platforms) {
        setPlatformStates((prev) => ({
          ...prev,
          [p]: { status: "error", message: err.message },
        }));
      }
      showToast(err.message, "error");
    }
  }

  async function handleRetry() {
    try {
      await postsApi.retry(id);
      showToast("Retry initiated", "success");
      loadPost();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  }

  if (loading) {
    return <div className="loading-overlay"><div className="loading-spinner" /><p>Loading post...</p></div>;
  }

  if (!post) {
    return <div className="empty-state"><div className="empty-state-icon">❌</div><p>Post not found</p></div>;
  }

  const analysis = post.ai_analysis;
  const isPublishable = ["approved", "pending_review", "partially_published"].includes(post.status);
  const anyPublishing = Object.values(platformStates).some((s) => s.status === "loading");

  return (
    <div>
      <div className="page-header">
        <div>
          <Link href="/posts" style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>← Back to Queue</Link>
          <h1 className="page-title" style={{ marginTop: "var(--space-sm)" }}>
            {post.symbol}
            <span className={`badge badge-${post.status}`} style={{ marginLeft: "var(--space-md)", fontSize: "0.7rem", verticalAlign: "middle" }}>
              {post.status.replace(/_/g, " ")}
            </span>
          </h1>
        </div>
        <div style={{ display: "flex", gap: "var(--space-sm)" }}>
          {post.status === "pending_review" && (
            <button className="btn btn-success" onClick={handleApprove} id="btn-approve">✓ Approve</button>
          )}
          {isPublishable && (
            <button className="btn btn-primary" onClick={handlePublishAll} disabled={anyPublishing} id="btn-publish-all">
              {anyPublishing ? "Publishing..." : "🚀 Publish All"}
            </button>
          )}
          {post.status === "failed" && (
            <button className="btn btn-secondary" onClick={handleRetry} id="btn-retry">🔄 Retry</button>
          )}
          {post.status === "draft" && (
            <Link href={`/posts/${id}/draft`} className="btn btn-primary" id="btn-process-draft">
              📸 Process Draft
            </Link>
          )}
        </div>
      </div>

      <div className="detail-grid">
        {/* Screenshot */}
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: "var(--space-md)" }}>Screenshot</h3>
          {post.screenshot_url ? (
            <img src={post.screenshot_url} alt={`${post.symbol} chart`} className="screenshot-preview" />
          ) : (
            <div className="empty-state" style={{ padding: "var(--space-xl)" }}>
              <div className="empty-state-icon">📸</div>
              <p>Screenshot pending...</p>
            </div>
          )}
        </div>

        {/* AI Analysis */}
        {analysis && (
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: "var(--space-md)" }}>AI Analysis</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-md)" }}>
              <div className="analysis-block">
                <div className="analysis-label">Market Trend</div>
                <div className={`analysis-value ${analysis.market_trend}`}>
                  {analysis.market_trend?.toUpperCase()}
                </div>
              </div>
              <div className="analysis-block">
                <div className="analysis-label">Confidence</div>
                <div className="analysis-value">{analysis.confidence?.toUpperCase() || "—"}</div>
              </div>
              <div className="analysis-block">
                <div className="analysis-label">Support</div>
                <div className="analysis-value" style={{ color: "var(--success)" }}>
                  {analysis.support_levels?.join(", ") || "—"}
                </div>
              </div>
              <div className="analysis-block">
                <div className="analysis-label">Resistance</div>
                <div className="analysis-value" style={{ color: "var(--error)" }}>
                  {analysis.resistance_levels?.join(", ") || "—"}
                </div>
              </div>
            </div>
            <div className="analysis-block" style={{ marginTop: "var(--space-md)" }}>
              <div className="analysis-label">Explanation</div>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>{analysis.explanation}</p>
            </div>
          </div>
        )}
      </div>

      {/* Caption Editor */}
      <div className="card" style={{ marginTop: "var(--space-lg)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-md)" }}>
          <h3 className="card-title">Caption</h3>
          {!editing ? (
            <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)} id="btn-edit-caption">✏️ Edit</button>
          ) : (
            <div style={{ display: "flex", gap: "var(--space-sm)" }}>
              <button className="btn btn-success btn-sm" onClick={handleSaveCaption}>💾 Save</button>
              <button className="btn btn-secondary btn-sm" onClick={() => { setEditing(false); setCaption(post.caption || ""); }}>Cancel</button>
            </div>
          )}
        </div>
        {editing ? (
          <textarea
            className="form-textarea"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={8}
            id="caption-editor"
          />
        ) : (
          <pre style={{ whiteSpace: "pre-wrap", fontFamily: "var(--font-sans)", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            {post.caption || "No caption generated yet."}
          </pre>
        )}
        {post.hashtags && post.hashtags.length > 0 && (
          <div style={{ marginTop: "var(--space-md)", display: "flex", flexWrap: "wrap", gap: "var(--space-xs)" }}>
            {post.hashtags.map((tag: string, i: number) => (
              <span key={i} className="filter-chip" style={{ fontSize: "0.75rem" }}>{tag.startsWith("#") ? tag : `#${tag}`}</span>
            ))}
          </div>
        )}
      </div>

      {/* Publishing Status */}
      {post.published_platforms && Object.keys(post.published_platforms).length > 0 && (
        <div className="card" style={{ marginTop: "var(--space-lg)" }}>
          <h3 className="card-title" style={{ marginBottom: "var(--space-md)" }}>Publishing Status</h3>
          <div style={{ display: "flex", gap: "var(--space-lg)", flexWrap: "wrap" }}>
            {Object.entries(post.published_platforms).map(([platform, data]: [string, any]) => (
              <div key={platform} className="analysis-block" style={{ minWidth: 200 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", marginBottom: "var(--space-sm)" }}>
                  <span className={`platform-icon platform-${platform}`}>
                    {platform === "facebook" ? "f" : platform === "instagram" ? "📷" : "💬"}
                  </span>
                  <span style={{ fontWeight: 600, textTransform: "capitalize" }}>{platform}</span>
                </div>
                <span className={`badge ${data.status === "success" ? "badge-published" : "badge-failed"}`}>
                  {data.status}
                </span>
                {data.postUrl && (
                  <a href={data.postUrl} target="_blank" rel="noopener" style={{ display: "block", fontSize: "0.8rem", marginTop: "var(--space-sm)" }}>
                    View Post →
                  </a>
                )}
                {data.shareLink && (
                  <a href={data.shareLink} target="_blank" rel="noopener" style={{ display: "block", fontSize: "0.8rem", marginTop: "var(--space-sm)" }}>
                    Open WhatsApp Share →
                  </a>
                )}
                {data.errorMessage && (
                  <p style={{ color: "var(--error)", fontSize: "0.8rem", marginTop: "var(--space-sm)" }}>{data.errorMessage}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Platform Publish Buttons */}
      {isPublishable && (
        <div className="card" style={{ marginTop: "var(--space-lg)" }}>
          <h3 className="card-title" style={{ marginBottom: "var(--space-md)" }}>Publish to Platform</h3>
          <div style={{ display: "flex", gap: "var(--space-md)", flexWrap: "wrap" }}>
            {/* Facebook */}
            <button
              className={`btn ${platformStates.facebook.status === "success" ? "btn-success" : platformStates.facebook.status === "error" ? "btn-danger" : "btn-secondary"}`}
              onClick={() => handlePublishPlatform("facebook")}
              disabled={platformStates.facebook.status === "loading"}
              id="btn-publish-fb"
            >
              {platformStates.facebook.status === "loading" ? (
                <><div className="loading-spinner" style={{ width: 16, height: 16 }} /> Publishing...</>
              ) : platformStates.facebook.status === "success" ? (
                "✅ Facebook Published"
              ) : platformStates.facebook.status === "error" ? (
                "❌ Facebook — Retry"
              ) : (
                <><span className="platform-icon platform-facebook">f</span> Facebook</>
              )}
            </button>

            {/* Instagram */}
            <button
              className={`btn ${platformStates.instagram.status === "success" ? "btn-success" : platformStates.instagram.status === "error" ? "btn-danger" : "btn-secondary"}`}
              onClick={() => handlePublishPlatform("instagram")}
              disabled={platformStates.instagram.status === "loading"}
              id="btn-publish-ig"
            >
              {platformStates.instagram.status === "loading" ? (
                <><div className="loading-spinner" style={{ width: 16, height: 16 }} /> Publishing...</>
              ) : platformStates.instagram.status === "success" ? (
                "✅ Instagram Published"
              ) : platformStates.instagram.status === "error" ? (
                "❌ Instagram — Retry"
              ) : (
                <><span className="platform-icon platform-instagram">📷</span> Instagram</>
              )}
            </button>

            {/* WhatsApp */}
            <button
              className={`btn ${platformStates.whatsapp.status === "success" ? "btn-success" : platformStates.whatsapp.status === "error" ? "btn-danger" : "btn-secondary"}`}
              onClick={() => handlePublishPlatform("whatsapp")}
              disabled={platformStates.whatsapp.status === "loading"}
              id="btn-publish-wa"
            >
              {platformStates.whatsapp.status === "loading" ? (
                <><div className="loading-spinner" style={{ width: 16, height: 16 }} /> Publishing...</>
              ) : platformStates.whatsapp.status === "success" ? (
                "✅ WhatsApp Posted"
              ) : platformStates.whatsapp.status === "error" ? (
                "❌ WhatsApp — Retry"
              ) : (
                <><span className="platform-icon platform-whatsapp">💬</span> WhatsApp</>
              )}
            </button>
          </div>

          {/* Error messages */}
          {Object.entries(platformStates).some(([, s]) => s.status === "error") && (
            <div style={{ marginTop: "var(--space-md)", fontSize: "0.85rem" }}>
              {Object.entries(platformStates)
                .filter(([, s]) => s.status === "error")
                .map(([platform, s]) => (
                  <p key={platform} style={{ color: "var(--error)", marginBottom: "var(--space-xs)" }}>
                    {platform}: {s.message}
                  </p>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Audit Trail */}
      {auditTrail.length > 0 && (
        <div className="card" style={{ marginTop: "var(--space-lg)" }}>
          <h3 className="card-title" style={{ marginBottom: "var(--space-lg)" }}>Audit Trail</h3>
          <div className="timeline">
            {auditTrail.map((log) => (
              <div key={log.id} className="timeline-item">
                <div className={`timeline-dot ${log.status}`} />
                <div className="timeline-content">
                  <div className="timeline-action">
                    {log.action.replace(/_/g, " ")}
                    <span className={`badge badge-${log.status === "success" ? "published" : log.status === "failure" ? "failed" : "pending_review"}`} style={{ marginLeft: "var(--space-sm)" }}>
                      {log.status}
                    </span>
                  </div>
                  <div className="timeline-time">{new Date(log.created_at).toLocaleString()}</div>
                  {log.error_message && (
                    <p style={{ color: "var(--error)", fontSize: "0.8rem", marginTop: "var(--space-xs)" }}>{log.error_message}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          <span>{toast.type === "success" ? "✅" : toast.type === "warning" ? "⚠️" : "❌"}</span>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
