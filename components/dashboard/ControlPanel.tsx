"use client";
import React, { useState, useEffect } from "react";
import AttackSimulator from "./AttackSimulator";
import { runAgentLoop } from "@/lib/agentLoop";
import { useAudit } from "@/contexts/AuditContext";
import { useSettings } from "@/contexts/SettingsContext";

// Preset definitions — keywords used to filter the live catalog
const PRESETS: Record<string, { label: string; keywords: string[]; sampleGoal: string }> = {
  Electronics: {
    label: "Electronics",
    keywords: ["headphone", "keyboard", "mouse", "monitor", "laptop", "tablet", "phone", "smartphone", "earbuds", "airpods", "speaker", "camera", "drone", "ssd", "storage", "charger", "power bank", "router"],
    sampleGoal: "buy noise cancelling headphones under 30000 rupees",
  },
  Shoes: {
    label: "Fashion",
    keywords: ["shoe", "sneaker", "running", "boot", "jacket", "clothing", "shirt", "jeans", "shorts", "apparel", "fashion", "wear", "watch", "wallet", "bag"],
    sampleGoal: "buy running shoes under 15000 rupees",
  },
  SaaS: {
    label: "SaaS Seats",
    keywords: ["saas", "license", "subscription", "software", "microsoft", "adobe", "notion", "slack", "zoom", "github", "figma", "plan", "annual", "monthly", "seats"],
    sampleGoal: "buy a SaaS software license under 5000 rupees",
  },
};

// Broadcast active preset so BuyerAgentPanel can pre-fill the goal input
function broadcastPreset(goal: string) {
  window.dispatchEvent(new CustomEvent("bit:preset", { detail: { goal } }));
}

