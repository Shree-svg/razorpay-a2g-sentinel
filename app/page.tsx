"use client";
import React, { useState } from "react";
import ControlPanel from "@/components/dashboard/ControlPanel";
import AgentWorkspace from "@/components/dashboard/AgentWorkspace";
import AuditLedger from "@/components/dashboard/AuditLedger";
import SettingsModal from "@/components/modals/SettingsModal";

import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from "react-resizable-panels";

export default function HomePage() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <main className="h-screen w-screen bg-rzp-bg flex flex-col overflow-hidden text-rzp-text">
      {/* Navbar / Header Bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-rzp-navy bg-rzp-navy shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-2.5 h-2.5 bg-rzp-blue rounded-full animate-pulse shadow-[0_0_8px_rgba(51,149,255,0.8)]" />
          <h1 className="text-base font-semibold tracking-tight text-white">
            PROJECT B.I.T.
            <span className="text-xs font-mono text-blue-200 ml-2 font-normal">
              Bounded Intent Tokens
            </span>
          </h1>
        </div>
        <div className="flex items-center space-x-2 text-xs text-white">
          <span className="px-2 py-0.5 bg-white/10 border border-white/20 rounded font-mono text-white/90">
            SEC_GATEWAY: ACTIVE
          </span>
          <span className="px-2 py-0.5 bg-rzp-blue/20 border border-rzp-blue/50 rounded font-mono text-blue-200 mr-2">
            PROXY_FILTER: ON
          </span>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-1.5 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-colors"
            title="Settings"
          >
            ⚙️
          </button>
        </div>
      </header>
      
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {/* Main 3-Column Dashboard Area (Resizable) */}
      <div className="flex-1 p-4 min-h-0">
        <PanelGroup orientation="horizontal" className="h-full">
          {/* Left Column: Control & Red Team Suite (25%) */}
          <Panel defaultSize={25} minSize={15}>
            <section className="flex flex-col h-full min-h-0 pr-2">
              <ControlPanel />
            </section>
          </Panel>

          <PanelResizeHandle className="w-1.5 hover:bg-gray-200 active:bg-rzp-blue transition-colors cursor-col-resize rounded-full mx-1" />

          {/* Center Column: Dual Agent Workspace (45%) */}
          <Panel defaultSize={45} minSize={30}>
            <section className="flex flex-col h-full min-h-0 px-1">
              <AgentWorkspace />
            </section>
          </Panel>

          <PanelResizeHandle className="w-1.5 hover:bg-gray-200 active:bg-rzp-blue transition-colors cursor-col-resize rounded-full mx-1" />

          {/* Right Column: Live Audit & Verification Ledger (30%) */}
          <Panel defaultSize={30} minSize={20}>
            <section className="flex flex-col h-full min-h-0 pl-2">
              <AuditLedger />
            </section>
          </Panel>
        </PanelGroup>
      </div>
    </main>
  );
}
