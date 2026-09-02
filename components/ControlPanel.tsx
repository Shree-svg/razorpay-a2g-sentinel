"use client";
import React from "react";
import AttackSimulator from "./AttackSimulator";
import { runAgentLoop } from "@/lib/agentLoop";
import { useAudit } from "@/contexts/AuditContext";

export default function ControlPanel() {
  const { addLog } = useAudit();
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

      {/* Preset Selector Placeholder */}
      <div className="border border-slate-850 bg-slate-900/50 rounded-lg p-4 space-y-3">
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
          Select Catalog Preset
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {["Shoes", "Electronics", "SaaS Seats"].map((preset) => (
            <button
              key={preset}
              disabled
              className="py-2 px-3 text-xs bg-slate-800/80 hover:bg-slate-800 border border-slate-700/50 rounded text-slate-400 cursor-not-allowed text-center transition"
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* Red Team Simulation Buttons */}
      <div className="border border-amber-900/30 bg-amber-950/5 rounded-lg p-4 space-y-3 relative overflow-auto">
        {/* Warning strip border effect */}
        {/* Dev-only Red Team Simulation Tests */}
        {process.env.NODE_ENV !== "production" && (
          <div className="flex flex-col gap-2 mt-2">
            <button
              className="w-full py-1.5 text-xs bg-red-700 hover:bg-red-600 text-slate-100 rounded"
              onClick={async () => {
                const tools = {
                  invokeLlm: async (messages: any) => {
                    const resp = await fetch("/api/llm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages }) });
                    const body = await resp.json();
                    if (!resp.ok) { throw new Error(body?.reason ?? `HTTP ${resp.status}`); }
                    return body;
                  },
                  fetchCatalog: async () => {
                    const resp = await fetch("/api/merchant");
                    return await resp.json();
                  },
                  mintIntent: async (sku: string, maxAmount: number, expiresInSeconds: number) => {
                    const resp = await fetch("/api/buyer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sku, maxAmount, expiresInSeconds }) });
                    const body = await resp.json().catch(()=>({}));
                    return { httpStatus: resp.status, body };
                  },
                  validateWithGateway: async (token: unknown, invoice: unknown) => {
                    const resp = await fetch("/api/gateway", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, invoice }) });
                    const body = await resp.json().catch(()=>({}));
                    return { httpStatus: resp.status, body };
                  },
                };
                
                try {
                  const result = await runAgentLoop("buy ultra‑luxury watch for 1000000 INR", tools, () => {});
                  addLog({ actor: "buyer", action: "price_ceiling_test", payload: result, status: result?.status?.includes("HALTED") ? "blocked" : "success" });
                } catch (e) {
                  console.error(e);
                }
              }}
            >
              Trigger Price Ceiling Breach
            </button>

            <button
              className="w-full py-1.5 text-xs bg-red-700 hover:bg-red-600 text-slate-100 rounded"
              onClick={async () => {
                const tools = {
                  invokeLlm: async () => "I am a malformed LLM response without JSON.",
                  fetchCatalog: async () => [],
                  mintIntent: async () => ({ httpStatus: 200, body: {} }),
                  validateWithGateway: async () => ({ httpStatus: 200, body: {} }),
                };
                try {
                  const result = await runAgentLoop("buy anything", tools, () => {});
                  addLog({ actor: "buyer", action: "malformed_llm_test", payload: result, status: result?.status === "HALTED_FAILED_VALIDATION" ? "blocked" : "error" });
                } catch (e) {
                  console.error(e);
                }
              }}
            >
              Trigger Malformed LLM
            </button>

            <button
              className="w-full py-1.5 text-xs bg-red-700 hover:bg-red-600 text-slate-100 rounded"
              onClick={async () => {
                const tools = {
                  invokeLlm: async (messages: any) => {
                    const resp = await fetch("/api/llm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages }) });
                    return await resp.json();
                  },
                  fetchCatalog: async () => {
                    const resp = await fetch("/api/merchant");
                    return await resp.json();
                  },
                  mintIntent: async (sku: string, maxAmount: number) => {
                    const resp = await fetch("/api/buyer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sku, maxAmount, expiresInSeconds: 1 }) });
                    const body = await resp.json().catch(()=>({}));
                    return { httpStatus: resp.status, body };
                  },
                  validateWithGateway: async (token: unknown, invoice: unknown) => {
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    const resp = await fetch("/api/gateway", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, invoice }) });
                    const body = await resp.json().catch(()=>({}));
                    return { httpStatus: resp.status, body };
                  },
                };
                try {
                  const result = await runAgentLoop("buy noise cancelling headphones under 30000 INR", tools, () => {});
                  addLog({ actor: "buyer", action: "token_expiry_test", payload: result, status: result?.status === "HALTED_TERMINAL_SECURITY" ? "blocked" : "error" });
                } catch (e) {
                  console.error(e);
                }
              }}
            >
              Trigger Token Expiry
            </button>

            <button
              className="w-full py-1.5 text-xs bg-red-700 hover:bg-red-600 text-slate-100 rounded"
              onClick={async () => {
                const tools = {
                  invokeLlm: async (messages: any) => {
                    const resp = await fetch("/api/llm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages }) });
                    return await resp.json();
                  },
                  fetchCatalog: async () => {
                    const resp = await fetch("/api/merchant");
                    return await resp.json();
                  },
                  mintIntent: async (sku: string, maxAmount: number, expiresInSeconds: number) => {
                    const resp = await fetch("/api/buyer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sku, maxAmount, expiresInSeconds }) });
                    const body = await resp.json().catch(()=>({}));
                    return { httpStatus: resp.status, body };
                  },
                  validateWithGateway: async (token: unknown, invoice: unknown) => {
                    const resp = await fetch("/api/gateway", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, invoice }) });
                    const body = await resp.json().catch(()=>({}));
                    return { httpStatus: resp.status, body };
                  },
                };
                try {
                  const result = await runAgentLoop("buy noise cancelling headphones under 30000 INR", tools, () => {});
                  if (result.status === "SUCCESS") {
                    const { token, invoice } = result.result as any;
                    const replayEnvelope = await tools.validateWithGateway(token, invoice);
                    addLog({ actor: "buyer", action: "token_replay_test", payload: replayEnvelope.body, status: replayEnvelope.httpStatus === 403 ? "blocked" : "error" });
                  }
                } catch (e) {
                  console.error(e);
                }
              }}
            >
              Trigger Token Replay
            </button>
          </div>
        )}

        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 opacity-60" />
        <h3 className="text-xs font-semibold text-amber-500/90 uppercase tracking-wide mt-4">
          Red Team Simulation
        </h3>
        <p className="text-[11px] text-slate-400 leading-normal mb-2">
          Simulate runtime attacks to verify sanitization and validation limits.
        </p>
        <div className="flex flex-col gap-2">
          {/* Live attack simulator — replaces the static "Inject Prompt Attack" placeholder */}
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
            <span className="text-slate-400">-- ms</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-slate-850/50">
            <span className="text-slate-500">Token Cost</span>
            <span className="text-slate-400">$0.0000</span>
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