export default function ControlPanel() {
  const { addLog } = useAudit();
  const { settings } = useSettings();
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [presetStatus, setPresetStatus] = useState<string | null>(null);
  const [runningSim, setRunningSim] = useState<string | null>(null);
  const [telemetry, setTelemetry] = useState({ latency: "-- ms", cost: "$0.0000" });

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setTelemetry({
        latency: detail.latency ? `${detail.latency} ms` : "-- ms",
        cost: detail.cost ? `$${detail.cost.toFixed(4)}` : "$0.0000"
      });
    };
    window.addEventListener("bit:telemetry", handler);
    return () => window.removeEventListener("bit:telemetry", handler);
  }, []);

  const handlePreset = async (key: string) => {
    const preset = PRESETS[key];
    setActivePreset(key);
    setPresetStatus("Filtering…");

    try {
      const resp = await fetch("/api/merchant");
      const catalog: any[] = await resp.json();
      const filtered = catalog.filter((item) =>
        preset.keywords.some(
          (kw) =>
            item.name.toLowerCase().includes(kw) ||
            item.description.toLowerCase().includes(kw)
        )
      );
      setPresetStatus(`${filtered.length} SKUs matched`);
      addLog({
        actor: "merchant",
        action: "catalog_preset_applied",
        payload: { preset: key, matchedSkus: filtered.length, sampleGoal: preset.sampleGoal },
        status: "success",
      });
      broadcastPreset(preset.sampleGoal);
    } catch {
      setPresetStatus("Failed");
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0f172a]/40 border border-slate-800 rounded-lg p-4 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Control &amp; Red Team Suite
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Demo scenarios, attack vectors, and real-time loop telemetry.
        </p>
      </div>

      {/* Catalog Preset Selector — now functional */}
      <div className="border border-slate-800 bg-slate-900/50 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
            Select Catalog Preset
          </h3>
          {presetStatus && (
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-900/30">
              {presetStatus}
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(PRESETS).map(([key, { label }]) => {
            const isActive = activePreset === key;
            return (
              <button
                key={key}
                onClick={() => handlePreset(key)}
                className={`py-2 px-3 text-xs border rounded text-center transition font-medium ${
                  isActive
                    ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/30"
                    : "bg-slate-800/80 hover:bg-slate-700 border-slate-700/50 text-slate-300 hover:text-white"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        {activePreset && (
          <p className="text-[10px] text-slate-500 leading-relaxed">
            <span className="text-blue-400">Goal pre-filled in Buyer Agent ↗</span> — hit{" "}
            <span className="text-white font-mono">Run</span> to execute.
          </p>
        )}
      </div>

      {/* Red Team Simulation Buttons */}
      <div className="border border-amber-900/30 bg-amber-950/5 rounded-lg p-4 space-y-3 relative overflow-auto">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 opacity-60" />

        {process.env.NODE_ENV !== "production" && (
          <div className="flex flex-col gap-2 mt-2">
            <button
              className="w-full py-1.5 text-xs bg-red-700 hover:bg-red-600 text-slate-100 rounded disabled:opacity-50"
              disabled={!!runningSim}
              onClick={async () => {
                setRunningSim("price_ceiling");
                let currentRunTokens = 0;
                const tools = {
                  invokeLlm: async (messages: any) => {
                    const headers: Record<string, string> = { "Content-Type": "application/json" };
                    if (settings.apiKey) headers["X-Groq-Api-Key"] = settings.apiKey;
                    if (settings.model) headers["X-Llm-Model"] = settings.model;
                    const resp = await fetch("/api/llm", { method: "POST", headers, body: JSON.stringify({ messages }) });
                    const tokensHeader = resp.headers.get("X-Token-Usage-Total");
                    if (tokensHeader) currentRunTokens += parseInt(tokensHeader, 10) || 0;
                    const body = await resp.json();
                    if (!resp.ok) throw new Error(body?.reason ?? `HTTP ${resp.status}`);
                    return body;
                  },
                  fetchCatalog: async () => { const r = await fetch("/api/merchant"); return r.json(); },
                  mintIntent: async (sku: string, maxAmount: number, expiresInSeconds: number) => {
                    // Sabotage the token maxAmount to guarantee a breach
                    const r = await fetch("/api/buyer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sku, maxAmount: 1, expiresInSeconds }) });
                    return { httpStatus: r.status, body: await r.json().catch(() => ({})) };
                  },
                  validateWithGateway: async (token: unknown, invoice: unknown) => {
                    const r = await fetch("/api/gateway", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, invoice }) });
                    return { httpStatus: r.status, body: await r.json().catch(() => ({})) };
                  },
                };
                try {
                  const start = Date.now();
                  const result = await runAgentLoop("buy ultra-luxury watch", tools, () => {});
                  const latency = Date.now() - start;
                  const cost = currentRunTokens * 0.0000005;
                  window.dispatchEvent(new CustomEvent("bit:telemetry", { detail: { latency, cost } }));
                  addLog({ actor: "buyer", action: "price_ceiling_test", payload: result, status: result?.status?.includes("HALTED") ? "blocked" : "success" });
                } catch (e: any) { 
                  addLog({ actor: "buyer", action: "price_ceiling_test", payload: { error: e.message ?? String(e) }, status: "error" });
                } finally {
                  setRunningSim(null);
                }
              }}
            >
              {runningSim === "price_ceiling" ? "Running..." : "Trigger Price Ceiling Breach"}
            </button>

            <button
              className="w-full py-1.5 text-xs bg-red-700 hover:bg-red-600 text-slate-100 rounded disabled:opacity-50"
              disabled={!!runningSim}
              onClick={async () => {
                setRunningSim("malformed_llm");
                const tools = {
                  invokeLlm: async () => "I am a malformed LLM response without JSON.",
                  fetchCatalog: async () => [],
                  mintIntent: async () => ({ httpStatus: 200, body: {} }),
                  validateWithGateway: async () => ({ httpStatus: 200, body: {} }),
                };
                try {
                  const start = Date.now();
                  const result = await runAgentLoop("buy anything", tools, () => {});
                  const latency = Date.now() - start;
                  window.dispatchEvent(new CustomEvent("bit:telemetry", { detail: { latency, cost: 0 } }));
                  addLog({ actor: "buyer", action: "malformed_llm_test", payload: result, status: result?.status === "HALTED_FAILED_VALIDATION" ? "blocked" : "error" });
                } catch (e: any) {
                  addLog({ actor: "buyer", action: "malformed_llm_test", payload: { error: e.message ?? String(e) }, status: "error" });
                } finally {
                  setRunningSim(null);
                }
              }}
            >
              {runningSim === "malformed_llm" ? "Running..." : "Trigger Malformed LLM"}
            </button>

            <button
              className="w-full py-1.5 text-xs bg-red-700 hover:bg-red-600 text-slate-100 rounded disabled:opacity-50"
              disabled={!!runningSim}
              onClick={async () => {
                setRunningSim("token_expiry");
                let currentRunTokens = 0;
                const tools = {
                  invokeLlm: async (messages: any) => { 
                    const headers: Record<string, string> = { "Content-Type": "application/json" };
                    if (settings.apiKey) headers["X-Groq-Api-Key"] = settings.apiKey;
                    if (settings.model) headers["X-Llm-Model"] = settings.model;
                    const r = await fetch("/api/llm", { method: "POST", headers, body: JSON.stringify({ messages }) }); 
                    const tokensHeader = r.headers.get("X-Token-Usage-Total");
                    if (tokensHeader) currentRunTokens += parseInt(tokensHeader, 10) || 0;
                    const body = await r.json();
                    if (!r.ok) throw new Error(body?.reason ?? `HTTP ${r.status}`);
                    return body;
                  },
                  fetchCatalog: async () => { const r = await fetch("/api/merchant"); return r.json(); },
                  mintIntent: async (sku: string, maxAmount: number) => {
                    const r = await fetch("/api/buyer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sku, maxAmount, expiresInSeconds: 1 }) });
                    return { httpStatus: r.status, body: await r.json().catch(() => ({})) };
                  },
                  validateWithGateway: async (token: unknown, invoice: unknown) => {
                    await new Promise((res) => setTimeout(res, 1500));
                    const r = await fetch("/api/gateway", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, invoice }) });
                    return { httpStatus: r.status, body: await r.json().catch(() => ({})) };
                  },
                };
                try {
                  const start = Date.now();
                  const result = await runAgentLoop("buy noise cancelling headphones under 30000 INR", tools, () => {});
                  const latency = Date.now() - start;
                  const cost = currentRunTokens * 0.0000005;
                  window.dispatchEvent(new CustomEvent("bit:telemetry", { detail: { latency, cost } }));
                  addLog({ actor: "buyer", action: "token_expiry_test", payload: result, status: result?.status === "HALTED_TERMINAL_SECURITY" ? "blocked" : "error" });
                } catch (e: any) { 
                  addLog({ actor: "buyer", action: "token_expiry_test", payload: { error: e.message ?? String(e) }, status: "error" });
                } finally {
                  setRunningSim(null);
                }
              }}
            >
              {runningSim === "token_expiry" ? "Running..." : "Trigger Token Expiry"}
            </button>

            <button
              className="w-full py-1.5 text-xs bg-red-700 hover:bg-red-600 text-slate-100 rounded disabled:opacity-50"
              disabled={!!runningSim}
              onClick={async () => {
                setRunningSim("token_replay");
                let currentRunTokens = 0;
                const tools = {
                  invokeLlm: async (messages: any) => { 
                    const headers: Record<string, string> = { "Content-Type": "application/json" };
                    if (settings.apiKey) headers["X-Groq-Api-Key"] = settings.apiKey;
                    if (settings.model) headers["X-Llm-Model"] = settings.model;
                    const r = await fetch("/api/llm", { method: "POST", headers, body: JSON.stringify({ messages }) }); 
                    const tokensHeader = r.headers.get("X-Token-Usage-Total");
                    if (tokensHeader) currentRunTokens += parseInt(tokensHeader, 10) || 0;
                    const body = await r.json();
                    if (!r.ok) throw new Error(body?.reason ?? `HTTP ${r.status}`);
                    return body;
                  },
                  fetchCatalog: async () => { const r = await fetch("/api/merchant"); return r.json(); },
                  mintIntent: async (sku: string, maxAmount: number, expiresInSeconds: number) => {
                    const r = await fetch("/api/buyer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sku, maxAmount, expiresInSeconds }) });
                    return { httpStatus: r.status, body: await r.json().catch(() => ({})) };
                  },
                  validateWithGateway: async (token: unknown, invoice: unknown) => {
                    const r = await fetch("/api/gateway", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, invoice }) });
                    return { httpStatus: r.status, body: await r.json().catch(() => ({})) };
                  },
                };
                try {
                  const start = Date.now();
                  const result = await runAgentLoop("buy noise cancelling headphones under 30000 INR", tools, () => {});
                  const latency = Date.now() - start;
                  const cost = currentRunTokens * 0.0000005;
                  window.dispatchEvent(new CustomEvent("bit:telemetry", { detail: { latency, cost } }));
                  if (result.status === "SUCCESS") {
                    const { token, invoice } = result.result as any;
                    const replayEnvelope = await tools.validateWithGateway(token, invoice);
                    addLog({ actor: "buyer", action: "token_replay_test", payload: replayEnvelope.body, status: replayEnvelope.httpStatus === 403 ? "blocked" : "error" });
                  } else {
                    addLog({ actor: "buyer", action: "token_replay_test", payload: result, status: "error" });
                  }
                } catch (e: any) { 
                  addLog({ actor: "buyer", action: "token_replay_test", payload: { error: e.message ?? String(e) }, status: "error" });
                } finally {
                  setRunningSim(null);
                }
              }}
            >
              {runningSim === "token_replay" ? "Running..." : "Trigger Token Replay"}
            </button>
          </div>
        )}

        <h3 className="text-xs font-semibold text-amber-500/90 uppercase tracking-wide mt-4">
          Red Team Simulation
        </h3>
        <p className="text-[11px] text-slate-400 leading-normal mb-2">
          Simulate runtime attacks to verify sanitization and validation limits.
        </p>
        <div className="flex flex-col gap-2">
          <AttackSimulator />
        </div>
      </div>

      {/* Real-Time Telemetry Card */}
      <div className="flex-1 border border-slate-850 bg-slate-900/30 rounded-lg p-4 space-y-3">
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
          Real-Time Telemetry
        </h3>
        <div className="space-y-2 font-mono text-xs">
          <div className="flex justify-between py-1.5 border-b border-slate-850/50">
            <span className="text-slate-500">Loop Latency</span>
            <span className="text-slate-400">{telemetry.latency}</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-slate-850/50">
            <span className="text-slate-500">Token Cost</span>
            <span className="text-slate-400">{telemetry.cost}</span>
          </div>
          <div className="flex justify-between py-1.5">
            <span className="text-slate-500">Hash Verifier</span>
            <span className="text-emerald-500 font-semibold uppercase tracking-wider">
              Ready
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
