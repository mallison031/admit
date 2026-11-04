import Link from "next/link";
import React from "react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500/30 selection:text-white">
      {/* Hero Section */}
      <section className="relative px-4 pt-12 pb-16 sm:px-6 sm:pt-20 sm:pb-24 max-w-4xl mx-auto text-center flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold mb-6">
          <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
          <span>Instant Healthcare Guarantees on NEAR</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white max-w-2xl leading-tight sm:leading-tight">
          Emergency hospital admission,{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400">
            guaranteed instantly.
          </span>
        </h1>

        <p className="mt-5 text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed">
          Emergency hospitals routinely turn away critical patients unless a cash deposit is paid upfront. Families face catastrophic delays while scrambling for cash or high-interest emergency loans.
        </p>

        {/* Primary Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3 w-full sm:w-auto justify-center">
          <Link
            href="/request"
            className="px-6 py-3.5 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-95 text-white font-semibold text-sm sm:text-base transition-all shadow-lg shadow-sky-600/25 flex items-center justify-center gap-2"
          >
            <span>Request Guarantee</span>
            <span aria-hidden="true">→</span>
          </Link>
          <Link
            href="/member"
            className="px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-semibold text-sm sm:text-base transition-all flex items-center justify-center"
          >
            Member Dashboard
          </Link>
          <Link
            href="/pool/0"
            className="px-6 py-3.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/80 text-slate-400 hover:text-slate-200 font-semibold text-sm sm:text-base transition-all flex items-center justify-center"
          >
            Pool Reserve
          </Link>
        </div>
      </section>

      {/* How It Works (3 Steps) */}
      <section className="px-4 py-12 sm:px-6 max-w-4xl mx-auto w-full border-t border-slate-800/60">
        <div className="text-center mb-10">
          <h2 className="text-xl sm:text-2xl font-bold text-white">How Admit Works</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1.5">
            Zero gas tokens or seed phrases required at the emergency room desk.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1 */}
          <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/80 flex flex-col gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 font-mono font-bold flex items-center justify-center text-sm">
              1
            </div>
            <h3 className="font-semibold text-white text-base">One-Tap Request</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Member or designated family delegate requests an emergency guarantee. Generates a 6-character code in 3 seconds via sponsored NEP-366 meta-transactions.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/80 flex flex-col gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono font-bold flex items-center justify-center text-sm">
              2
            </div>
            <h3 className="font-semibold text-white text-base">Immediate Admission</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Hospital admissions desk verifies the code on-chain. Capital is reserved from the community pool, admitting the patient with zero financial delay.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/80 flex flex-col gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-mono font-bold flex items-center justify-center text-sm">
              3
            </div>
            <h3 className="font-semibold text-white text-base">Mutual Aid Settlement</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Upon discharge, hospital claims verified bill amount. Community pool covers 70% of the cost, member repays 30% gradually, with 14-day dispute safety.
            </p>
          </div>
        </div>
      </section>

      {/* Portals Grid */}
      <section className="px-4 py-10 sm:px-6 max-w-4xl mx-auto w-full border-t border-slate-800/60 mb-12">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider text-center mb-6">
          Access Portals
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <Link
            href="/request"
            className="p-3.5 rounded-xl bg-slate-900/40 hover:bg-slate-800/60 border border-slate-800 transition-colors"
          >
            <div className="text-xs font-semibold text-sky-400">Emergency Desk</div>
            <div className="text-[11px] text-slate-400 mt-0.5">/request</div>
          </Link>
          <Link
            href="/hospital"
            className="p-3.5 rounded-xl bg-slate-900/40 hover:bg-slate-800/60 border border-slate-800 transition-colors"
          >
            <div className="text-xs font-semibold text-emerald-400">Hospital Intake</div>
            <div className="text-[11px] text-slate-400 mt-0.5">/hospital</div>
          </Link>
          <Link
            href="/member"
            className="p-3.5 rounded-xl bg-slate-900/40 hover:bg-slate-800/60 border border-slate-800 transition-colors"
          >
            <div className="text-xs font-semibold text-indigo-400">Member Portal</div>
            <div className="text-[11px] text-slate-400 mt-0.5">/member</div>
          </Link>
          <Link
            href="/council"
            className="p-3.5 rounded-xl bg-slate-900/40 hover:bg-slate-800/60 border border-slate-800 transition-colors"
          >
            <div className="text-xs font-semibold text-amber-400">Council Queue</div>
            <div className="text-[11px] text-slate-400 mt-0.5">/council</div>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-900 py-6 px-4 text-center text-xs text-slate-500">
        Admit Protocol · Built for NEAR Hackathon · Decentralized Emergency Hospital Guarantees
      </footer>
    </main>
  );
}
