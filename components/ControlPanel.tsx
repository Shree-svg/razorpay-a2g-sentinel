import React from "react";

export default function ControlPanel() {
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
      <div className="border border-amber-900/30 bg-amber-950/5 rounded-lg p-4 space-y-3 relative overflow-hidden">
        {/* Warning strip border effect */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 opacity-60" />
        <h3 className="text-xs font-semibold text-amber-500/90 uppercase tracking-wide">
          Red Team Simulation
        </h3>
        <p className="text-[11px] text-slate-400 leading-normal">
          Simulate runtime attacks to verify sanitization and validation limits.
        </p>
        <div className="flex flex-col gap-2">
          {[
            "Inject Prompt Attack",
            "Modify Price Payload",
            "Expire Token",
          ].map((attack) => (
            <button
              key={attack}
              disabled
              className="w-full text-left py-2 px-3 text-xs bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-amber-900/50 rounded text-slate-400 cursor-not-allowed flex items-center justify-between transition"
            >
              <span>{attack}</span>
              <span className="text-[10px] uppercase font-mono text-amber-600 bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-900/30">
                Armed
              </span>
            </button>
          ))}
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
