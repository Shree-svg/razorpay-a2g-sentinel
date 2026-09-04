"use client";
import React, { useState } from "react";
import { sanitizeCatalogPayload } from "@/lib/sanitization";
import { useAudit } from "@/contexts/AuditContext";

interface RawCatalogItem {
  sku: string;
  name: string;
  price_inr: number;
  stock_available: number;
  description: string;
}

export default function AttackSimulator() {
  const { addLog } = useAudit();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{
    rawDescription: string;
    sanitizedDescription: string;
    stripped: string[];
    skuName: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAttack = async () => {
    setRunning(true);
    setError(null);
    setResult(null);

    try {
      const resp = await fetch("/api/debug/raw-catalog");
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body?.reason ?? `HTTP ${resp.status}`);
      }

      const catalog: RawCatalogItem[] = await resp.json();
      const target = catalog.find((item) => item.sku === "SKU_003");
      if (!target) {
        throw new Error("SKU_003 not found in raw catalog — attack target missing.");
      }

      // Run sanitization client-side (pure regex, no server deps)
      const { sanitized, stripped } = sanitizeCatalogPayload(target.description);

      const attackResult = {
        rawDescription: target.description,
        sanitizedDescription: sanitized,
        stripped,
        skuName: target.name,
      };

      setResult(attackResult);

      addLog({
        actor: "merchant",
        action: "sanitization_check",
        payload: {
          sku: target.sku,
          strippedCount: stripped.length,
          stripped,
        },
        status: "success",
      });
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      setError(msg);
      addLog({
        actor: "merchant",
        action: "sanitization_check",
        payload: { error: msg },
        status: "error",
      });
    } finally {
      setRunning(false);
    }
  };

  /**
   * Highlight stripped substrings within the raw description as red
   * strikethrough spans. Non-matching parts render as normal text.
   */
  const renderHighlightedRaw = (raw: string, stripped: string[]) => {
    if (stripped.length === 0) return <span>{raw}</span>;

    // Build a regex that matches any of the stripped substrings
    const escapedPatterns = stripped.map((s) =>
      s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    );
    const combinedRegex = new RegExp(`(${escapedPatterns.join("|")})`, "gi");
    const parts = raw.split(combinedRegex);

    return (
      <>
        {parts.map((part, i) => {
          const isStripped = stripped.some(
            (s) => s.toLowerCase() === part.toLowerCase()
          );
          return isStripped ? (
            <span
              key={i}
              className="line-through text-rzp-error bg-red-100 px-0.5 rounded"
            >
              {part}
            </span>
          ) : (
            <span key={i}>{part}</span>
          );
        })}
      </>
    );
  };

  const neutralized = result && result.stripped.length > 0;

  return (
    <div className="space-y-2">
      {/* Trigger button */}
      <button
        onClick={handleAttack}
        disabled={running}
        className="w-full text-left py-2 px-3 text-xs bg-white hover:bg-gray-50 border border-gray-200 hover:border-rzp-error rounded-lg text-gray-700 flex items-center justify-between transition disabled:opacity-50 shadow-sm"
      >
        <span>{running ? "Running attack…" : "Inject Prompt Attack"}</span>
        {!result && !running && (
          <span className="text-[10px] uppercase font-mono text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
            Armed
          </span>
        )}
        {result && neutralized && (
          <span className="text-[10px] uppercase font-mono text-rzp-success bg-green-50 px-1.5 py-0.5 rounded border border-green-200">
            Neutralized
          </span>
        )}
        {result && !neutralized && (
          <span className="text-[10px] uppercase font-mono text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 animate-pulse">
            ⚠ Regression
          </span>
        )}
      </button>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 p-2.5 rounded-lg text-xs text-rzp-error">
          {error}
        </div>
      )}

      {/* Results: side-by-side before/after */}
      {result && (
        <div className="space-y-2">
          {/* Status pill */}
          {neutralized ? (
            <div className="flex items-center space-x-2 bg-green-50 border border-green-200 p-2 rounded-lg shadow-sm">
              <span className="w-2 h-2 rounded-full bg-rzp-success animate-pulse shrink-0" />
              <span className="text-[11px] font-mono text-rzp-success uppercase tracking-wide font-bold">
                Attack Neutralized — {result.stripped.length} injection
                {result.stripped.length !== 1 ? "s" : ""} stripped
              </span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 bg-amber-50 border border-amber-200 p-2 rounded-lg shadow-sm">
              <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse shrink-0" />
              <span className="text-[11px] font-mono text-amber-700 uppercase tracking-wide font-bold">
                No Injection Detected — Possible Sanitization Regression
              </span>
            </div>
          )}

          {/* Target SKU label */}
          <p className="text-[10px] font-mono text-gray-500">
            Target: {result.skuName} (SKU_003)
          </p>

          {/* Side-by-side panels */}
          <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
            {/* Raw (before) */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-2 shadow-sm">
              <p className="text-[10px] font-mono text-rzp-error mb-1 uppercase tracking-wide font-bold">
                Raw (Unsanitized)
              </p>
              <p className="text-[11px] text-gray-800 leading-relaxed break-words">
                {renderHighlightedRaw(result.rawDescription, result.stripped)}
              </p>
            </div>

            {/* Sanitized (after) */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-2 shadow-sm">
              <p className="text-[10px] font-mono text-rzp-success mb-1 uppercase tracking-wide font-bold">
                Sanitized (Clean)
              </p>
              <p className="text-[11px] text-gray-800 leading-relaxed break-words">
                {result.sanitizedDescription || (
                  <span className="text-gray-400 italic">
                    (entire description was an attack payload)
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
