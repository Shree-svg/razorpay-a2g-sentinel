import React from "react";
import ControlPanel from "@/components/ControlPanel";
import AgentWorkspace from "@/components/AgentWorkspace";
import AuditLedger from "@/components/AuditLedger";

export default function HomePage() {
  return (
    <main className="h-screen w-screen bg-bitBg flex flex-col overflow-hidden text-slate-100">
      {/* Navbar / Header Bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0b0f19] shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-2.5 h-2.5 bg-bitPrimary rounded-full animate-pulse" />
          <h1 className="text-base font-bold tracking-tight text-white">
            PROJECT B.I.T.
            <span className="text-xs font-mono text-slate-500 ml-2 font-normal">
              Bounded Intent Tokens
            </span>
          </h1>
        </div>
        <div className="flex items-center space-x-2 text-xs text-slate-400">
          <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded font-mono text-slate-500">
            SEC_GATEWAY: ACTIVE
          </span>
          <span className="px-2 py-0.5 bg-blue-950/40 border border-blue-900/30 rounded font-mono text-blue-400">
            PROXY_FILTER: ON
          </span>
        </div>
      </header>

      {/* Main 3-Column Dashboard Area */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[25fr_45fr_30fr] gap-4 p-4 min-h-0">
        {/* Left Column: Control & Red Team Suite (25%) */}
        <section className="flex flex-col h-full min-h-0">
          <ControlPanel />
        </section>

        {/* Center Column: Dual Agent Workspace (45%) */}
        <section className="flex flex-col h-full min-h-0">
          <AgentWorkspace />
        </section>

        {/* Right Column: Live Audit & Verification Ledger (30%) */}
        <section className="flex flex-col h-full min-h-0">
          <AuditLedger />
        </section>
      </div>
    </main>
  );
}
