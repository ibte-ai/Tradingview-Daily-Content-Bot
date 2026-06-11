"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { postsApi } from "../../lib/api";
import Link from "next/link";

type PlatformStatus = "idle" | "loading" | "success" | "error";

interface PlatformState {
  status: PlatformStatus;
  message?: string;
}

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [post, setPost] = useState<any>(null);
  const [auditTrail, setAuditTrail] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [caption, setCaption] = useState("");
  const [hashtagsText, setHashtagsText] = useState("");
  const [riskNote, setRiskNote] = useState("");
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);

  // Confirmation Modal State
  const [confirmPublishTarget, setConfirmPublishTarget] = useState<string | null>(null);

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
      setHashtagsText(data.post.hashtags?.join(", ") || "");
      setRiskNote(data.post.risk_note || "");
    } catch (err: any) {
      showToast(err.message || "Failed to load post details", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPost();
  }, [id]);

  function showToast(message: string, type: string) {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  }

  async function handleSaveDetails() {
    try {
      const parsedTags = hashtagsText
        .split(",")
        .map((t) => t.trim().replace(/^#/, ""))
        .filter((t) => t.length > 0);

      await postsApi.update(id, {
        caption,
        hashtags: parsedTags,
        risk_note: riskNote,
      });

      showToast("Post details updated successfully", "success");
      setEditing(false);
      loadPost();
    } catch (err: any) {
      showToast(err.message || "Failed to update details", "error");
    }
  }

  async function handleApprove() {
    try {
      await postsApi.approve(id);
      showToast("Post approved successfully!", "success");
      loadPost();
    } catch (err: any) {
      showToast(err.message || "Approve failed", "error");
    }
  }

  // Triggered when user confirms in modal
  async function executePublish(platform: string) {
    setConfirmPublishTarget(null);

    const platformsToPublish = platform === "all" ? ["facebook", "instagram", "whatsapp"] : [platform];
    
    platformsToPublish.forEach((p) => {
      setPlatformStates((prev) => ({ ...prev, [p]: { status: "loading" } }));
    });

    try {
      const result = await postsApi.publishDirect(id, platformsToPublish);

      platformsToPublish.forEach((p) => {
        const platformResult = result.results[p];
        if (platformResult?.status === "success") {
          setPlatformStates((prev) => ({
            ...prev,
            [p]: { status: "success", message: `Published to ${p}` },
          }));
          showToast(`Published to ${p} successfully!`, "success");
        } else {
          setPlatformStates((prev) => ({
            ...prev,
            [p]: { status: "error", message: platformResult?.errorMessage || "Failed" },
          }));
          showToast(`Failed to publish to ${p}`, "error");
        }
      });

      loadPost();
    } catch (err: any) {
      platformsToPublish.forEach((p) => {
        setPlatformStates((prev) => ({
          ...prev,
          [p]: { status: "error", message: err.message },
        }));
      });
      showToast(err.message || "Publishing failed", "error");
    }
  }

  async function handleRetry() {
    try {
      await postsApi.retry(id);
      showToast("Pipeline retry initiated", "success");
      loadPost();
    } catch (err: any) {
      showToast(err.message || "Retry failed", "error");
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this post?")) return;
    try {
      await postsApi.delete(id);
      showToast("Post deleted successfully", "success");
      router.push("/posts");
    } catch (err: any) {
      showToast(err.message || "Delete failed", "error");
    }
  }

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="loading-spinner" />
        <p>Loading post details...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="empty-state card">
        <div className="empty-state-icon">❌</div>
        <h3>Post not found</h3>
        <p>This post does not exist or has been deleted.</p>
        <Link href="/posts" className="btn btn-primary" style={{ marginTop: "var(--space-md)" }}>
          Back to Posts Queue
        </Link>
      </div>
    );
  }

  const analysis = post.ai_analysis;
  const isPublishable = ["approved", "pending_review", "partially_published"].includes(post.status);
  const anyPublishing = Object.values(platformStates).some((s) => s.status === "loading");

  return (
    <div>
      {/* Header section */}
      <div className="page-header">
        <div>
          <Link href="/posts" style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: "4px" }}>
            ← Back to Queue
          </Link>
          <h1 className="page-title" style={{ marginTop: "var(--space-xs)", display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
            {post.symbol}
            <span className={`badge badge-${post.status}`}>
              {post.status.replace(/_/g, " ")}
            </span>
          </h1>
        </div>
        <div style={{ display: "flex", gap: "var(--space-sm)" }}>
          {post.status === "pending_review" && (
            <button className="btn btn-success" onClick={handleApprove} id="btn-approve">✓ Approve</button>
          )}
          {post.status === "failed" && (
            <button className="btn btn-secondary" onClick={handleRetry} id="btn-retry">🔄 Retry</button>
          )}
          {post.status === "draft" && (
            <Link href={`/posts/${id}/draft`} className="btn btn-primary" id="btn-process-draft">
              📸 Process Draft
            </Link>
          )}
          <button className="btn btn-danger btn-sm" onClick={handleDelete} title="Delete post">
            🗑️ Delete
          </button>
        </div>
      </div>

      {/* Dual Column Layout */}
      <div className="draft-layout">
        
        {/* Left Column: Media and Analysis */}
        <div className="draft-col-left">
          
          {/* Screenshot Card */}
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: "var(--space-md)", color: "var(--text-primary)" }}>Chart Screenshot</h3>
            {post.screenshot_url ? (
              <img src={post.screenshot_url} alt={`${post.symbol} chart`} className="screenshot-preview" style={{ width: "100%", maxHeight: 400, objectFit: "contain" }} />
            ) : (
              <div className="empty-state" style={{ padding: "var(--space-xl)", border: "1px dashed var(--borders)" }}>
                <div className="empty-state-icon">📸</div>
                <p>Screenshot pending capture...</p>
              </div>
            )}
          </div>

          {/* AI Analysis Cards */}
          {analysis ? (
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: "var(--space-lg)", color: "var(--text-primary)" }}>AI Analysis</h3>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-md)", marginBottom: "var(--space-lg)" }}>
                <div className="analysis-block">
                  <div className="analysis-label">Trend</div>
                  <div className={`analysis-value ${analysis.market_trend}`}>
                    {analysis.market_trend === "bullish" ? "📈 Bullish" : analysis.market_trend === "bearish" ? "📉 Bearish" : "➡️ Neutral"}
                  </div>
                </div>
                
                <div className="analysis-block">
                  <div className="analysis-label">Confidence</div>
                  <div className="analysis-value" style={{ fontWeight: 600 }}>
                    {analysis.confidence?.toUpperCase() || "—"}
                  </div>
                </div>

                <div className="analysis-block">
                  <div className="analysis-label">Support Levels</div>
                  <div className="analysis-value" style={{ color: "var(--success)", fontWeight: 600 }}>
                    {analysis.support_levels?.join(", ") || "—"}
                  </div>
                </div>

                <div className="analysis-block">
                  <div className="analysis-label">Resistance Levels</div>
                  <div className="analysis-value" style={{ color: "var(--error)", fontWeight: 600 }}>
                    {analysis.resistance_levels?.join(", ") || "—"}
                  </div>
                </div>
              </div>

              <div className="analysis-block">
                <div className="analysis-label">Analysis Summary</div>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.6 }}>
                  {analysis.explanation || "No summary explanation available."}
                </p>
              </div>
            </div>
          ) : (
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: "var(--space-md)", color: "var(--text-primary)" }}>AI Analysis</h3>
              <div className="empty-state" style={{ padding: "var(--space-md)" }}>
                <p>No analysis generated yet. Capture the screenshot to trigger analysis.</p>
              </div>
            </div>
          )}

          {/* Risk Notes Disclaimer */}
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: "var(--space-sm)", color: "var(--text-primary)" }}>Risk Notes</h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontStyle: "italic", borderLeft: "3px solid var(--warning)", paddingLeft: "var(--space-sm)" }}>
              {post.risk_note || "⚠️ This is not financial advice. Trading involves risk. Always do your own research."}
            </p>
          </div>

        </div>

        {/* Right Column: Editor and Publishing controls */}
        <div className="draft-col-right">
          
          {/* Caption & Hashtag Editor Card */}
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-md)" }}>
              <h3 className="card-title" style={{ color: "var(--text-primary)" }}>Content Editor</h3>
              {!editing ? (
                <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>✏️ Edit</button>
              ) : (
                <div style={{ display: "flex", gap: "var(--space-sm)" }}>
                  <button className="btn btn-success btn-sm" onClick={handleSaveDetails}>💾 Save</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => { setEditing(false); setCaption(post.caption || ""); setHashtagsText(post.hashtags?.join(", ") || ""); }}>Cancel</button>
                </div>
              )}
            </div>

            {editing ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="caption-textarea">Caption</label>
                  <textarea
                    id="caption-textarea"
                    className="form-textarea"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    rows={7}
                  />
                </div>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="hashtags-input">Hashtags (comma separated)</label>
                  <input
                    id="hashtags-input"
                    type="text"
                    className="form-input"
                    value={hashtagsText}
                    onChange={(e) => setHashtagsText(e.target.value)}
                    placeholder="trading, crypto, analysis"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="risk-input">Custom Risk Note</label>
                  <input
                    id="risk-input"
                    type="text"
                    className="form-input"
                    value={riskNote}
                    onChange={(e) => setRiskNote(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: "var(--space-md)" }}>
                  <h4 style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px" }}>Caption</h4>
                  <pre style={{ whiteSpace: "pre-wrap", fontFamily: "var(--font-sans)", color: "var(--text-secondary)", fontSize: "0.9rem", padding: "var(--space-sm)", backgroundColor: "rgba(255,255,255,0.02)", borderRadius: "var(--radius-sm)", border: "1px solid var(--borders)" }}>
                    {post.caption || "No caption generated yet."}
                  </pre>
                </div>

                {post.hashtags && post.hashtags.length > 0 && (
                  <div>
                    <h4 style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px" }}>Hashtags</h4>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-xs)" }}>
                      {post.hashtags.map((tag: string, i: number) => (
                        <span key={i} className="filter-chip" style={{ fontSize: "0.75rem", padding: "4px 10px" }}>
                          {tag.startsWith("#") ? tag : `#${tag}`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Publishing Controls Card */}
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: "var(--space-md)", color: "var(--text-primary)" }}>Publishing Controls</h3>
            
            {isPublishable ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
                
                {/* Facebook */}
                <button
                  className={`btn btn-facebook`}
                  onClick={() => setConfirmPublishTarget("facebook")}
                  disabled={anyPublishing}
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  {platformStates.facebook.status === "loading" ? "Publishing to Facebook..." : "Publish to Facebook"}
                </button>

                {/* Instagram */}
                <button
                  className={`btn btn-instagram`}
                  onClick={() => setConfirmPublishTarget("instagram")}
                  disabled={anyPublishing}
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  {platformStates.instagram.status === "loading" ? "Publishing to Instagram..." : "Publish to Instagram"}
                </button>

                {/* WhatsApp */}
                <button
                  className={`btn btn-whatsapp`}
                  onClick={() => setConfirmPublishTarget("whatsapp")}
                  disabled={anyPublishing}
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  {platformStates.whatsapp.status === "loading" ? "Publishing to WhatsApp..." : "Publish to WhatsApp Channel"}
                </button>

                {/* Publish Everywhere */}
                <button
                  className="btn btn-publish-all"
                  onClick={() => setConfirmPublishTarget("all")}
                  disabled={anyPublishing}
                  style={{ width: "100%", justifyContent: "center", marginTop: "var(--space-sm)" }}
                >
                  {anyPublishing ? "Publishing everywhere..." : "🚀 Publish Everywhere"}
                </button>

              </div>
            ) : (
              <div className="empty-state" style={{ padding: "var(--space-sm)" }}>
                <p style={{ fontSize: "0.85rem" }}>Publishing actions are disabled. Post must be approved or in review.</p>
              </div>
            )}
          </div>

          {/* Publishing Results Status */}
          {post.published_platforms && Object.keys(post.published_platforms).length > 0 && (
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: "var(--space-md)", color: "var(--text-primary)" }}>Platform Publishing Status</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
                {Object.entries(post.published_platforms).map(([platform, data]: [string, any]) => (
                  <div key={platform} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-sm)", backgroundColor: "rgba(255,255,255,0.02)", borderRadius: "var(--radius-sm)", border: "1px solid var(--borders)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
                      <span className={`platform-icon platform-${platform}`}>
                        {platform === "facebook" ? "f" : platform === "instagram" ? "📷" : "💬"}
                      </span>
                      <span style={{ fontWeight: 600, textTransform: "capitalize", fontSize: "0.85rem" }}>{platform}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
                      <span className={`badge ${data.status === "success" ? "badge-published" : "badge-failed"}`}>
                        {data.status}
                      </span>
                      {data.postUrl && (
                        <a href={data.postUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.8rem", color: "var(--accent-primary)" }}>
                          View
                        </a>
                      )}
                      {data.shareLink && (
                        <a href={data.shareLink} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.8rem", color: "var(--success)" }}>
                          Share Link
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Audit Trail Timeline */}
      {auditTrail.length > 0 && (
        <div className="card" style={{ marginTop: "var(--space-xl)" }}>
          <h3 className="card-title" style={{ marginBottom: "var(--space-lg)", color: "var(--text-primary)" }}>Audit Trail Logs</h3>
          <div className="timeline">
            {auditTrail.map((log) => (
              <div key={log.id} className="timeline-item">
                <div className={`timeline-dot ${log.status}`} />
                <div className="timeline-content">
                  <div className="timeline-action" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ textTransform: "capitalize", fontWeight: 600 }}>{log.action.replace(/_/g, " ")}</span>
                    <span className={`badge ${log.status === "success" ? "badge-published" : log.status === "failure" ? "badge-failed" : "badge-pending_review"}`}>
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

      {/* Confirmation Modal */}
      {confirmPublishTarget && (
        <div className="modal-overlay">
          <div className="modal-container">
            <h2 className="modal-title">Confirm Publishing</h2>
            <p className="modal-body">
              Are you sure you want to publish this post to{" "}
              <strong>
                {confirmPublishTarget === "all" ? "all connected platforms (Facebook, Instagram, WhatsApp)" : confirmPublishTarget}
              </strong>
              ?
            </p>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setConfirmPublishTarget(null)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={() => executePublish(confirmPublishTarget)}>
                Confirm Publish
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast ${toast.type}`}>
          <span>{toast.type === "success" ? "✅" : toast.type === "warning" ? "⚠️" : "❌"}</span>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
