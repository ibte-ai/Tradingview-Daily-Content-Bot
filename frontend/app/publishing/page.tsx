"use client";

import { useEffect, useState } from "react";
import { postsApi } from "../lib/api";
import Link from "next/link";

type PlatformStatus = "idle" | "loading" | "success" | "error";

interface PlatformState {
  status: PlatformStatus;
  message?: string;
}

export default function PublishingPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [selectedPostId, setSelectedPostId] = useState<string>("");
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);

  // Confirmation Modal State
  const [confirmPublishTarget, setConfirmPublishTarget] = useState<string | null>(null);

  const [platformStates, setPlatformStates] = useState<Record<string, PlatformState>>({
    facebook: { status: "idle" },
    instagram: { status: "idle" },
    whatsapp: { status: "idle" },
  });

  async function loadPosts() {
    try {
      const data = await postsApi.list({ limit: "100" });
      
      // Filter for approved or pending review posts to show first, but allow all
      const sortedPosts = [...data.posts].sort((a, b) => {
        const aVal = ["approved", "pending_review", "partially_published"].includes(a.status) ? 1 : 0;
        const bVal = ["approved", "pending_review", "partially_published"].includes(b.status) ? 1 : 0;
        return bVal - aVal;
      });

      setPosts(sortedPosts);
      
      if (sortedPosts.length > 0 && !selectedPostId) {
        setSelectedPostId(sortedPosts[0].id);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to load posts", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPosts();
  }, []);

  useEffect(() => {
    if (!selectedPostId) {
      setSelectedPost(null);
      return;
    }

    async function loadPostDetails() {
      try {
        const data = await postsApi.get(selectedPostId);
        setSelectedPost(data.post);
        
        // Reset platform statuses
        setPlatformStates({
          facebook: { status: "idle" },
          instagram: { status: "idle" },
          whatsapp: { status: "idle" },
        });
      } catch (err: any) {
        showToast(err.message || "Failed to load post details", "error");
      }
    }

    loadPostDetails();
  }, [selectedPostId]);

  function showToast(message: string, type: string) {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  }

  async function executePublish(platform: string) {
    setConfirmPublishTarget(null);

    const platformsToPublish = platform === "all" ? ["facebook", "instagram", "whatsapp"] : [platform];
    
    platformsToPublish.forEach((p) => {
      setPlatformStates((prev) => ({ ...prev, [p]: { status: "loading" } }));
    });

    try {
      const result = await postsApi.publishDirect(selectedPostId, platformsToPublish);

      platformsToPublish.forEach((p) => {
        const platformResult = result.results[p];
        if (platformResult?.status === "success") {
          setPlatformStates((prev) => ({
            ...prev,
            [p]: { status: "success", message: `Published successfully` },
          }));
          showToast(`Published to ${p}!`, "success");
        } else {
          setPlatformStates((prev) => ({
            ...prev,
            [p]: { status: "error", message: platformResult?.errorMessage || "Failed" },
          }));
          showToast(`Failed to publish to ${p}`, "error");
        }
      });

      // Reload post
      const data = await postsApi.get(selectedPostId);
      setSelectedPost(data.post);
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

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="loading-spinner" />
        <p>Loading publishing controls...</p>
      </div>
    );
  }

  const isPublishable = selectedPost && ["approved", "pending_review", "partially_published"].includes(selectedPost.status);
  const anyPublishing = Object.values(platformStates).some((s) => s.status === "loading");

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Publishing Controls</h1>
          <p className="page-description">Deploy approved trading insights to social media channels</p>
        </div>
      </div>

      {posts.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
          
          {/* Post Selection */}
          <div className="card">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="publishing-post-select">Select Post to Publish</label>
              <select
                id="publishing-post-select"
                className="form-select"
                value={selectedPostId}
                onChange={(e) => setSelectedPostId(e.target.value)}
                style={{ maxWidth: 450 }}
              >
                {posts.map((post) => (
                  <option key={post.id} value={post.id}>
                    {post.symbol} — {new Date(post.created_at).toLocaleDateString()} (Status: {post.status})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedPost && (
            <div className="draft-layout">
              
              {/* Left Column: Preview */}
              <div className="draft-col-left">
                
                {/* Screenshot Preview */}
                <div className="card">
                  <h3 className="card-title" style={{ marginBottom: "var(--space-md)", color: "var(--text-primary)" }}>Visual Preview</h3>
                  {selectedPost.screenshot_url ? (
                    <img 
                      src={selectedPost.screenshot_url} 
                      alt={selectedPost.symbol} 
                      className="screenshot-preview" 
                      style={{ width: "100%", maxHeight: 350, objectFit: "contain" }}
                    />
                  ) : (
                    <div className="empty-state" style={{ padding: "var(--space-xl)", border: "1px dashed var(--borders)" }}>
                      <div className="empty-state-icon">📸</div>
                      <p>Screenshot pending...</p>
                    </div>
                  )}
                </div>

                {/* Caption Card */}
                <div className="card">
                  <h3 className="card-title" style={{ marginBottom: "var(--space-md)", color: "var(--text-primary)" }}>Caption & Content</h3>
                  <pre style={{ whiteSpace: "pre-wrap", fontFamily: "var(--font-sans)", color: "var(--text-secondary)", fontSize: "0.9rem", padding: "var(--space-sm)", backgroundColor: "rgba(255,255,255,0.02)", borderRadius: "var(--radius-sm)", border: "1px solid var(--borders)" }}>
                    {selectedPost.caption || "No caption generated."}
                  </pre>
                  {selectedPost.hashtags && selectedPost.hashtags.length > 0 && (
                    <div style={{ marginTop: "var(--space-md)", display: "flex", flexWrap: "wrap", gap: "var(--space-xs)" }}>
                      {selectedPost.hashtags.map((tag: string, i: number) => (
                        <span key={i} className="filter-chip" style={{ fontSize: "0.75rem" }}>
                          {tag.startsWith("#") ? tag : `#${tag}`}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Right Column: Platform Controls */}
              <div className="draft-col-right">
                
                <div className="card">
                  <h3 className="card-title" style={{ marginBottom: "var(--space-lg)", color: "var(--text-primary)" }}>Deployment Channels</h3>
                  
                  {isPublishable ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
                      
                      {/* Facebook Button (Blue) */}
                      <div>
                        <button
                          className="btn btn-facebook"
                          onClick={() => setConfirmPublishTarget("facebook")}
                          disabled={anyPublishing}
                          style={{ width: "100%", justifyContent: "center" }}
                        >
                          {platformStates.facebook.status === "loading" ? "Publishing to Facebook..." : "Publish to Facebook"}
                        </button>
                        {platformStates.facebook.status === "success" && (
                          <p style={{ color: "var(--success)", fontSize: "0.8rem", marginTop: "4px", textAlign: "center" }}>✓ Facebook Published Successfully</p>
                        )}
                        {platformStates.facebook.status === "error" && (
                          <p style={{ color: "var(--error)", fontSize: "0.8rem", marginTop: "4px", textAlign: "center" }}>✕ Facebook Error: {platformStates.facebook.message}</p>
                        )}
                      </div>

                      {/* Instagram Button (Gradient) */}
                      <div>
                        <button
                          className="btn btn-instagram"
                          onClick={() => setConfirmPublishTarget("instagram")}
                          disabled={anyPublishing}
                          style={{ width: "100%", justifyContent: "center" }}
                        >
                          {platformStates.instagram.status === "loading" ? "Publishing to Instagram..." : "Publish to Instagram"}
                        </button>
                        {platformStates.instagram.status === "success" && (
                          <p style={{ color: "var(--success)", fontSize: "0.8rem", marginTop: "4px", textAlign: "center" }}>✓ Instagram Published Successfully</p>
                        )}
                        {platformStates.instagram.status === "error" && (
                          <p style={{ color: "var(--error)", fontSize: "0.8rem", marginTop: "4px", textAlign: "center" }}>✕ Instagram Error: {platformStates.instagram.message}</p>
                        )}
                      </div>

                      {/* WhatsApp Button (Green) */}
                      <div>
                        <button
                          className="btn btn-whatsapp"
                          onClick={() => setConfirmPublishTarget("whatsapp")}
                          disabled={anyPublishing}
                          style={{ width: "100%", justifyContent: "center" }}
                        >
                          {platformStates.whatsapp.status === "loading" ? "Posting to WhatsApp..." : "Publish to WhatsApp Channel"}
                        </button>
                        {platformStates.whatsapp.status === "success" && (
                          <p style={{ color: "var(--success)", fontSize: "0.8rem", marginTop: "4px", textAlign: "center" }}>✓ WhatsApp Post/Share Link Ready</p>
                        )}
                        {platformStates.whatsapp.status === "error" && (
                          <p style={{ color: "var(--error)", fontSize: "0.8rem", marginTop: "4px", textAlign: "center" }}>✕ WhatsApp Error: {platformStates.whatsapp.message}</p>
                        )}
                      </div>

                      {/* Publish Everywhere Button (Primary Accent) */}
                      <div style={{ marginTop: "var(--space-md)" }}>
                        <button
                          className="btn btn-publish-all"
                          onClick={() => setConfirmPublishTarget("all")}
                          disabled={anyPublishing}
                          style={{ width: "100%", justifyContent: "center" }}
                        >
                          {anyPublishing ? "Processing bulk publication..." : "🚀 Publish Everywhere"}
                        </button>
                      </div>

                    </div>
                  ) : (
                    <div className="empty-state" style={{ padding: "var(--space-sm)" }}>
                      <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                        This post status is <strong>{selectedPost.status}</strong>. Publishing is only allowed for Approved or Pending Review posts.
                      </p>
                      {selectedPost.status === "pending_review" && (
                        <button 
                          className="btn btn-success" 
                          onClick={async () => {
                            await postsApi.approve(selectedPostId);
                            showToast("Post approved!", "success");
                            loadPosts();
                          }}
                          style={{ width: "100%", marginTop: "var(--space-md)" }}
                        >
                          ✓ Approve Post Now
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Published History Log on this post */}
                {selectedPost.published_platforms && Object.keys(selectedPost.published_platforms).length > 0 && (
                  <div className="card">
                    <h3 className="card-title" style={{ marginBottom: "var(--space-md)", color: "var(--text-primary)" }}>Active Publication Detections</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)" }}>
                      {Object.entries(selectedPost.published_platforms).map(([plat, data]: [string, any]) => (
                        <div key={plat} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", padding: "6px", backgroundColor: "rgba(255,255,255,0.01)", borderRadius: "4px", border: "1px solid var(--borders)" }}>
                          <span style={{ textTransform: "capitalize", fontWeight: 600 }}>{plat}</span>
                          <span className={`badge ${data.status === "success" ? "badge-published" : "badge-failed"}`}>{data.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>

            </div>
          )}

        </div>
      ) : (
        <div className="empty-state card">
          <div className="empty-state-icon">🚀</div>
          <h3>No posts available</h3>
          <p>Create a capture screenshot to trigger the automation pipeline.</p>
          <Link href="/capture" className="btn btn-primary" style={{ marginTop: "var(--space-md)" }}>
            📸 New Capture
          </Link>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmPublishTarget && (
        <div className="modal-overlay">
          <div className="modal-container">
            <h2 className="modal-title">Are you sure you want to publish?</h2>
            <p className="modal-body">
              This will publish the chart screenshot and captions for{" "}
              <strong>{selectedPost?.symbol}</strong> directly to{" "}
              <strong>
                {confirmPublishTarget === "all" ? "all connected channels" : confirmPublishTarget}
              </strong>
              . This action is live.
            </p>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setConfirmPublishTarget(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => executePublish(confirmPublishTarget)}>Confirm Publish</button>
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
