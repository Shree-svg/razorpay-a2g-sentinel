"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useAudit } from "@/contexts/AuditContext";

export default function AuditLedger() {
  const { logs } = useAudit();
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);

  // Detect whether the log area has more content than fits
  const checkOverflow = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    // Show gradient when there's content scrolled past the bottom
    const isOverflowing = el.scrollHeight > el.clientHeight + el.scrollTop + 8;
    setHasOverflow(isOverflowing);
  }, []);

  // Keep newest entry at top and auto‑scroll to top when logs change
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
    // Re-check overflow after log content changes
    requestAnimationFrame(checkOverflow);
  }, [logs, checkOverflow]);

  // Listen to scroll to update the fade gradient visibility
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkOverflow, { passive: true });
    // Initial check
    checkOverflow();
    return () => el.removeEventListener("scroll", checkOverflow);
  }, [checkOverflow]);

  const statusClass = (status: string) => {
    switch (status) {
      case "success":
        return "text-emerald-500"; // green
      case "blocked":
      case "error":
        return "text-red-500"; // red
      case "retry":
        return "text-amber-500"; // amber
      default:
        return "text-slate-400";
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#090D16] border border-slate-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-[#0f172a]/20 shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Live Audit &amp; Verification Ledger
          </h2>
          <span className="text-[10px] font-mono text-emerald-500 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900/30">
            LIVE MONITOR
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Cryptographic token verification log &amp; deterministic gateway handshakes.
        </p>
      </div>

      {/* Live Log Area — scrollable within its flex space */}
      <div className="relative flex-1 min-h-0">
        <div
          ref={containerRef}
          className="absolute inset-0 p-4 font-mono text-[13px] overflow-y-auto bg-[#04060c] text-slate-300 space-y-4"
        >
          {logs.slice().reverse().map((entry) => (
            <div key={entry.timestamp} className="space-y-1">
              <div className="flex items-center space-x-2 text-slate-500 text-xs">
                <span>{`[${new Date(entry.timestamp).toLocaleTimeString()}]`}</span>
                <span className={statusClass(entry.status)}>
                  [{entry.actor.toUpperCase()}: {entry.action}]
                </span>
              </div>
              {entry.payload !== undefined && (
                <pre className="text-slate-400 pl-4 overflow-x-auto">
                  {JSON.stringify(entry.payload, null, 2)}
                </pre>
              )}
            </div>
          ))}
          {logs.length === 0 && (
            <p className="text-slate-600 text-center pt-8">No audit entries yet.</p>
          )}
        </div>

        {/* Fade-out gradient at bottom edge — visible only when there's overflow */}
        {hasOverflow && (
          <div className="absolute bottom-0 inset-x-0 h-12 bg-gradient-to-t from-[#04060c] to-transparent pointer-events-none" />
        )}
      </div>
    </div>
  );
}

