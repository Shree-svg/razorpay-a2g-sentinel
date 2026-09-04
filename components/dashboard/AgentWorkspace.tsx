"use client";
import React, { useState, useEffect } from "react";
import BuyerAgentPanel from "../agents/BuyerAgentPanel";
import MerchantAgentPanel from "../agents/MerchantAgentPanel";
import { useAudit } from "@/contexts/AuditContext";
export default function AgentWorkspace() {
  // Lifted outcome state so the approval banner can react to BuyerAgentPanel results
  const [buyerOutcome, setBuyerOutcome] = useState<any>(null);
const { addLog } = useAudit();
  const [approvalStatus, setApprovalStatus] = useState<"approved" | null>(null);
  // The banner should only show when the buyer agent finished with SUCCESS
  const showApproval =
  buyerOutcome?.status === "SUCCESS" && buyerOutcome?.result?.awaitingHumanApproval === true;
  useEffect(() => {
    if (!buyerOutcome) {
      setApprovalStatus(null);
    }
  }, [buyerOutcome]);

  const handleApprove = () => {
    addLog({
      actor: 'buyer',
      action: 'human_approval_granted',
      status: 'success',
      payload: {
        token: buyerOutcome?.result?.token,
        invoice: buyerOutcome?.result?.invoice,
      },
    });
    setApprovalStatus('approved');
  };

  const handleReject = () => {
    addLog({
      actor: 'buyer',
      action: 'human_approval_rejected',
      status: 'blocked',
      payload: {
        token: buyerOutcome?.result?.token,
        invoice: buyerOutcome?.result?.invoice,
      },
    });
    setBuyerOutcome(null);
    setApprovalStatus(null);
  };
  return (
    <div className="flex flex-col h-full bg-[#0f172a]/40 border border-slate-800 rounded-lg p-4 space-y-4 overflow-hidden">
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
          <BuyerAgentPanel onOutcomeChange={setBuyerOutcome} />
        </div>

        {/* Merchant Agent (purple tint) */}
        <div className="flex flex-col h-full bg-purple-950/5 border border-purple-900/20 rounded-lg p-3 overflow-hidden">
          <MerchantAgentPanel />
        </div>
      </div>

      {/* Human-in-the-loop approval banner — only rendered when buyer outcome is SUCCESS + awaitingHumanApproval */}
      {showApproval && (
        <div className="shrink-0 bg-[#090D16] border border-emerald-500/30 rounded-lg p-4 shadow-xl shadow-emerald-950/10 animate-in fade-in slide-in-from-bottom-2 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-emerald-400 flex items-center">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                HUMAN-IN-THE-LOOP APPROVAL
              </span>
              <span className="text-[10px] font-mono text-slate-500">GATEWAY_PASSED</span>
            </div>
              {approvalStatus === 'approved' ? (
                <p className="text-xs text-emerald-400 font-medium">FUNDS RELEASED (SIMULATED)</p>
              ) : (
                <div className="flex space-x-2 mt-2">
                  <button onClick={handleApprove} className="px-3 py-1 bg-bitPrimary text-xs rounded text-slate-900">Approve</button>
                  <button onClick={handleReject} className="px-3 py-1 bg-rose-600 text-xs rounded text-slate-900">Reject</button>
                </div>
              )}
          </div>
      )}
    </div>
  );
}
