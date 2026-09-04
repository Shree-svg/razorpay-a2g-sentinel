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
        orderId: buyerOutcome?.result?.gateway?.orderId,
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
    <div className="flex flex-col h-full bg-white border border-gray-200 rounded-lg p-4 space-y-4 overflow-hidden shadow-sm">
      {/* Header with loop indicator badge */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-200">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-rzp-navy">
            Dual Agent Workspace
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Observing transaction negotiation and planning cycles in real time.
          </p>
        </div>

        {/* Animated loop indicator badge (Observe -> Plan -> Act -> Verify) */}
        <div className="flex items-center space-x-1.5 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full text-xs">
          <span className="w-2 h-2 rounded-full bg-rzp-blue animate-ping" />
          <span className="text-rzp-blue font-mono font-medium">Observe</span>
          <span className="text-gray-400">&rarr;</span>
          <span className="text-gray-600 font-mono">Plan</span>
          <span className="text-gray-400">&rarr;</span>
          <span className="text-gray-600 font-mono">Act</span>
          <span className="text-gray-400">&rarr;</span>
          <span className="text-gray-600 font-mono">Verify</span>
        </div>
      </div>

      {/* Split-screen Agent Chat Windows */}
      <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
        {/* Buyer Agent (blue tint) */}
        <div className="flex flex-col h-full bg-blue-50/50 border border-blue-100 rounded-lg p-3 overflow-hidden">
          <BuyerAgentPanel onOutcomeChange={setBuyerOutcome} />
        </div>

        {/* Merchant Agent (gray tint) */}
        <div className="flex flex-col h-full bg-gray-50/80 border border-gray-200 rounded-lg p-3 overflow-hidden">
          <MerchantAgentPanel />
        </div>
      </div>

      {/* Human-in-the-loop approval banner — only rendered when buyer outcome is SUCCESS + awaitingHumanApproval */}
      {showApproval && (
        <div className="shrink-0 bg-white border-2 border-rzp-navy rounded-lg p-4 shadow-xl animate-in fade-in slide-in-from-bottom-2 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-rzp-navy flex items-center tracking-wide">
                <span className="w-2 h-2 rounded-full bg-rzp-blue mr-1.5 animate-pulse" />
                HUMAN-IN-THE-LOOP APPROVAL
              </span>
              <span className="text-[10px] font-mono text-rzp-success font-bold bg-green-50 px-2 py-0.5 rounded border border-green-200">GATEWAY_PASSED</span>
            </div>
              {approvalStatus === 'approved' ? (
                <p className="text-xs text-rzp-success font-medium">
                  {buyerOutcome?.result?.gateway?.orderId 
                    ? `FUNDS RELEASED (Order ID: ${buyerOutcome.result.gateway.orderId})` 
                    : "FUNDS RELEASED (SIMULATED)"}
                </p>
              ) : (
                <div className="flex space-x-3 mt-3">
                  <button onClick={handleApprove} className="px-4 py-1.5 bg-rzp-blue hover:bg-rzp-blue-dark text-white text-xs font-medium rounded-lg transition-colors shadow-sm">Approve Transaction</button>
                  <button onClick={handleReject} className="px-4 py-1.5 bg-rzp-error hover:bg-red-700 text-white text-xs font-medium rounded-lg transition-colors shadow-sm">Reject</button>
                </div>
              )}
          </div>
      )}
    </div>
  );
}
