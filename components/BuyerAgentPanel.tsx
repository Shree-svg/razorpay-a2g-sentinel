"use client";
import React, { useState } from "react";
import { runAgentLoop } from "@/lib/agentLoop";
import { useAudit } from "@/contexts/AuditContext";

export default function BuyerAgentPanel() {
  const { addLog } = useAudit();
  const [goal, setGoal] = useState("");
  const [running, setRunning] = useState(false);
  const [stage, setStage] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [outcome, setOutcome] = useState<any>(null);

  const log = (actor: "buyer" | "merchant" | "gateway", action: string, payload: unknown, status: "success" | "blocked" | "error" | "retry") => {
    addLog({ actor, action, payload, status });
  };

  const tools = {
    invokeLlm: async (messages: any) => {
      const resp = await fetch("/api/llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(messages),
      });
      return await resp.json();
    },
    fetchCatalog: async () => {
      const resp = await fetch("/api/merchant");
      const body = await resp.json();
      return { httpStatus: resp.status, body };
    },
    mintIntent: async (sku: string, maxAmount: number, expiresInSeconds: number) => {
      const resp = await fetch("/api/buyer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku, maxAmount, expiresInSeconds }),
      });
      const body = await resp.json();
      return { httpStatus: resp.status, body };
    },
    validateWithGateway: async (token: unknown, invoice: unknown) => {
      const resp = await fetch("/api/gateway", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, invoice }),
      });
      const body = await resp.json();
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
    setRunning(true);
    setStage(null);
    setAttempt(0);
    setOutcome(null);
    try {
      const result = await runAgentLoop(goal, tools, onStep);
      setOutcome(result);
    } catch (e: any) {
      log("buyer", "unexpected_error", e.message ?? e, "error");
      setOutcome({ status: "HALTED_FAILED_VALIDATION", lastError: e.message ?? String(e) });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-blue-950/5 border border-blue-900/20 rounded-lg p-4 space-y-3">
      <h2 className="text-sm font-semibold uppercase text-blue-300">Buyer Agent</h2>
      <div className="flex space-x-2">
        <input
          type="text"
          placeholder="e.g. buy noise‑cancelling headphones under 30000 INR"
          value={goal}
          disabled={running}
          onChange={(e) => setGoal(e.target.value)}
          className="flex-1 rounded border border-slate-700 bg-slate-900/50 px-2 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-bitPrimary"
        />
        <button
          onClick={handleRun}
          disabled={running || !goal.trim()}
          className="rounded bg-bitPrimary px-3 py-1 text-xs font-medium text-slate-900 hover:bg-bitPrimary/80 disabled:opacity-50"
        >
          {running ? "Running…" : "Run"}
        </button>
      </div>
      {running && (
        <div className="text-xs text-slate-400">
          Stage: <span className="font-medium">{stage?.toUpperCase() ?? "—"}</span>
          {attempt > 0 && <span className="ml-2 text-amber-500">Retry #{attempt}</span>}
        </div>
      )}
      {outcome && (
        <div className="mt-2 text-xs">
          <strong>Status:</strong> {outcome.status}
          <pre className="mt-1 overflow-x-auto bg-slate-900/30 p-2 rounded text-slate-300">
            {JSON.stringify(outcome, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

