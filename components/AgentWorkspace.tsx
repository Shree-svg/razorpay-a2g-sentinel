import React from "react";

export default function AgentWorkspace() {
  return (
    <div className="flex flex-col h-full bg-[#0f172a]/40 border border-slate-800 rounded-lg p-4 space-y-4 relative overflow-hidden">
      {/* Header with loop indicator badge */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Dual Agent Workspace
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Observing transaction negotiation and planning cycles in real time.
          </p>
        </div>

        {/* Animated loop indicator badge (Observe -> Plan -> Act -> Verify) */}
        <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-850 px-2.5 py-1 rounded-full text-xs">
          <span className="w-2 h-2 rounded-full bg-bitPrimary animate-ping" />
          <span className="text-slate-400 font-mono">Observe</span>
          <span className="text-slate-600">&rarr;</span>
          <span className="text-slate-600 font-mono">Plan</span>
          <span className="text-slate-600">&rarr;</span>
          <span className="text-slate-600 font-mono">Act</span>
          <span className="text-slate-600">&rarr;</span>
          <span className="text-slate-600 font-mono">Verify</span>
        </div>
      </div>

      {/* Split-screen Agent Chat Windows */}
      <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
        {/* Buyer Agent (blue tint) */}
        <div className="flex flex-col h-full bg-blue-950/5 border border-blue-900/20 rounded-lg p-3 overflow-hidden">
          <div className="flex items-center justify-between pb-2 border-b border-blue-900/10 mb-2">
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-wide">
              Buyer Agent
            </span>
            <span className="text-[10px] bg-blue-950/80 border border-blue-900/40 text-blue-300 font-mono px-1.5 py-0.5 rounded">
              LLM REASONER
            </span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
            <div className="bg-slate-900/70 border border-slate-850 p-2.5 rounded-lg text-slate-400">
              <span className="text-blue-400 font-semibold">Goal Input:</span>
              <p className="mt-1 italic">"Enter your target goal to begin negotiation loop..."</p>
            </div>
            {/* Mock chat bubble */}
            <div className="bg-blue-900/10 border border-blue-900/20 p-2.5 rounded-lg text-slate-300">
              <p className="font-mono text-[10px] text-blue-400 mb-1">OBSERVE</p>
              Waiting for user goal to run loop.
            </div>
          </div>
        </div>

        {/* Merchant Agent (purple tint) */}
        <div className="flex flex-col h-full bg-purple-950/5 border border-purple-900/20 rounded-lg p-3 overflow-hidden">
          <div className="flex items-center justify-between pb-2 border-b border-purple-900/10 mb-2">
            <span className="text-xs font-semibold text-purple-400 uppercase tracking-wide">
              Merchant Agent
            </span>
            <span className="text-[10px] bg-purple-950/80 border border-purple-900/40 text-purple-300 font-mono px-1.5 py-0.5 rounded">
              LLM REASONER
            </span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
            <div className="bg-slate-900/70 border border-slate-850 p-2.5 rounded-lg text-slate-400">
              <span className="text-purple-400 font-semibold">Catalog Status:</span>
              <p className="mt-1 font-mono text-[11px] text-purple-300">Sanitized (Proxy On)</p>
            </div>
            {/* Mock chat bubble */}
            <div className="bg-purple-900/10 border border-purple-900/20 p-2.5 rounded-lg text-slate-300">
              <p className="font-mono text-[10px] text-purple-400 mb-1">AWAITING_OFFER</p>
              Ready to process client transactions.
            </div>
          </div>
        </div>
      </div>

      {/* Pop-up Razorpay-style mock approval modal placeholder (non-modal view by default, hidden or absolute) */}
      <div className="absolute inset-x-4 bottom-4 bg-[#090D16] border border-emerald-500/30 rounded-lg p-4 shadow-xl shadow-emerald-950/10 opacity-30 pointer-events-none transform translate-y-2 transition-all">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-emerald-400 flex items-center">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
            HUMAN-IN-THE-LOOP APPROVAL
          </span>
          <span className="text-[10px] font-mono text-slate-500">GATEWAY_PASSED</span>
        </div>
        <p className="text-xs text-slate-400">
          Authorization requested for SKU transaction. Click Approve to release bounded intent funds.
        </p>
      </div>
    </div>
  );
}
