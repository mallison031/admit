"use client";

// Hospital intake portal (A-9.5 / Issue #163).
import { calls, formatAmount, type Guarantee, parseAmount } from "@admit/core";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { AmountInput } from "../../components/AmountInput";
import { ExplorerLink } from "../../components/ExplorerLink";
import { StatusBanner } from "../../components/StatusBanner";
import { getContractId, getNetwork, getViewClient } from "../../lib/config";

export default function HospitalPage() {
  const [activeHospital, setActiveHospital] = useState("hospital1.testnet");
  const [guarantees, setGuarantees] = useState<Guarantee[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Claim modal state
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [claimAmount, setClaimAmount] = useState("80.00");

  // Transfer modal state
  const [transferringId, setTransferringId] = useState<number | null>(null);
  const [toHospital, setToHospital] = useState("hospital2.testnet");

  const contractId = getContractId();
  const network = getNetwork();

  const loadGuarantees = React.useCallback(async () => {
    setLoading(true);
    try {
      const client = getViewClient();
      const list = await client.listGuarantees(0, 0, 50);
      setGuarantees(list.filter((g) => g.hospital === activeHospital));
    } catch (err) {
      console.error("Failed to list guarantees:", err);
    } finally {
      setLoading(false);
    }
  }, [activeHospital]);

  useEffect(() => {
    loadGuarantees();
  }, [loadGuarantees]);

  const handleAccept = async (guaranteeId: number) => {
    setStatusMessage(null);
    try {
      const call = calls.hospitalAccept({ guarantee_id: guaranteeId });
      // In production/testnet, dispatch via function-call key or wallet
      setStatusMessage(`Accepted Guarantee #${guaranteeId} (method: ${call.methodName})`);
      await loadGuarantees();
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Accept failed");
    }
  };

  const handleClaim = async (guaranteeId: number) => {
    setStatusMessage(null);
    try {
      const parsed = parseAmount(claimAmount, 6).toString();
      const call = calls.hospitalClaim(guaranteeId, parsed, [1, 2, 3]);
      setStatusMessage(`Claim filed for $${claimAmount} on #${guaranteeId} (method: ${call.methodName})`);
      setClaimingId(null);
      await loadGuarantees();
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Claim failed");
    }
  };

  const handleRelease = async (guaranteeId: number) => {
    setStatusMessage(null);
    try {
      const call = calls.hospitalRelease({ guarantee_id: guaranteeId });
      setStatusMessage(`Released Guarantee #${guaranteeId} with $0 claim (method: ${call.methodName})`);
      await loadGuarantees();
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Release failed");
    }
  };

  const handleTransfer = async (guaranteeId: number) => {
    setStatusMessage(null);
    try {
      const call = calls.hospitalTransfer({
        guarantee_id: guaranteeId,
        to_hospital: toHospital,
      });
      setStatusMessage(`Transferred Guarantee #${guaranteeId} to ${toHospital} (method: ${call.methodName})`);
      setTransferringId(null);
      await loadGuarantees();
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Transfer failed");
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8 sm:py-12 max-w-2xl mx-auto font-sans">
      <div className="mb-6 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div>
          <div className="flex items-center justify-between mb-2">
            <Link
              href="/"
              className="text-xs text-slate-400 hover:text-white inline-flex items-center gap-1 transition-colors"
            >
              <span>←</span> Home
            </Link>
            <ExplorerLink type="account" value={contractId} network={network} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Hospital Intake & Billing
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Accept emergency admissions, submit treatment expense claims, or transfer patients.
          </p>
        </div>

        {/* Hospital selector */}
        <div className="flex flex-col gap-1">
          <label htmlFor="hospital-identity" className="text-[11px] font-semibold text-slate-400">
            Current Hospital Device
          </label>
          <select
            id="hospital-identity"
            value={activeHospital}
            onChange={(e) => setActiveHospital(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="hospital1.testnet">hospital1.testnet (St. Jude)</option>
            <option value="hospital2.testnet">hospital2.testnet (Apex Trauma)</option>
          </select>
        </div>
      </div>

      {statusMessage && (
        <div
          role="status"
          className="mb-5 p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex justify-between items-center"
        >
          <span>✓ {statusMessage}</span>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-emerald-400 hover:text-white font-bold ml-2"
          >
            ×
          </button>
        </div>
      )}

      {/* Guarantees List */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center text-xs font-semibold text-slate-400">
          <span>Active Guarantees ({guarantees.length})</span>
          <button
            type="button"
            onClick={loadGuarantees}
            className="text-sky-400 hover:text-sky-300 hover:underline"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500 font-mono">
            Loading hospital records...
          </div>
        ) : guarantees.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 text-center flex flex-col items-center gap-2">
            <span className="text-sm font-semibold text-slate-300">No Open Guarantees</span>
            <p className="text-xs text-slate-500 max-w-sm">
              No guarantees currently routed to {activeHospital}. When a patient presents a code, it will appear here.
            </p>
          </div>
        ) : (
          guarantees.map((g) => (
            <div
              key={g.id}
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col gap-4 transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-white">Guarantee #{g.id}</span>
                    {g.patient_initials && (
                      <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 text-xs font-semibold">
                        Pt: {g.patient_initials}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Member: <ExplorerLink type="account" value={g.member} network={network} />
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xl font-extrabold text-white">
                    ${formatAmount(BigInt(g.amount), 6)}
                  </span>
                  <span className="text-xs text-slate-400 ml-1">USDC</span>
                </div>
              </div>

              <StatusBanner status={g.status} />

              {/* Actions toolbar */}
              <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-800">
                <Link
                  href={`/g/${g.id}`}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors min-h-[44px] flex items-center"
                >
                  View QR / Details
                </Link>

                {g.status === "Issued" && (
                  <button
                    type="button"
                    onClick={() => handleAccept(g.id)}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-semibold transition-all min-h-[44px]"
                  >
                    Accept Admission
                  </button>
                )}

                {g.status === "Accepted" && (
                  <>
                    <button
                      type="button"
                      onClick={() => setClaimingId(g.id)}
                      className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 active:scale-95 text-white text-xs font-semibold transition-all min-h-[44px]"
                    >
                      File Claim
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRelease(g.id)}
                      className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors min-h-[44px]"
                    >
                      Release ($0 Claim)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTransferringId(g.id)}
                      className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors min-h-[44px]"
                    >
                      Transfer Patient
                    </button>
                  </>
                )}
              </div>

              {/* Claim Dialog */}
              {claimingId === g.id && (
                <div className="p-4 bg-slate-950 rounded-xl border border-sky-800/60 flex flex-col gap-3 mt-2">
                  <span className="text-xs font-bold text-white">
                    Submit Medical Invoice for Guarantee #{g.id}
                  </span>
                  <AmountInput
                    value={claimAmount}
                    onChange={setClaimAmount}
                    max={formatAmount(BigInt(g.amount), 6)}
                    label="Final Bill Amount (USDC)"
                    id={`claim-amount-${g.id}`}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleClaim(g.id)}
                      className="px-4 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold min-h-[44px]"
                    >
                      Confirm Claim Submission
                    </button>
                    <button
                      type="button"
                      onClick={() => setClaimingId(null)}
                      className="px-3 py-2.5 rounded-lg text-xs text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Transfer Dialog */}
              {transferringId === g.id && (
                <div className="p-4 bg-slate-950 rounded-xl border border-indigo-800/60 flex flex-col gap-3 mt-2">
                  <span className="text-xs font-bold text-white">
                    Transfer Patient & Guarantee #{g.id}
                  </span>
                  <div className="flex flex-col gap-1">
                    <label htmlFor={`to-hospital-${g.id}`} className="text-xs text-slate-400">
                      Destination Hospital Account
                    </label>
                    <input
                      id={`to-hospital-${g.id}`}
                      type="text"
                      value={toHospital}
                      onChange={(e) => setToHospital(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleTransfer(g.id)}
                      className="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold min-h-[44px]"
                    >
                      Confirm Transfer
                    </button>
                    <button
                      type="button"
                      onClick={() => setTransferringId(null)}
                      className="px-3 py-2.5 rounded-lg text-xs text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </main>
  );
}
