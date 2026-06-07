"use client";

import { useEffect, useState } from "react";
import { settingsApi, healthApi } from "../lib/api";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [platforms, setPlatforms] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [settingsData, platformsData] = await Promise.allSettled([
          settingsApi.get(),
          healthApi.platforms(),
        ]);

        if (settingsData.status === "fulfilled") {
          const mapped: Record<string, any> = {};
          for (const s of settingsData.value.settings) {
            try { mapped[s.key] = JSON.parse(s.value); } catch { mapped[s.key] = s.value; }
          }
          setSettings(mapped);
        }

        if (platformsData.status === "fulfilled") {
          setPlatforms(platformsData.value.platforms);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function showToast(message: string, type: string) {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleSave(key: string, value: any) {
    try {
      await settingsApi.update({ [key]: value });
      setSettings((prev) => ({ ...prev, [key]: value }));
      showToast(`${key} updated`, "success");
    } catch (err: any) {
      showToast(err.message, "error");
    }
  }

  if (loading) {
    return <div className="loading-overlay"><div className="loading-spinner" /><p>Loading settings...</p></div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-description">Configure your automation system</p>
        </div>
      </div>

      {/* Platform Status */}
      <div className="card" style={{ marginBottom: "var(--space-lg)" }}>
        <h3 className="card-title" style={{ marginBottom: "var(--space-md)" }}>Platform Connections</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "var(--space-md)" }}>
          {Object.entries(platforms).map(([name, data]: [string, any]) => (
            <div key={name} className="analysis-block">
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", marginBottom: "var(--space-sm)" }}>
                <span style={{ fontWeight: 600, textTransform: "capitalize" }}>{name}</span>
              </div>
              {typeof data === "object" && Object.entries(data).map(([key, val]) => (
                <div key={key} style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 2 }}>
                  <span style={{ color: "var(--text-muted)" }}>{key}: </span>
                  <span style={{ color: val === true ? "var(--success)" : val === false ? "var(--error)" : "var(--text-primary)" }}>
                    {String(val)}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Application Settings */}
      <div className="card" style={{ marginBottom: "var(--space-lg)" }}>
        <h3 className="card-title" style={{ marginBottom: "var(--space-lg)" }}>Application Settings</h3>

        <div className="form-group">
          <label className="form-label" htmlFor="setting-ai-model">AI Model</label>
          <select
            id="setting-ai-model"
            className="form-select"
            value={settings.ai_model || "gemini"}
            onChange={(e) => handleSave("ai_model", e.target.value)}
          >
            <option value="gemini">Google Gemini 2.0 Flash</option>
            <option value="openai">OpenAI GPT-4o</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="setting-risk-note">Default Risk Disclaimer</label>
          <textarea
            id="setting-risk-note"
            className="form-textarea"
            value={settings.default_risk_note || ""}
            onChange={(e) => setSettings((prev) => ({ ...prev, default_risk_note: e.target.value }))}
            onBlur={(e) => handleSave("default_risk_note", e.target.value)}
            rows={3}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="setting-max-hashtags">Max Hashtags</label>
          <input
            id="setting-max-hashtags"
            type="number"
            className="form-input"
            value={settings.max_hashtags || 15}
            onChange={(e) => handleSave("max_hashtags", Number(e.target.value))}
            min={1}
            max={30}
            style={{ maxWidth: 100 }}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Auto-Approve Posts</label>
          <div style={{ display: "flex", gap: "var(--space-md)" }}>
            <button
              className={`filter-chip ${settings.auto_approve ? "active" : ""}`}
              onClick={() => handleSave("auto_approve", true)}
            >
              Enabled
            </button>
            <button
              className={`filter-chip ${!settings.auto_approve ? "active" : ""}`}
              onClick={() => handleSave("auto_approve", false)}
            >
              Disabled
            </button>
          </div>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "var(--space-xs)" }}>
            When enabled, posts skip review and go directly to publishing
          </p>
        </div>
      </div>

      {/* WhatsApp Notice */}
      <div className="card" style={{ borderLeft: "4px solid var(--warning)" }}>
        <h3 className="card-title" style={{ marginBottom: "var(--space-sm)" }}>⚠️ WhatsApp Channel Limitation</h3>
        <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
          WhatsApp Channel posting is <strong>not supported</strong> via the official Meta API.
          The system uses the WhatsApp Business Cloud API for direct messages to opted-in contacts.
          For Channel posting, use the generated share link for manual posting.
        </p>
      </div>

      {toast && (
        <div className={`toast ${toast.type}`}>
          <span>{toast.type === "success" ? "✅" : "❌"}</span>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
