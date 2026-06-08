"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { postsApi } from "../../../lib/api";
import Link from "next/link";

type ProcessingStep = "idle" | "capturing" | "analyzing" | "ready" | "error";
type PlatformStatus = "idle" | "loading" | "success" | "error";

interface PlatformPublishState {
  status: PlatformStatus;
  message?: string;
  postUrl?: string;
  shareLink?: string;
}

export default function DraftPreviewPage() {
  const params = useParams();
  const id = params.id as string;

  const [post, setPost] = useState<any>(null);
  const [captions, setCaptions] = useState<{
    facebook: string;
    instagram: string;
    whatsapp: string;
  } | null>(null);
  const [step, setStep] = useState<ProcessingStep>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [editingCaption, setEditingCaption] = useState(false);
  const [captionText, setCaptionText] = useState("");
  const [activeTab, setActiveTab] = useState<"instagram" | "facebook" | "whatsapp">("instagram");
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);

  const [platformStates, setPlatformStates] = useState<Record<string, PlatformPublishState>>({
    instagram: { status: "idle" },
    facebook: { status: "idle" },
    whatsapp: { status: "idle" },
  });

  function showToast(message: string, type: string) {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  }

  const processDraft = useCallback(async () => {
    setStep("capturing");
    setErrorMessage("");

    try {
      const result = await postsApi.draftProcess(id);
      setPost(result.post);
      setCaptions(result.captions);
      setCaptionText(result.post.caption || "");
      setStep("ready");
    } catch (err: any) {
      setErrorMessage(err.message || "Draft processing failed");
      setStep("error");
    }
  }, [id]);

  // Check if post is already processed, otherwise start processing
  useEffect(() => {
    async function init() {
      try {
        const { post: existingPost } = await postsApi.get(id);

        if (existingPost && existingPost.status !== "draft" && existingPost.status !== "failed") {
          // Already processed — show the data
          setPost(existingPost);
          setCaptionText(existingPost.caption || "");

          // Generate captions from existing data
          if (existingPost.ai_analysis) {
            setCaptions({
              facebook: existingPost.caption || "",
              instagram: existingPost.caption || "",
              whatsapp: existingPost.caption || "",
            });
          }
          setStep("ready");
        } else {
          // Needs processing
          processDraft();
        }
      } catch {
        // Post doesn't exist or error — try processing anyway
        processDraft();
      }
    }

    init();
  }, [id, processDraft]);

  async function handleSaveCaption() {
    try {
      await postsApi.update(id, { caption: captionText });
      showToast("Caption updated", "success");
      setEditingCaption(false);

      // Refresh post data
      const { post: updated } = await postsApi.get(id);
      setPost(updated);
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
          [platform]: {
            status: "success",
            message: `Published to ${platform}`,
            postUrl: platformResult.postUrl,
            shareLink: platformResult.shareLink,
          },
        }));
        showToast(`Published to ${platform} successfully!`, "success");
      } else {
        setPlatformStates((prev) => ({
          ...prev,
          [platform]: {
            status: "error",
            message: platformResult?.errorMessage || "Publishing failed",
          },
        }));
        showToast(`Failed to publish to ${platform}`, "error");
      }

      // Refresh post
      const { post: updated } = await postsApi.get(id);
      setPost(updated);
    } catch (err: any) {
      setPlatformStates((prev) => ({
        ...prev,
        [platform]: {
          status: "error",
          message: err.message || "Publishing failed",
        },
      }));
      showToast(err.message || "Publishing failed", "error");
    }
  }

  async function handlePublishAll() {
    const platforms = ["instagram", "facebook", "whatsapp"];
    for (const p of platforms) {
      setPlatformStates((prev) => ({ ...prev, [p]: { status: "loading" } }));
    }

    try {
      const result = await postsApi.publishDirect(id, platforms);

      const newStates: Record<string, PlatformPublishState> = {};
      for (const p of platforms) {
        const r = result.results[p];
        if (r?.status === "success") {
          newStates[p] = {
            status: "success",
            message: `Published to ${p}`,
            postUrl: r.postUrl,
            shareLink: r.shareLink,
          };
        } else {
          newStates[p] = {
            status: "error",
            message: r?.errorMessage || "Failed",
          };
        }
      }
      setPlatformStates(newStates);
      showToast(result.message, result.status === "published" ? "success" : "warning");

      // Refresh post
      const { post: updated } = await postsApi.get(id);
      setPost(updated);
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

  // ─── Processing View ───
  if (step === "idle" || step === "capturing" || step === "analyzing") {
    return (
      <div>
        <div className="page-header">
          <div>
            <Link href="/posts" style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              ← Back to Queue
            </Link>
            <h1 className="page-title" style={{ marginTop: "var(--space-sm)" }}>
              Processing Draft
            </h1>
          </div>
        </div>

        <div className="draft-progress-container">
          <div className="draft-progress-card">
            <div className="draft-progress-steps">
              <div className={`draft-step ${step === "capturing" ? "active" : ""}`}>
                <div className="draft-step-icon">
                  {step === "capturing" ? (
                    <div className="loading-spinner" style={{ width: 24, height: 24 }} />
                  ) : (
                    "📸"
                  )}
                </div>
                <div className="draft-step-label">Capturing Screenshot</div>
                <div className="draft-step-desc">
                  Opening TradingView and taking a chart screenshot...
                </div>
              </div>

              <div className="draft-step-connector" />

              <div className={`draft-step ${step === "analyzing" ? "active" : ""}`}>
                <div className="draft-step-icon">🤖</div>
                <div className="draft-step-label">AI Analysis</div>
                <div className="draft-step-desc">
                  Analyzing chart patterns, trends, and key levels...
                </div>
              </div>

              <div className="draft-step-connector" />

              <div className="draft-step">
                <div className="draft-step-icon">✍️</div>
                <div className="draft-step-label">Ready for Review</div>
                <div className="draft-step-desc">
                  Edit caption and publish to platforms
                </div>
              </div>
            </div>

            <div style={{ textAlign: "center", marginTop: "var(--space-xl)", color: "var(--text-muted)", fontSize: "0.85rem" }}>
              This may take 15-30 seconds depending on chart complexity...
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Error View ───
  if (step === "error") {
    return (
      <div>
        <div className="page-header">
          <div>
            <Link href="/posts" style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              ← Back to Queue
            </Link>
            <h1 className="page-title" style={{ marginTop: "var(--space-sm)" }}>
              Processing Failed
            </h1>
          </div>
        </div>

        <div className="card" style={{ maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "var(--space-md)" }}>❌</div>
          <h3 style={{ marginBottom: "var(--space-md)" }}>Draft Processing Failed</h3>
          <p style={{ color: "var(--text-secondary)", marginBottom: "var(--space-lg)", fontSize: "0.9rem" }}>
            {errorMessage}
          </p>
          <div style={{ display: "flex", gap: "var(--space-md)", justifyContent: "center" }}>
            <button className="btn btn-primary" onClick={processDraft} id="btn-retry-draft">
              🔄 Retry
            </button>
            <Link href="/capture" className="btn btn-secondary">
              ← Back to Capture
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── Ready View — Draft Preview ───
  const analysis = post?.ai_analysis;

  return (
    <div>
      <div className="page-header">
        <div>
          <Link href="/posts" style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            ← Back to Queue
          </Link>
          <h1 className="page-title" style={{ marginTop: "var(--space-sm)" }}>
            {post?.symbol}
            <span
              className={`badge badge-${post?.status}`}
              style={{ marginLeft: "var(--space-md)", fontSize: "0.7rem", verticalAlign: "middle" }}
            >
              {post?.status?.replace(/_/g, " ")}
            </span>
          </h1>
          <p className="page-description">Review your draft and publish to platforms</p>
        </div>
        <div style={{ display: "flex", gap: "var(--space-sm)" }}>
          <button
            className="btn btn-primary"
            onClick={handlePublishAll}
            disabled={Object.values(platformStates).some((s) => s.status === "loading")}
            id="btn-publish-all"
          >
            {Object.values(platformStates).some((s) => s.status === "loading")
              ? "Publishing..."
              : "🚀 Publish All"}
          </button>
          <Link href={`/posts/${id}`} className="btn btn-secondary">
            View Details
          </Link>
        </div>
      </div>

      <div className="draft-layout">
        {/* Left Column — Screenshot + Analysis */}
        <div className="draft-col-left">
          {/* Screenshot Preview */}
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: "var(--space-md)" }}>
              Chart Screenshot
            </h3>
            {post?.screenshot_url ? (
              <img
                src={post.screenshot_url}
                alt={`${post.symbol} chart`}
                className="screenshot-preview"
                style={{ width: "100%" }}
              />
            ) : (
              <div className="empty-state" style={{ padding: "var(--space-xl)" }}>
                <div className="empty-state-icon">📸</div>
                <p>No screenshot available</p>
              </div>
            )}
          </div>

          {/* AI Analysis */}
          {analysis && (
            <div className="card" style={{ marginTop: "var(--space-lg)" }}>
              <h3 className="card-title" style={{ marginBottom: "var(--space-md)" }}>
                AI Analysis
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-md)" }}>
                <div className="analysis-block">
                  <div className="analysis-label">Market Trend</div>
                  <div className={`analysis-value ${analysis.market_trend}`}>
                    {analysis.market_trend === "bullish" && "🟢📈 "}
                    {analysis.market_trend === "bearish" && "🔴📉 "}
                    {analysis.market_trend === "neutral" && "🟡➡️ "}
                    {analysis.market_trend === "mixed" && "🔄 "}
                    {analysis.market_trend?.toUpperCase()}
                  </div>
                </div>
                <div className="analysis-block">
                  <div className="analysis-label">Confidence</div>
                  <div className="analysis-value">
                    {analysis.confidence?.toUpperCase() || "—"}
                  </div>
                </div>
                <div className="analysis-block">
                  <div className="analysis-label">Support Levels</div>
                  <div className="analysis-value" style={{ color: "var(--success)", fontSize: "0.9rem" }}>
                    {analysis.support_levels?.join(", ") || "—"}
                  </div>
                </div>
                <div className="analysis-block">
                  <div className="analysis-label">Resistance Levels</div>
                  <div className="analysis-value" style={{ color: "var(--error)", fontSize: "0.9rem" }}>
                    {analysis.resistance_levels?.join(", ") || "—"}
                  </div>
                </div>
              </div>
              {analysis.explanation && (
                <div className="analysis-block" style={{ marginTop: "var(--space-md)" }}>
                  <div className="analysis-label">Explanation</div>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.6 }}>
                    {analysis.explanation}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column — Caption + Publish */}
        <div className="draft-col-right">
          {/* Caption Editor */}
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-md)" }}>
              <h3 className="card-title">Caption</h3>
              {!editingCaption ? (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setEditingCaption(true)}
                  id="btn-edit-caption"
                >
                  ✏️ Edit
                </button>
              ) : (
                <div style={{ display: "flex", gap: "var(--space-sm)" }}>
                  <button className="btn btn-success btn-sm" onClick={handleSaveCaption}>
                    💾 Save
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setEditingCaption(false);
                      setCaptionText(post?.caption || "");
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {editingCaption ? (
              <textarea
                className="form-textarea"
                value={captionText}
                onChange={(e) => setCaptionText(e.target.value)}
                rows={8}
                id="caption-editor"
              />
            ) : (
              <>
                {/* Platform Tabs */}
                <div className="caption-tabs">
                  {(["instagram", "facebook", "whatsapp"] as const).map((tab) => (
                    <button
                      key={tab}
                      className={`caption-tab ${activeTab === tab ? "active" : ""}`}
                      onClick={() => setActiveTab(tab)}
                    >
                      {tab === "instagram" && "📷 "}
                      {tab === "facebook" && "📘 "}
                      {tab === "whatsapp" && "💬 "}
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>
                <pre className="caption-preview">
                  {captions?.[activeTab] || post?.caption || "No caption generated."}
                </pre>
              </>
            )}

            {post?.hashtags && post.hashtags.length > 0 && (
              <div style={{ marginTop: "var(--space-md)", display: "flex", flexWrap: "wrap", gap: "var(--space-xs)" }}>
                {post.hashtags.map((tag: string, i: number) => (
                  <span key={i} className="filter-chip" style={{ fontSize: "0.75rem" }}>
                    {tag.startsWith("#") ? tag : `#${tag}`}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Platform Publishing Cards */}
          <div className="card" style={{ marginTop: "var(--space-lg)" }}>
            <h3 className="card-title" style={{ marginBottom: "var(--space-lg)" }}>
              Publish to Platforms
            </h3>

            <div className="platform-publish-grid">
              {/* Instagram */}
              <div className={`platform-publish-card ${platformStates.instagram.status}`} id="publish-card-instagram">
                <div className="platform-publish-header">
                  <span className="platform-icon platform-instagram">📷</span>
                  <span className="platform-publish-name">Instagram</span>
                </div>
                {platformStates.instagram.status === "idle" && (
                  <button
                    className="btn btn-secondary"
                    onClick={() => handlePublishPlatform("instagram")}
                    style={{ width: "100%" }}
                    id="btn-pub-ig"
                  >
                    Publish to Instagram
                  </button>
                )}
                {platformStates.instagram.status === "loading" && (
                  <div className="platform-publish-loading">
                    <div className="loading-spinner" style={{ width: 20, height: 20 }} />
                    <span>Publishing...</span>
                  </div>
                )}
                {platformStates.instagram.status === "success" && (
                  <div className="platform-publish-result success">
                    <span>✅ Published</span>
                    {platformStates.instagram.postUrl && (
                      <a href={platformStates.instagram.postUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-secondary">
                        View Post →
                      </a>
                    )}
                  </div>
                )}
                {platformStates.instagram.status === "error" && (
                  <div className="platform-publish-result error">
                    <span>❌ {platformStates.instagram.message}</span>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => handlePublishPlatform("instagram")}
                    >
                      Retry
                    </button>
                  </div>
                )}
              </div>

              {/* Facebook */}
              <div className={`platform-publish-card ${platformStates.facebook.status}`} id="publish-card-facebook">
                <div className="platform-publish-header">
                  <span className="platform-icon platform-facebook">f</span>
                  <span className="platform-publish-name">Facebook</span>
                </div>
                {platformStates.facebook.status === "idle" && (
                  <button
                    className="btn btn-secondary"
                    onClick={() => handlePublishPlatform("facebook")}
                    style={{ width: "100%" }}
                    id="btn-pub-fb"
                  >
                    Publish to Facebook
                  </button>
                )}
                {platformStates.facebook.status === "loading" && (
                  <div className="platform-publish-loading">
                    <div className="loading-spinner" style={{ width: 20, height: 20 }} />
                    <span>Publishing...</span>
                  </div>
                )}
                {platformStates.facebook.status === "success" && (
                  <div className="platform-publish-result success">
                    <span>✅ Published</span>
                    {platformStates.facebook.postUrl && (
                      <a href={platformStates.facebook.postUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-secondary">
                        View Post →
                      </a>
                    )}
                  </div>
                )}
                {platformStates.facebook.status === "error" && (
                  <div className="platform-publish-result error">
                    <span>❌ {platformStates.facebook.message}</span>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => handlePublishPlatform("facebook")}
                    >
                      Retry
                    </button>
                  </div>
                )}
              </div>

              {/* WhatsApp */}
              <div className={`platform-publish-card ${platformStates.whatsapp.status}`} id="publish-card-whatsapp">
                <div className="platform-publish-header">
                  <span className="platform-icon platform-whatsapp">💬</span>
                  <span className="platform-publish-name">WhatsApp Channel</span>
                </div>
                {platformStates.whatsapp.status === "idle" && (
                  <button
                    className="btn btn-secondary"
                    onClick={() => handlePublishPlatform("whatsapp")}
                    style={{ width: "100%" }}
                    id="btn-pub-wa"
                  >
                    Post to WhatsApp
                  </button>
                )}
                {platformStates.whatsapp.status === "loading" && (
                  <div className="platform-publish-loading">
                    <div className="loading-spinner" style={{ width: 20, height: 20 }} />
                    <span>Publishing...</span>
                  </div>
                )}
                {platformStates.whatsapp.status === "success" && (
                  <div className="platform-publish-result success">
                    <span>✅ {platformStates.whatsapp.shareLink ? "Share Link Ready" : "Published"}</span>
                    {platformStates.whatsapp.shareLink && (
                      <a
                        href={platformStates.whatsapp.shareLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-secondary"
                      >
                        Open WhatsApp →
                      </a>
                    )}
                  </div>
                )}
                {platformStates.whatsapp.status === "error" && (
                  <div className="platform-publish-result error">
                    <span>❌ {platformStates.whatsapp.message}</span>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => handlePublishPlatform("whatsapp")}
                    >
                      Retry
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Risk Disclaimer */}
          <div className="card" style={{ marginTop: "var(--space-lg)" }}>
            <div className="analysis-label" style={{ marginBottom: "var(--space-sm)" }}>
              Risk Disclaimer
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontStyle: "italic" }}>
              {post?.risk_note || "⚠️ This is not financial advice. Trading involves risk. Always do your own research."}
            </p>
          </div>
        </div>
      </div>

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
