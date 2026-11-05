"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

export function InteractiveEmergencyDemo() {
  const [role, setRole] = useState<"member" | "hospital">("member");
  const [status, setStatus] = useState<"Issued" | "Accepted">("Issued");
  const [code, setCode] = useState("BAK8PR");
  const [timerSeconds, setTimerSeconds] = useState(1194); // 19m 54s

  useEffect(() => {
    if (status === "Accepted") return;
    const interval = setInterval(() => {
      setTimerSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [status]);

  const formatTimer = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const handleVerify = () => {
    setStatus("Accepted");
  };

  const handleReset = () => {
    setStatus("Issued");
    setTimerSeconds(1200);
    setRole("member");
  };

  return (
    <div className="w-full max-w-3xl mx-auto rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 flex flex-col gap-6 shadow-2xl">
      {/* Mode Selector Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <span className="text-xs uppercase tracking-wider text-sky-400 font-semibold font-mono">
            Interactive Testnet Simulation
          </span>
          <h3 className="text-lg font-bold text-white mt-1">
            The 2:04 AM Emergency Protocol
          </h3>
        </div>

        {/* Role Toggle */}
        <div className="inline-flex p-1 rounded-xl bg-slate-950 border border-slate-800 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setRole("member")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              role === "member"
                ? "bg-sky-600 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            1. Member Request (2:04 AM)
          </button>
          <button
            type="button"
            onClick={() => setRole("hospital")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              role === "hospital"
                ? "bg-sky-600 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            2. Hospital Triage (2:06 AM)
          </button>
        </div>
      </div>

      {/* Screen Body */}
      {role === "member" ? (
        <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
          <div className="flex-1 flex flex-col gap-3">
            <div className="inline-flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs font-semibold text-amber-400">
                {status === "Issued" ? "Guarantee Active · Awaiting Triage Check" : "Guarantee Accepted by Clinic"}
              </span>
            </div>

            <div className="text-2xl font-bold text-white">
              $300.00 <span className="text-sm font-normal text-slate-400">USDC Emergency Deposit</span>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              Signed via paired phone with <strong>0 NEAR</strong>. Relay covers network gas. St. Nicholas Clinic admissions desk can verify instantly on-chain without any account.
            </p>

            <div className="flex flex-wrap gap-2 text-xs text-slate-400 font-mono mt-1">
              <span className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800">
                Hospital: hospital1.testnet
              </span>
              <span className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800">
                Patient: AO
              </span>
              <span className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800">
                Pool: 0 (St. Mark's)
              </span>
            </div>
          </div>

          {/* Ticket Card Preview */}
          <div className="w-full md:w-64 p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center text-center gap-3">
            <div className="text-xs text-slate-400 font-medium">Emergency Intake Code</div>
            <div className="text-3xl font-extrabold tracking-widest font-mono text-sky-400 bg-sky-950/40 px-4 py-2 rounded-xl border border-sky-800/40">
              {code}
            </div>
            <div className="text-xs text-slate-400">
              {status === "Issued" ? (
                <span>Expires in <strong className="text-white font-mono">{formatTimer(timerSeconds)}</strong></span>
              ) : (
                <span className="text-emerald-400 font-semibold">✓ Permanent Admission Locked</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setRole("hospital")}
              className="w-full mt-2 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
            >
              Test Hospital Intake →
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
          <div className="flex-1 flex flex-col gap-3">
            <div className="inline-flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="text-xs font-semibold text-emerald-400">
                Hospital Triage View (Zero Wallet / Zero Login Required)
              </span>
            </div>

            <div className="text-xl font-bold text-white">
              Triage Intake Verification
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              Hospital reception verifies patient guarantees by querying public NEAR RPC views directly. Staff enters the patient&apos;s 6-character code to confirm cryptographic proof.
            </p>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 font-mono">
              <div>Contract: pool.admit.testnet</div>
              <div>Hash Match: sha256(&quot;{code}&quot; ‖ 0) = verified ✓</div>
            </div>
          </div>

          {/* Action Box */}
          <div className="w-full md:w-64 p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-3">
            <label htmlFor="intake-code-input" className="text-xs text-slate-400 font-medium">Verify 6-Char Code</label>
            <input
              id="intake-code-input"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="w-full text-center text-xl font-mono font-bold uppercase tracking-wider bg-slate-900 border border-slate-700 rounded-lg py-2 text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            {status === "Issued" ? (
              <button
                type="button"
                onClick={handleVerify}
                className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-colors shadow-lg shadow-emerald-600/20"
              >
                Accept Guarantee &amp; Admit
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs font-semibold text-emerald-400 text-center">
                  ✓ Patient Admitted Instantly
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs text-slate-400 hover:text-white transition-colors underline text-center"
                >
                  Reset Simulation
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer Details */}
      <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-4 gap-2">
        <span>Runs directly on NEAR Testnet RPC Protocol</span>
        <div className="flex gap-4">
          <Link href="/request" className="text-sky-400 hover:text-sky-300 font-medium">
            Open Full Request Page →
          </Link>
          <Link href="/g/0" className="text-sky-400 hover:text-sky-300 font-medium">
            Open Full Hospital QR Page →
          </Link>
        </div>
      </div>
    </div>
  );
}
