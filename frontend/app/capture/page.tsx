"use client";

import { useState } from "react";
import { postsApi } from "../lib/api";

export default function CapturePage() {
  const [symbol, setSymbol] = useState("");
  const [chartUrl, setChartUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const popularSymbols = ["BTCUSD", "ETHUSD", "XAUUSD", "SPX500", "EURUSD", "AAPL", "TSLA", "NVDA"];

  async function handleCapture() {
    if (!symbol.trim()) {
      setError("Please enter a trading symbol");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const data = await postsApi.create({
        symbol: symbol.toUpperCase(),
        chartUrl: chartUrl || undefined,
        autoAnalyze: true,
      });

      setResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to create post");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Capture Chart</h1>
          <p className="page-description">
            Enter a trading symbol to capture and analyze
          </p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 700 }}>
        <div className="form-group">
          <label className="form-label" htmlFor="symbol-input">Trading Symbol *</label>
          <input
            id="symbol-input"
            type="text"
            className="form-input"
            placeholder="e.g., BTCUSD, AAPL, EURUSD"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleCapture()}
          />
        </div>

        <div style={{ marginBottom: "var(--space-lg)" }}>
          <span className="form-label">Quick Select</span>
          <div style={{ display: "flex", gap: "var(--space-sm)", flexWrap: "wrap", marginTop: "var(--space-sm)" }}>
            {popularSymbols.map((s) => (
              <button
                key={s}
                className={`filter-chip ${symbol === s ? "active" : ""}`}
                onClick={() => setSymbol(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="chart-url-input">Custom Chart URL (optional)</label>
          <input
            id="chart-url-input"
            type="url"
            className="form-input"
            placeholder="https://www.tradingview.com/chart/..."
            value={chartUrl}
            onChange={(e) => setChartUrl(e.target.value)}
          />
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "var(--space-xs)" }}>
            Leave blank to use the default TradingView chart for the symbol
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={handleCapture}
          disabled={loading}
          id="btn-capture"
          style={{ width: "100%" }}
        >
          {loading ? (
            <>
              <div className="loading-spinner" style={{ width: 18, height: 18 }} />
              Capturing & Analyzing...
            </>
          ) : (
            "📸 Capture & Analyze"
          )}
        </button>

        {error && (
          <div style={{ marginTop: "var(--space-md)", padding: "var(--space-md)", background: "var(--error-bg)", borderRadius: "var(--radius-md)", color: "var(--error)", fontSize: "0.9rem" }}>
            ❌ {error}
          </div>
        )}

        {result && (
          <div style={{ marginTop: "var(--space-md)", padding: "var(--space-md)", background: "var(--success-bg)", borderRadius: "var(--radius-md)", fontSize: "0.9rem" }}>
            <p style={{ color: "var(--success)", fontWeight: 600 }}>✅ {result.message}</p>
            <p style={{ color: "var(--text-secondary)", marginTop: "var(--space-sm)" }}>
              Post ID: <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>{result.post?.id}</code>
            </p>
            <a
              href={`/posts/${result.post?.id}`}
              className="btn btn-secondary btn-sm"
              style={{ marginTop: "var(--space-md)" }}
            >
              View Post →
            </a>
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="card" style={{ maxWidth: 700, marginTop: "var(--space-lg)" }}>
        <h3 className="card-title" style={{ marginBottom: "var(--space-md)" }}>How it works</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
          {[
            { step: "1", icon: "📸", title: "Capture", desc: "Playwright opens TradingView and screenshots your chart" },
            { step: "2", icon: "🤖", title: "Analyze", desc: "AI vision model analyzes the chart for trends, levels, and patterns" },
            { step: "3", icon: "✍️", title: "Review", desc: "You review and edit the generated caption and analysis" },
            { step: "4", icon: "🚀", title: "Publish", desc: "Approved content is published to Facebook, Instagram, and WhatsApp" },
          ].map((item) => (
            <div key={item.step} style={{ display: "flex", gap: "var(--space-md)", alignItems: "flex-start" }}>
              <div style={{
                width: 36, height: 36, borderRadius: "var(--radius-md)",
                background: "var(--accent-gradient)", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: "0.8rem", fontWeight: 700, flexShrink: 0,
              }}>
                {item.step}
              </div>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>{item.icon} {item.title}</div>
                <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
