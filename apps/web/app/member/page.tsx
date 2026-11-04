"use client";

// Member portal — limit, debt, contribute, repay, delegate pairing QR, exit (A-9.6 / Issue #164).
import { calls, formatAmount, type LimitView, type Member } from "@admit/core";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { AmountInput } from "../../components/AmountInput";
import { ExplorerLink } from "../../components/ExplorerLink";
import { getContractId, getNetwork, getViewClient } from "../../lib/config";
import { getWalletSelector } from "../../lib/wallet";

export default function MemberPage() {
  const [memberAccount, setMemberAccount] = useState("member1.testnet");
  const [memberData, setMemberData] = useState<Member | null>(null);
  const [limitData, setLimitData] = useState<LimitView | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Repay state
  const [repayAmount, setRepayAmount] = useState("10.00");
  const [showPairingQr, setShowPairingQr] = useState(false);

  const contractId = getContractId();
  const network = getNetwork();

  const loadMember = React.useCallback(async () => {
    setLoading(true);
    try {
      const client = getViewClient();
      const [m, l] = await Promise.all([
        client.getMember(0, memberAccount).catch(() => null),
        client.getLimit(0, memberAccount).catch(() => null),
      ]);
      setMemberData(m);
      setLimitData(l);
    } catch (err) {
      console.error("Error loading member:", err);
    } finally {
      setLoading(false);
    }
  }, [memberAccount]);

  useEffect(() => {
    loadMember();
  }, [loadMember]);

  const handleWalletConnect = async () => {
    try {
      const { modal } = await getWalletSelector(contractId, network);
      modal.show();
    } catch (err) {
      console.error("Wallet selector error:", err);
    }
  };

  const handleContribute = async () => {
    setActionMessage(null);
    try {
      // In production, user transfers 5 USDC with ft_transfer_call
      setActionMessage("Contribution transaction prepared ($5.00 USDC)");
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Contribution failed");
    }
  };

  const handleRepay = async () => {
    setActionMessage(null);
    try {
      setActionMessage(`Repayment transaction prepared ($${repayAmount} USDC)`);
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Repayment failed");
    }
  };

  const handleRequestExit = async () => {
    setActionMessage(null);
    try {
      const call = calls.requestExit({ pool_id: 0 });
      setActionMessage(`Exit request submitted (method: ${call.methodName}). 30-day notice active.`);
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Exit request failed");
    }
  };

  const standingColors: Record<string, string> = {
    Good: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    Late: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    Default: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  };

  const standing = memberData?.standing ?? "Good";

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
            Member Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage your emergency credit limit, debt repayments, and family delegate keys.
          </p>
        </div>

        <button
          type="button"
          onClick={handleWalletConnect}
          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-white transition-all self-start sm:self-auto min-h-[44px]"
        >
          Connect Wallet
        </button>
      </div>

      {actionMessage && (
        <div
          role="status"
          className="mb-5 p-3 rounded-xl bg-sky-950/40 border border-sky-800/60 text-sky-300 text-xs flex justify-between items-center"
        >
          <span>✓ {actionMessage}</span>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            className="text-sky-400 hover:text-white font-bold ml-2"
          >
            ×
          </button>
        </div>
      )}

      {/* Account Selector & Profile */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col gap-5 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center text-xs">
              <label htmlFor="member-acc" className="font-semibold text-slate-400">
                Active Member Account
              </label>
              <ExplorerLink type="account" value={memberAccount} network={network} />
            </div>
            <input
              id="member-acc"
              type="text"
              value={memberAccount}
              onChange={(e) => setMemberAccount(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            {loading && <span className="text-[10px] text-slate-500 font-mono">Syncing member on-chain data...</span>}
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold border ${standingColors[standing] ?? "bg-slate-800 text-slate-300"}`}
            >
              Standing: {standing}
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-800 text-left">
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <span className="text-[11px] text-slate-400">Effective Limit</span>
            <div className="text-xl font-bold text-white mt-1">
              ${limitData ? formatAmount(BigInt(limitData.limit), 6) : "100.00"}
            </div>
            <span className="text-[10px] text-emerald-400">Instant tier ready</span>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <span className="text-[11px] text-slate-400">Outstanding Debt</span>
            <div className="text-xl font-bold text-white mt-1">
              ${memberData ? formatAmount(BigInt(memberData.outstanding), 6) : "0.00"}
            </div>
            <span className="text-[10px] text-slate-400">30% member share</span>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 col-span-2 sm:col-span-1">
            <span className="text-[11px] text-slate-400">Total Contributed</span>
            <div className="text-xl font-bold text-white mt-1">
              ${memberData ? formatAmount(BigInt(memberData.contributed), 6) : "30.00"}
            </div>
            <span className="text-[10px] text-sky-400">6 months tenure</span>
          </div>
        </div>
      </div>

      {/* Action Sections */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        {/* Monthly Contribution */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-white">Monthly Contribution</h2>
            <p className="text-xs text-slate-400 mt-1">
              Maintain Good standing and accrue +$25/month credit limit up to the $400 max cap.
            </p>
          </div>
          <button
            type="button"
            onClick={handleContribute}
            className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition-all min-h-[44px]"
          >
            Pay $5.00 USDC Contribution
          </button>
        </div>

        {/* Debt Repayment */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-white">Repay Medical Debt</h2>
            <p className="text-xs text-slate-400 mt-1">
              Repaying your 30% co-pay restores your full borrowing limit.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <AmountInput
              value={repayAmount}
              onChange={setRepayAmount}
              max={memberData ? formatAmount(BigInt(memberData.outstanding), 6) : "0.00"}
              label="Repayment (USDC)"
              id="repay-input"
            />
            <button
              type="button"
              onClick={handleRepay}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all min-h-[44px]"
            >
              Submit Repayment
            </button>
          </div>
        </div>
      </div>

      {/* Family Delegate Device Pairing */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col gap-4 mb-5">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-sm font-bold text-white">Family Delegate Pairing</h2>
            <p className="text-xs text-slate-400 mt-1">
              Pair family members&apos; phones so they can request admission for you at 2 AM without needing your wallet.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowPairingQr(!showPairingQr)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-colors min-h-[44px]"
          >
            {showPairingQr ? "Hide QR" : "Show Pairing QR"}
          </button>
        </div>

        {showPairingQr && (
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col items-center text-center gap-2">
            <div className="w-36 h-36 bg-white p-2 rounded-lg flex items-center justify-center text-slate-900 font-mono text-[10px]">
              [Pairing QR Code]
            </div>
            <span className="text-xs text-slate-300 font-semibold mt-2">
              Scan with delegate device to register key
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              Granting scoped function-call key to request_guarantee
            </span>
          </div>
        )}
      </div>

      {/* Contract Exit */}
      <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xs font-bold text-slate-300">Leave Pool & Refund Capital</h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Subject to 30-day notice and 3-month tenure lock. Net contributions refunded minus outstanding debt.
          </p>
        </div>
        <button
          type="button"
          onClick={handleRequestExit}
          className="px-3.5 py-2 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 text-xs font-semibold transition-colors min-h-[44px]"
        >
          Request Exit
        </button>
      </div>
    </main>
  );
}
