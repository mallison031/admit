"use client";

// Request a guarantee — 2am requester flow on a delegate device: hospital, amount → code + QR (A-9.3 / Issue #161).
import { calls, codeHash, generateCode, parseAmount, signDelegate } from "@admit/core";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { AmountInput } from "../../components/AmountInput";
import { GuaranteeQr } from "../../components/GuaranteeQr";
import { getContractId, getNetwork, getViewClient } from "../../lib/config";
import { getOrCreateDeviceKey } from "../../lib/device-key";
import { relay } from "../../lib/relay";

interface IssuedResult {
  guaranteeId: number;
  code: string;
  amount: string;
  hospital: string;
  txHash: string;
}

export default function RequestPage() {
  const [memberAccount, setMemberAccount] = useState("member1.testnet");
  const [hospitalAccount, setHospitalAccount] = useState("hospital1.testnet");
  const [amountUsd, setAmountUsd] = useState("100.00");
  const [patientInitials, setPatientInitials] = useState("");
  const [maxLimitUsd, setMaxLimitUsd] = useState("400.00");
  const [hospitalsList, setHospitalsList] = useState<string[]>([
    "hospital1.testnet",
    "hospital2.testnet",
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IssuedResult | null>(null);

  const contractId = getContractId();
  const network = getNetwork();

  // Load member limit and hospitals from chain on mount
  useEffect(() => {
    let active = true;
    const client = getViewClient();

    client
      .getPool(0)
      .then((pool) => {
        if (active && pool && pool.hospitals.length > 0) {
          setHospitalsList(pool.hospitals.map((h) => h.account));
        }
      })
      .catch(() => {
        // Fall back to default testnet hospital accounts
      });

    client
      .getLimit(0, memberAccount)
      .then((limitView) => {
        if (active && limitView) {
          const maxUsd = (Number(BigInt(limitView.limit)) / 1_000_000).toFixed(2);
          setMaxLimitUsd(maxUsd);
        }
      })
      .catch(() => {
        // Use default limit display if account not on chain
      });

    return () => {
      active = false;
    };
  }, [memberAccount]);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const code = generateCode();
      const amountUnits = parseAmount(amountUsd, 6).toString();

      // Estimate or fetch next guarantee ID (or derive from pool stats)
      const stats = await getViewClient().getPoolStats(0).catch(() => ({ issued: 0 }));
      const nextId = stats.issued + 1;

      // Compute code hash: sha256(code ‖ id)
      const hashBytes = await codeHash(code, nextId);

      // Get or create device key
      const deviceKey = await getOrCreateDeviceKey();

      // Build change call
      const call = calls.requestGuarantee({
        pool_id: 0,
        member: memberAccount,
        hospital: hospitalAccount,
        amount: amountUnits,
        code_hash: hashBytes,
        patient_initials: patientInitials.trim() ? patientInitials.trim().slice(0, 4) : null,
      });

      // Sign NEP-366 delegate action
      const signedRes = await signDelegate({
        senderId: deviceKey.accountId,
        receiverId: contractId,
        call,
        privateKey: deviceKey.privateKey,
        maxBlockHeight: 1_000_000_000n,
        nonce: 1n,
      });

      // Submit via relayer
      const relayRes = await relay(signedRes.signedDelegate);

      setResult({
        guaranteeId: nextId,
        code,
        amount: amountUsd,
        hospital: hospitalAccount,
        txHash: relayRes.txHash,
      });
    } catch (err) {
      console.error("Request failed:", err);
      setError(err instanceof Error ? err.message : "Failed to issue guarantee");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8 sm:py-12 max-w-xl mx-auto font-sans">
      <div className="mb-6">
        <Link
          href="/"
          className="text-xs text-slate-400 hover:text-white inline-flex items-center gap-1 mb-3 transition-colors"
        >
          <span>←</span> Back to Overview
        </Link>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Emergency Guarantee Request
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Issue an instant admission deposit voucher for hospital intake. Zero gas tokens required.
        </p>
      </div>

      {result ? (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col gap-6 text-center animate-in fade-in zoom-in-95 duration-200">
          <div className="flex flex-col items-center">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">
              ✓ Guarantee Issued Successfully
            </span>
            <div className="text-4xl sm:text-5xl font-mono font-black text-white tracking-widest bg-slate-950 px-6 py-3 rounded-xl border border-slate-800">
              {result.code}
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Present this 6-character code to the admissions desk.
            </p>
          </div>

          <GuaranteeQr
            network={network}
            contractId={contractId}
            guaranteeId={result.guaranteeId}
          />

          <div className="p-3 bg-slate-950 rounded-xl text-xs text-slate-300 text-left border border-slate-800/80 flex flex-col gap-1.5">
            <div className="flex justify-between">
              <span className="text-slate-400">Guarantee ID:</span>
              <span className="font-mono text-white">#{result.guaranteeId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Reserved Amount:</span>
              <span className="font-mono text-white">${result.amount} USDC</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Hospital:</span>
              <span className="font-mono text-white">{result.hospital}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Link
              href={`/g/${result.guaranteeId}`}
              className="w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm transition-all"
            >
              View Live Guarantee #{result.guaranteeId}
            </Link>
            <button
              type="button"
              onClick={() => setResult(null)}
              className="w-full py-2.5 text-xs text-slate-400 hover:text-white transition-colors"
            >
              Issue Another Guarantee
            </button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={handleRequest}
          className="p-5 sm:p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col gap-5"
        >
          {error && (
            <div
              role="alert"
              className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-xs"
            >
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Member account */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="member-select" className="text-xs font-semibold text-slate-300">
              Member Account
            </label>
            <input
              id="member-select"
              type="text"
              value={memberAccount}
              onChange={(e) => setMemberAccount(e.target.value)}
              placeholder="e.g. member1.testnet"
              required
              className="bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Hospital selector */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="hospital-select" className="text-xs font-semibold text-slate-300">
              Receiving Hospital
            </label>
            <select
              id="hospital-select"
              value={hospitalAccount}
              onChange={(e) => setHospitalAccount(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              {hospitalsList.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>

          {/* Amount Input */}
          <AmountInput
            value={amountUsd}
            onChange={setAmountUsd}
            max={maxLimitUsd}
            label="Deposit Amount (USDC)"
            id="request-amount"
          />

          {/* Patient Initials */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-xs">
              <label htmlFor="initials-input" className="font-semibold text-slate-300">
                Patient Initials (Optional)
              </label>
              <span className="text-slate-500">Max 4 chars</span>
            </div>
            <input
              id="initials-input"
              type="text"
              maxLength={4}
              value={patientInitials}
              onChange={(e) => setPatientInitials(e.target.value.toUpperCase())}
              placeholder="e.g. J.D."
              className="bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white uppercase font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !amountUsd || parseFloat(amountUsd) <= 0}
            className="w-full mt-2 py-3.5 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-95 text-white font-semibold text-sm sm:text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-sky-600/20 flex items-center justify-center gap-2 min-h-[48px]"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Signing & Relaying...
              </span>
            ) : (
              <span>Generate Emergency Guarantee</span>
            )}
          </button>
        </form>
      )}
    </main>
  );
}
