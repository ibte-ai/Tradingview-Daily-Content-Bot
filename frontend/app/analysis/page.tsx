"use client";

import { useEffect, useState } from "react";
import { postsApi } from "../lib/api";
import Link from "next/link";

export default function AIAnalysisPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [selectedPostId, setSelectedPostId] = useState<string>("");
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);

  async function loadPosts() {
    try {
      const data = await postsApi.list({ limit: "100" });
      setPosts(data.posts);
      
      // Select the first post by default if none selected yet
      if (data.posts.length > 0 && !selectedPostId) {
        setSelectedPostId(data.posts[0].id);
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

  async function handleRegenerate() {
    if (!selectedPostId) return;
    setProcessing(true);
    showToast("Regenerating AI Analysis. This will capture the chart and re-run analysis...", "info");
    try {
      const result = await postsApi.draftProcess(selectedPostId);
      setSelectedPost(result.post);
      showToast("Analysis regenerated successfully!", "success");
      loadPosts();
    } catch (err: any) {
      showToast(err.message || "Failed to regenerate analysis", "error");
    } finally {
      setProcessing(false);
    }
  }

  async function handleGenerateCaption() {
    if (!selectedPostId) return;
    setProcessing(true);
    showToast("Generating platform-specific captions...", "info");
    try {
      // Re-run the draft processing to regenerate caption
      const result = await postsApi.draftProcess(selectedPostId);
      setSelectedPost(result.post);
      showToast("Captions generated successfully!", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to generate captions", "error");
    } finally {
      setProcessing(false);
    }
  }

  async function handleApprove() {
    if (!selectedPostId) return;
    try {
      await postsApi.approve(selectedPostId);
      showToast("Analysis and draft approved successfully!", "success");
      // Reload post
      const data = await postsApi.get(selectedPostId);
      setSelectedPost(data.post);
      loadPosts();
    } catch (err: any) {
      showToast(err.message || "Approve failed", "error");
    }
  }

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="loading-spinner" />
        <p>Loading AI analysis workspace...</p>
      </div>
    );
  }

  const analysis = selectedPost?.ai_analysis;
  const isPendingReview = selectedPost?.status === "pending_review";

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">AI Analysis Page</h1>
          <p className="page-description">Review chart patterns, trends, and support/resistance levels</p>
        </div>
      </div>

      {posts.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
          
          {/* Post Selector Card */}
          <div className="card">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="post-select">Select Captured Symbol to Analyze</label>
              <select
                id="post-select"
                className="form-select"
                value={selectedPostId}
                onChange={(e) => setSelectedPostId(e.target.value)}
                style={{ maxWidth: 400 }}
              >
                {posts.map((post) => (
                  <option key={post.id} value={post.id}>
                    {post.symbol} — {new Date(post.created_at).toLocaleDateString()} ({post.status})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedPost && (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
              
              {/* Processing overlay / alert */}
              {processing && (
                <div className="card" style={{ borderLeft: "4px solid var(--warning)", display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
                  <div className="loading-spinner" style={{ width: 20, height: 20 }} />
                  <p style={{ color: "var(--warning)", fontWeight: 600 }}>AI is processing the chart. Please wait...</p>
                </div>
              )}

              {/* Grid of analysis cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "var(--space-lg)" }}>
                
                {/* 1. Trend Card */}
                <div className="card">
                  <h3 className="card-title" style={{ marginBottom: "var(--space-md)", color: "var(--text-primary)" }}>Trend</h3>
                  {analysis?.market_trend ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)" }}>
                      <div className={`analysis-value ${analysis.market_trend}`} style={{ fontSize: "2rem", fontWeight: 800 }}>
                        {analysis.market_trend === "bullish" ? "📈 Bullish" : analysis.market_trend === "bearish" ? "📉 Bearish" : "➡️ Neutral"}
                      </div>
                      <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                        Confidence: <strong>{analysis.confidence?.toUpperCase() || "—"}</strong>
                      </span>
                    </div>
                  ) : (
                    <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>No trend analysis generated. Run the analyzer below.</p>
                  )}
                </div>

                {/* 2. Support Levels Card */}
                <div className="card">
                  <h3 className="card-title" style={{ marginBottom: "var(--space-md)", color: "var(--text-primary)" }}>Support Levels</h3>
                  {analysis?.support_levels && analysis.support_levels.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
                      {analysis.support_levels.map((level: string, i: number) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", fontSize: "1.1rem", color: "var(--success)" }}>
                          <span style={{ fontSize: "1.2rem" }}>🟢</span>
                          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>{level}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>No support levels detected yet.</p>
                  )}
                </div>

                {/* 3. Resistance Levels Card */}
                <div className="card">
                  <h3 className="card-title" style={{ marginBottom: "var(--space-md)", color: "var(--text-primary)" }}>Resistance Levels</h3>
                  {analysis?.resistance_levels && analysis.resistance_levels.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
                      {analysis.resistance_levels.map((level: string, i: number) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", fontSize: "1.1rem", color: "var(--error)" }}>
                          <span style={{ fontSize: "1.2rem" }}>🔴</span>
                          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>{level}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>No resistance levels detected yet.</p>
                  )}
                </div>

                {/* 4. Summary Card */}
                <div className="card" style={{ gridColumn: "span 1" }}>
                  <h3 className="card-title" style={{ marginBottom: "var(--space-md)", color: "var(--text-primary)" }}>Summary</h3>
                  {analysis?.explanation ? (
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: 1.6 }}>
                      {analysis.explanation}
                    </p>
                  ) : (
                    <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>No text explanation has been generated for this chart.</p>
                  )}
                </div>

                {/* 5. Risk Notes Card */}
                <div className="card" style={{ gridColumn: "span 1" }}>
                  <h3 className="card-title" style={{ marginBottom: "var(--space-md)", color: "var(--text-primary)" }}>Risk Notes</h3>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", fontStyle: "italic", borderLeft: "3px solid var(--warning)", paddingLeft: "var(--space-sm)", lineHeight: 1.5 }}>
                    {selectedPost.risk_note || "⚠️ This is not financial advice. Trading involves risk. Always do your own research."}
                  </p>
                </div>

              </div>

              {/* Actions Card */}
              <div className="card" style={{ display: "flex", gap: "var(--space-md)", flexWrap: "wrap", alignItems: "center" }}>
                <h3 className="card-title" style={{ marginRight: "var(--space-xl)", color: "var(--text-primary)", marginBottom: 0 }}>Actions</h3>
                
                <button
                  className="btn btn-secondary"
                  onClick={handleRegenerate}
                  disabled={processing}
                >
                  🔄 Regenerate Analysis
                </button>

                <button
                  className="btn btn-secondary"
                  onClick={handleGenerateCaption}
                  disabled={processing}
                >
                  ✍️ Generate Caption
                </button>

                {isPendingReview && (
                  <button
                    className="btn btn-success"
                    onClick={handleApprove}
                    disabled={processing}
                    style={{ marginLeft: "auto" }}
                  >
                    ✓ Approve Analysis
                  </button>
                )}
              </div>

            </div>
          )}

        </div>
      ) : (
        <div className="empty-state card">
          <div className="empty-state-icon">🧠</div>
          <h3>No posts found</h3>
          <p>Please capture a symbol screenshot first to trigger AI analysis.</p>
          <Link href="/capture" className="btn btn-primary" style={{ marginTop: "var(--space-md)" }}>
            📸 Capture Chart
          </Link>
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
