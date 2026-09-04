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
        return "text-rzp-success font-bold";
      case "blocked":
      case "error":
        return "text-rzp-error font-bold";
      case "retry":
        return "text-rzp-warning font-bold";
      default:
        return "text-gray-500 font-bold";
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50 shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-rzp-navy">
            Live Audit &amp; Verification Ledger
          </h2>
          <span className="text-[10px] font-mono text-rzp-success font-bold bg-rzp-success/10 px-2 py-0.5 rounded border border-rzp-success/20">
            LIVE MONITOR
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Cryptographic token verification log &amp; deterministic gateway handshakes.
        </p>
      </div>

      {/* Live Log Area — scrollable within its flex space */}
      <div className="relative flex-1 min-h-0">
        <div
          ref={containerRef}
          className="absolute inset-0 p-4 font-mono text-[13px] overflow-y-auto bg-gray-50 text-gray-800 space-y-4"
        >
          {logs.slice().reverse().map((entry) => (
            <div key={entry.id} className="space-y-1">
              <div className="flex items-center space-x-2 text-rzp-navy text-xs">
                <span>{`[${new Date(entry.timestamp).toLocaleTimeString()}]`}</span>
                <span className={statusClass(entry.status)}>
                  [{entry.actor.toUpperCase()}: {entry.action}]
                </span>
              </div>
              {entry.payload !== undefined && (
                <pre className="text-gray-600 pl-4 overflow-x-auto text-[11px]">
                  {JSON.stringify(entry.payload, null, 2)}
                </pre>
              )}
            </div>
          ))}
          {logs.length === 0 && (
            <p className="text-gray-400 text-center pt-8">No audit entries yet.</p>
          )}
        </div>

        {/* Fade-out gradient at bottom edge — visible only when there's overflow */}
        {hasOverflow && (
          <div className="absolute bottom-0 inset-x-0 h-12 bg-gradient-to-t from-gray-50 to-transparent pointer-events-none" />
        )}
      </div>
    </div>
  );
}

