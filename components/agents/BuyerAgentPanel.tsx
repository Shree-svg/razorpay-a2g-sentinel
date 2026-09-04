"use client";
import React, { useState, useEffect } from "react";
import { runAgentLoop } from "@/lib/agentLoop";
import { useAudit } from "@/contexts/AuditContext";
import { useSettings } from "@/contexts/SettingsContext";

interface BuyerAgentPanelProps {
  onOutcomeChange?: (outcome: any) => void;
}

export default function BuyerAgentPanel({ onOutcomeChange }: BuyerAgentPanelProps) {
  const { addLog } = useAudit();
  const { settings } = useSettings();
  const [goal, setGoal] = useState("");
  const [running, setRunning] = useState(false);
  const [stage, setStage] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [outcome, setOutcome] = useState<any>(null);
  const [validationError, setValidationError] = useState("");

  // Listen for catalog preset events fired by ControlPanel
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ goal: string }>).detail;
      if (detail?.goal) {
        setGoal(detail.goal);
        setValidationError("");
        setOutcome(null);
        onOutcomeChange?.(null);
      }
    };
    window.addEventListener("bit:preset", handler);
    return () => window.removeEventListener("bit:preset", handler);
  }, [onOutcomeChange]);

  const log = (actor: "buyer" | "merchant" | "gateway", action: string, payload: unknown, status: "success" | "blocked" | "error" | "retry") => {
    addLog({ actor, action, payload, status });
  };

  let currentRunTokens = 0;

  const tools = {
    invokeLlm: async (messages: any) => {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (settings.apiKey) headers["X-Groq-Api-Key"] = settings.apiKey;
      if (settings.model) headers["X-Llm-Model"] = settings.model;

      const resp = await fetch("/api/llm", {
        method: "POST",
        headers,
        body: JSON.stringify({ messages }),
      });
      const tokensHeader = resp.headers.get("X-Token-Usage-Total");
      if (tokensHeader) {
        currentRunTokens += parseInt(tokensHeader, 10) || 0;
      }
      const body = await resp.json();
      if (!resp.ok) {
        throw new Error(`invokeLlm failed (${resp.status}): ${body?.reason ?? "unknown error"}`);
      }
      return body;
    },
    fetchCatalog: async () => {
      const resp = await fetch("/api/merchant");
      const body = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        const reason = body?.reason ?? `HTTP ${resp.status}`;
        addLog({ actor: 'buyer', action: 'fetch_catalog', payload: { error: reason }, status: 'error' });
        throw new Error(reason);
      }
      return body;
    },
    mintIntent: async (sku: string, maxAmount: number, expiresInSeconds: number) => {
      const resp = await fetch("/api/buyer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku, maxAmount, expiresInSeconds }),
      });
      const body = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        const reason = body?.reason ?? `HTTP ${resp.status}`;
        addLog({ actor: 'buyer', action: 'mint_intent', payload: { error: reason }, status: 'error' });
      }
      return { httpStatus: resp.status, body };
    },
    validateWithGateway: async (token: unknown, invoice: unknown) => {
      const resp = await fetch("/api/gateway", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, invoice }),
      });
      const body = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        const reason = body?.reason ?? `HTTP ${resp.status}`;
        addLog({ actor: 'buyer', action: 'validate_gateway', payload: { error: reason }, status: 'error' });
      }
      return { httpStatus: resp.status, body };
    },
  };

  const onStep = (event: any) => {
    const { kind } = event;
    setStage(kind);
    if (kind === "retry") setAttempt(event.attempt);
    switch (kind) {
      case "observe":
        log("buyer", "observe", event.catalog, "success");
        break;
      case "plan":
        log("buyer", "plan", { step: event.step, attempt: event.attempt }, "success");
        break;
      case "act":
        log("buyer", `act_${event.action}`, event.detail, "success");
        break;
      case "verify":
        log(
          "buyer",
          "verify",
          { ok: event.ok, detail: event.detail },
          event.ok ? "success" : "error"
        );
        break;
      case "retry":
        log("buyer", "retry", { error: event.error, cause: event.cause }, "retry");
        break;
      default:
        break;
    }
  };

  const handleRun = async () => {
    if (!goal.trim()) return;
    
    if (/^https?:\/\//i.test(goal.trim()) || goal.trim().length < 5) {
      setValidationError("Please describe what you'd like to buy (e.g. 'buy noise cancelling headphones under 30000 rupees')");
      return;
    }
    setValidationError("");

    setRunning(true);
    setStage(null);
    setAttempt(0);
    setOutcome(null);
    currentRunTokens = 0;
    onOutcomeChange?.(null);
    try {
      const start = Date.now();
      const result = await runAgentLoop(goal, tools, onStep);
      const latency = Date.now() - start;
      const cost = currentRunTokens * 0.0000005; // $0.50 per 1M tokens
      window.dispatchEvent(new CustomEvent("bit:telemetry", { detail: { latency, cost } }));

      setOutcome(result);
      onOutcomeChange?.(result);
    } catch (e: any) {
      log("buyer", "unexpected_error", e.message ?? e, "error");
      const errOutcome = { status: "HALTED_FAILED_VALIDATION", lastError: e.message ?? String(e) };
      setOutcome(errOutcome);
      onOutcomeChange?.(errOutcome);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-3">
      <h2 className="text-sm font-semibold uppercase text-rzp-navy">Buyer Agent</h2>
      <div className="flex space-x-2">
        <input
          type="text"
          placeholder="e.g. buy noise‑cancelling headphones under 30000 INR"
          value={goal}
          disabled={running}
          onChange={(e) => setGoal(e.target.value)}
          className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-rzp-blue focus:ring-1 focus:ring-rzp-blue shadow-sm"
        />
        <button
          onClick={handleRun}
          disabled={running || !goal.trim()}
          className="rounded-lg bg-rzp-blue px-4 py-1.5 text-xs font-medium text-white hover:bg-rzp-blue-dark disabled:opacity-50 transition-colors shadow-sm"
        >
          {running ? "Running…" : "Run"}
        </button>
      </div>
      {validationError && (
        <div className="text-xs text-rzp-error mt-1">{validationError}</div>
      )}
      {running && (
        <div className="text-xs text-gray-500">
          Stage: <span className="font-medium text-gray-800">{stage?.toUpperCase() ?? "—"}</span>
          {attempt > 0 && <span className="ml-2 text-amber-600">Retry #{attempt}</span>}
        </div>
      )}
      {outcome && (
        <div className="mt-2 text-xs text-gray-700">
          <strong>Status:</strong> {outcome.status}
          <pre className="mt-2 overflow-x-auto overflow-y-auto max-h-40 bg-gray-50 border border-gray-200 p-2 rounded-lg text-gray-700 font-mono text-[10px]">
            {JSON.stringify(outcome, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}