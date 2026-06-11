"use client";

import { useEffect, useState } from "react";
import { settingsApi, healthApi } from "../lib/api";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [platforms, setPlatforms] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);

  // Separate states for section forms to handle inputs cleanly
  const [aiForm, setAiForm] = useState({
    ai_provider: "gemini",
    model_name: "gemini-2.0-flash",
    temperature: 0.2,
    max_tokens: 1024,
  });

  const [tvForm, setTvForm] = useState({
    tv_username: "",
    tv_password: "",
    default_symbol: "BTCUSD",
    default_timeframe: "1D",
  });

  const [publishForm, setPublishForm] = useState({
    fb_enabled: false,
    ig_enabled: false,
    wa_enabled: false,
  });

  const [schedulerForm, setSchedulerForm] = useState({
    cron_expression: "0 9 * * *",
    timezone: "UTC",
    retry_count: 3,
  });

  useEffect(() => {
    async function loadSettings() {
      try {
        const [settingsData, platformsData] = await Promise.allSettled([
          settingsApi.get(),
          healthApi.platforms(),
        ]);

        if (settingsData.status === "fulfilled") {
          const mapped: Record<string, any> = {};
          for (const s of settingsData.value.settings) {
            try {
              mapped[s.key] = JSON.parse(s.value);
            } catch {
              mapped[s.key] = s.value;
            }
          }
          setSettings(mapped);

          // Populate sub-forms
          setAiForm({
            ai_provider: mapped.ai_provider || mapped.ai_model || "gemini",
            model_name: mapped.model_name || "gemini-2.0-flash",
            temperature: mapped.temperature !== undefined ? Number(mapped.temperature) : 0.2,
            max_tokens: mapped.max_tokens !== undefined ? Number(mapped.max_tokens) : 1024,
          });

          setTvForm({
            tv_username: mapped.tv_username || "",
            tv_password: mapped.tv_password || "",
            default_symbol: mapped.default_symbol || "BTCUSD",
            default_timeframe: mapped.default_timeframe || "1D",
          });

          setPublishForm({
            fb_enabled: mapped.fb_enabled === true,
            ig_enabled: mapped.ig_enabled === true,
            wa_enabled: mapped.wa_enabled === true,
          });

          setSchedulerForm({
            cron_expression: mapped.cron_expression || "0 9 * * *",
            timezone: mapped.timezone || "UTC",
            retry_count: mapped.retry_count !== undefined ? Number(mapped.retry_count) : 3,
          });
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
    loadSettings();
  }, []);

  function showToast(message: string, type: string) {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleSaveSection(section: string, payload: Record<string, any>) {
    setSavingSection(section);
    try {
      await settingsApi.update(payload);
      showToast(`${section} updated successfully`, "success");
    } catch (err: any) {
      showToast(err.message || `Failed to update ${section}`, "error");
    } finally {
      setSavingSection(null);
    }
  }

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="loading-spinner" />
        <p>Loading application configuration...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings Page</h1>
          <p className="page-description">Configure the TradingView automation pipeline</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-lg)", alignItems: "start" }}>
        
        {/* SECTION 1: AI Settings */}
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: "var(--space-lg)", color: "var(--text-primary)" }}>AI Settings</h3>
          
          <div className="form-group">
            <label className="form-label" htmlFor="ai-provider">AI Provider</label>
            <select
              id="ai-provider"
              className="form-select"
              value={aiForm.ai_provider}
              onChange={(e) => setAiForm({ ...aiForm, ai_provider: e.target.value })}
            >
              <option value="gemini">Google Gemini</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="ai-model-name">Model Name</label>
            <input
              id="ai-model-name"
              type="text"
              className="form-input"
              value={aiForm.model_name}
              onChange={(e) => setAiForm({ ...aiForm, model_name: e.target.value })}
              placeholder="e.g. gemini-2.0-flash"
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-md)" }}>
            <div className="form-group">
              <label className="form-label" htmlFor="ai-temp">Temperature</label>
              <input
                id="ai-temp"
                type="number"
                step="0.1"
                min="0"
                max="2"
                className="form-input"
                value={aiForm.temperature}
                onChange={(e) => setAiForm({ ...aiForm, temperature: parseFloat(e.target.value) })}
              />
            </div>
            
            <div className="form-group">
              <label className="form-label" htmlFor="ai-tokens">Max Tokens</label>
              <input
                id="ai-tokens"
                type="number"
                step="100"
                min="1"
                className="form-input"
                value={aiForm.max_tokens}
                onChange={(e) => setAiForm({ ...aiForm, max_tokens: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <button
            className="btn btn-primary"
            onClick={() => handleSaveSection("AI Settings", aiForm)}
            disabled={savingSection === "AI Settings"}
            style={{ width: "100%", marginTop: "var(--space-sm)", justifyContent: "center" }}
          >
            {savingSection === "AI Settings" ? "Saving..." : "Save AI Configuration"}
          </button>
        </div>

        {/* SECTION 2: TradingView Settings */}
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: "var(--space-lg)", color: "var(--text-primary)" }}>TradingView Settings</h3>
          
          <div className="form-group">
            <label className="form-label" htmlFor="tv-user">Username</label>
            <input
              id="tv-user"
              type="text"
              className="form-input"
              value={tvForm.tv_username}
              onChange={(e) => setTvForm({ ...tvForm, tv_username: e.target.value })}
              placeholder="TradingView Username"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="tv-pass">Password</label>
            <input
              id="tv-pass"
              type="password"
              className="form-input"
              value={tvForm.tv_password}
              onChange={(e) => setTvForm({ ...tvForm, tv_password: e.target.value })}
              placeholder="••••••••"
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-md)" }}>
            <div className="form-group">
              <label className="form-label" htmlFor="tv-symbol">Default Symbol</label>
              <input
                id="tv-symbol"
                type="text"
                className="form-input"
                value={tvForm.default_symbol}
                onChange={(e) => setTvForm({ ...tvForm, default_symbol: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="tv-timeframe">Default Timeframe</label>
              <input
                id="tv-timeframe"
                type="text"
                className="form-input"
                value={tvForm.default_timeframe}
                onChange={(e) => setTvForm({ ...tvForm, default_timeframe: e.target.value })}
              />
            </div>
          </div>

          <button
            className="btn btn-primary"
            onClick={() => handleSaveSection("TradingView Settings", tvForm)}
            disabled={savingSection === "TradingView Settings"}
            style={{ width: "100%", marginTop: "var(--space-sm)", justifyContent: "center" }}
          >
            {savingSection === "TradingView Settings" ? "Saving..." : "Save TradingView Credentials"}
          </button>
        </div>

        {/* SECTION 3: Publishing Settings */}
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: "var(--space-lg)", color: "var(--text-primary)" }}>Publishing Settings</h3>
          
          <div className="form-group" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-sm) 0", borderBottom: "1px solid var(--borders)" }}>
            <div>
              <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>Facebook Integration</span>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: 0 }}>Enable automatic deployment to Facebook Pages</p>
            </div>
            <select
              className="form-select"
              style={{ width: 120 }}
              value={publishForm.fb_enabled ? "true" : "false"}
              onChange={(e) => setPublishForm({ ...publishForm, fb_enabled: e.target.value === "true" })}
            >
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>
          </div>

          <div className="form-group" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-sm) 0", borderBottom: "1px solid var(--borders)" }}>
            <div>
              <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>Instagram Business Integration</span>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: 0 }}>Enable posting to linked Instagram accounts</p>
            </div>
            <select
              className="form-select"
              style={{ width: 120 }}
              value={publishForm.ig_enabled ? "true" : "false"}
              onChange={(e) => setPublishForm({ ...publishForm, ig_enabled: e.target.value === "true" })}
            >
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>
          </div>

          <div className="form-group" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-sm) 0" }}>
            <div>
              <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>WhatsApp Channel Dispatch</span>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: 0 }}>Generate direct link prompts or manual posts</p>
            </div>
            <select
              className="form-select"
              style={{ width: 120 }}
              value={publishForm.wa_enabled ? "true" : "false"}
              onChange={(e) => setPublishForm({ ...publishForm, wa_enabled: e.target.value === "true" })}
            >
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>
          </div>

          <button
            className="btn btn-primary"
            onClick={() => handleSaveSection("Publishing Settings", publishForm)}
            disabled={savingSection === "Publishing Settings"}
            style={{ width: "100%", marginTop: "var(--space-md)", justifyContent: "center" }}
          >
            {savingSection === "Publishing Settings" ? "Saving..." : "Save Publishing Rules"}
          </button>
        </div>

        {/* SECTION 4: Scheduler Settings */}
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: "var(--space-lg)", color: "var(--text-primary)" }}>Scheduler Settings</h3>
          
          <div className="form-group">
            <label className="form-label" htmlFor="sched-cron">Cron Expression</label>
            <input
              id="sched-cron"
              type="text"
              className="form-input"
              value={schedulerForm.cron_expression}
              onChange={(e) => setSchedulerForm({ ...schedulerForm, cron_expression: e.target.value })}
              placeholder="e.g. 0 9 * * *"
            />
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>Standard 5-field cron syntax (Minute Hour Day Month Day-of-week)</p>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="sched-tz">Timezone</label>
            <input
              id="sched-tz"
              type="text"
              className="form-input"
              value={schedulerForm.timezone}
              onChange={(e) => setSchedulerForm({ ...schedulerForm, timezone: e.target.value })}
              placeholder="UTC"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="sched-retry">Retry Count</label>
            <input
              id="sched-retry"
              type="number"
              min="0"
              max="10"
              className="form-input"
              value={schedulerForm.retry_count}
              onChange={(e) => setSchedulerForm({ ...schedulerForm, retry_count: parseInt(e.target.value) })}
            />
          </div>

          <button
            className="btn btn-primary"
            onClick={() => handleSaveSection("Scheduler Settings", schedulerForm)}
            disabled={savingSection === "Scheduler Settings"}
            style={{ width: "100%", marginTop: "var(--space-sm)", justifyContent: "center" }}
          >
            {savingSection === "Scheduler Settings" ? "Saving..." : "Save Scheduler Rules"}
          </button>
        </div>

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
