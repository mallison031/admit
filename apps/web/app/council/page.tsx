"use client";

// Council portal — council-tier approvals, disputes, settle with adjustment, report death (A-9.7 / Issue #165).
import { calls, formatAmount, type Guarantee } from "@admit/core";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { AiReviewPanel } from "../../components/AiReviewPanel";
import { AmountInput } from "../../components/AmountInput";
import { ExplorerLink } from "../../components/ExplorerLink";
import { getContractId, getNetwork, getViewClient } from "../../lib/config";
import { getWalletSelector } from "../../lib/wallet";

export default function CouncilPage() {
  const [activeCouncil, setActiveCouncil] = useState("council1.testnet");
  const [guarantees, setGuarantees] = useState<Guarantee[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Settlement adjustment state
  const [adjustingId, setAdjustingId] = useState<number | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState("0.00");
  const [adjustmentReason, setAdjustmentReason] = useState("Bill audit adjustment approved by council");

  const contractId = getContractId();
  const network = getNetwork();

  const loadCouncilQueue = React.useCallback(async () => {
    setLoading(true);
    try {
      const client = getViewClient();
      const list = await client.listGuarantees(0, 0, 50);
      setGuarantees(list);
    } catch (err) {
      console.error("Failed to list council queue:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCouncilQueue();
  }, [loadCouncilQueue]);

  const handleWalletConnect = async () => {
    try {
      const { modal } = await getWalletSelector(contractId, network);
      modal.show();
    } catch (err) {
      console.error("Wallet error:", err);
    }
  };

  const handleApprove = async (guaranteeId: number) => {
    setStatusMessage(null);
    try {
      const call = calls.councilApprove({ guarantee_id: guaranteeId });
      setStatusMessage(`Approved Guarantee #${guaranteeId} (method: ${call.methodName})`);
      await loadCouncilQueue();
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Approval failed");
    }
  };

  const handleReject = async (guaranteeId: number) => {
    setStatusMessage(null);
    try {
      const call = calls.councilReject({
        guarantee_id: guaranteeId,
        reason: "Council vote declined high-tier exposure",
      });
      setStatusMessage(`Rejected Guarantee #${guaranteeId} (method: ${call.methodName})`);
      await loadCouncilQueue();
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Rejection failed");
    }
  };

  const handleSettleAdjustment = async (guaranteeId: number) => {
    setStatusMessage(null);
    try {
      const call = calls.settle({
        guarantee_id: guaranteeId,
        adjustment: adjustmentAmount,
        reason: adjustmentReason,
      });
      setStatusMessage(`Settled Guarantee #${guaranteeId} with adjustment (method: ${call.methodName})`);
      setAdjustingId(null);
      await loadCouncilQueue();
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Settlement failed");
    }
  };

  const handleReportDeath = async (guaranteeId: number) => {
    if (!confirm("Are you sure? This will write off outstanding member debt per mutual aid charter.")) {
      return;
    }
    setStatusMessage(null);
    try {
      const call = calls.reportDeath({ guarantee_id: guaranteeId });
      setStatusMessage(`Reported demise for Guarantee #${guaranteeId}. Debt forgiven. (method: ${call.methodName})`);
      await loadCouncilQueue();
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Report death failed");
    }
  };

  const pendingApprovals = guarantees.filter((g) => g.status === "PendingCouncil");
  const disputedGuarantees = guarantees.filter((g) => g.status === "Disputed");
  const activeGuarantees = guarantees.filter(
    (g) => g.status !== "PendingCouncil" && g.status !== "Disputed",
  );

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8 sm:py-12 max-w-2xl mx-auto font-sans">
      <div className="mb-6 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div>
          <Link
            href="/"
            className="text-xs text-slate-400 hover:text-white inline-flex items-center gap-1 mb-2 transition-colors"
          >
            <span>←</span> Home
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Council & DAO Governance
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Review catastrophic Tier-2 requests, adjudicate disputes, and approve mutual debt relief.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={activeCouncil}
            onChange={(e) => setActiveCouncil(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="council1.testnet">council1.testnet</option>
            <option value="council2.testnet">council2.testnet</option>
            <option value="council3.testnet">council3.testnet</option>
          </select>
          <button
            type="button"
            onClick={handleWalletConnect}
            className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold min-h-[44px]"
          >
            DAO Wallet
          </button>
        </div>
      </div>

      {statusMessage && (
        <div
          role="status"
          className="mb-5 p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs flex justify-between items-center"
        >
          <span>✓ {statusMessage}</span>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-amber-400 hover:text-white font-bold ml-2"
          >
            ×
          </button>
        </div>
      )}

      {/* 1. Pending Tier-2 Approvals */}
      <section className="mb-8">
        <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-3">
          1. Pending Tier-2 Approvals ({pendingApprovals.length})
        </h2>
        {loading ? (
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-500 text-center font-mono">
            Loading council queue from RPC...
          </div>
        ) : pendingApprovals.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-500 text-center">
            No high-tier guarantees currently awaiting council vote.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {pendingApprovals.map((g) => (
              <div
                key={g.id}
                className="p-4 rounded-xl bg-slate-900 border border-amber-900/40 flex flex-col gap-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-bold text-white text-sm">Guarantee #{g.id}</span>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Member: <ExplorerLink type="account" value={g.member} network={network} />
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-extrabold text-amber-400">
                      ${formatAmount(BigInt(g.amount), 6)} USDC
                    </span>
                    <div className="text-[10px] text-slate-500">Tier-2 Catastrophic</div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleApprove(g.id)}
                    className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold min-h-[44px]"
                  >
                    Approve Guarantee
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReject(g.id)}
                    className="flex-1 py-2 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-800/80 text-rose-300 text-xs font-semibold min-h-[44px]"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 2. Disputed Claims Adjudication */}
      <section className="mb-8">
        <h2 className="text-sm font-bold text-rose-400 uppercase tracking-wider mb-3">
          2. Disputed Claims Adjudication ({disputedGuarantees.length})
        </h2>
        {disputedGuarantees.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-500 text-center">
            Zero active disputes. All hospital claims settled cleanly.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {disputedGuarantees.map((g) => (
              <div
                key={g.id}
                className="p-4 rounded-xl bg-slate-900 border border-rose-900/40 flex flex-col gap-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-bold text-white text-sm">Disputed Guarantee #{g.id}</span>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Hospital: <ExplorerLink type="account" value={g.hospital} network={network} />
                    </div>
                  </div>
                  <span className="text-lg font-extrabold text-white">
                    ${formatAmount(BigInt(g.amount), 6)} USDC
                  </span>
                </div>

                {g.claim?.ai_review && (
                  <AiReviewPanel review={g.claim.ai_review} />
                )}

                <button
                  type="button"
                  onClick={() => setAdjustingId(g.id)}
                  className="py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold min-h-[44px]"
                >
                  Adjudicate & Settle with Adjustment
                </button>

                {adjustingId === g.id && (
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex flex-col gap-2 mt-2">
                    <AmountInput
                      value={adjustmentAmount}
                      onChange={setAdjustmentAmount}
                      label="Adjusted Claim Amount (USDC)"
                      id={`adj-${g.id}`}
                    />
                    <div className="flex flex-col gap-1">
                      <label htmlFor={`adj-reason-${g.id}`} className="text-[11px] text-slate-400">
                        Council Decision Notes
                      </label>
                      <input
                        id={`adj-reason-${g.id}`}
                        type="text"
                        value={adjustmentReason}
                        onChange={(e) => setAdjustmentReason(e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div className="flex gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => handleSettleAdjustment(g.id)}
                        className="flex-1 py-2 bg-emerald-600 text-white text-xs font-semibold rounded min-h-[44px]"
                      >
                        Execute Settlement
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdjustingId(null)}
                        className="px-3 py-2 text-xs text-slate-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3. Debt Forgiveness / Demise Relief */}
      <section>
        <h2 className="text-sm font-bold text-purple-400 uppercase tracking-wider mb-3">
          3. Mutual Debt Relief (Demise Report)
        </h2>
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col gap-3">
          <p className="text-xs text-slate-400">
            Per Admit charter, if a member passes away, their remaining debt is forgiven and absorbed by the community reserve pool.
          </p>
          <div className="flex flex-col gap-2">
            {activeGuarantees.slice(0, 3).map((g) => (
              <div
                key={g.id}
                className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between"
              >
                <div className="text-xs">
                  <span className="font-mono text-white">#{g.id}</span> ({g.member})
                </div>
                <button
                  type="button"
                  onClick={() => handleReportDeath(g.id)}
                  className="px-3 py-1.5 rounded bg-purple-950/40 hover:bg-purple-900/60 border border-purple-800/60 text-purple-300 text-xs font-semibold transition-colors min-h-[44px]"
                >
                  Report Demise
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
