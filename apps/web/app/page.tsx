import Link from "next/link";
import React from "react";
import { InteractiveEmergencyDemo } from "../components/InteractiveEmergencyDemo";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500/30 selection:text-white">
      {/* 1. Hero Section */}
      <section className="px-4 pt-16 pb-12 sm:px-6 sm:pt-24 sm:pb-20 max-w-6xl mx-auto flex flex-col items-center text-center">
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white max-w-4xl leading-[1.08]">
          Treatment Starts Before Anyone Pays.
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-2xl leading-relaxed">
          Instant emergency hospital-deposit guarantees from community pools on NEAR. Zero wallet required for triage nurses, zero gas tokens for patients.
        </p>

        {/* Primary Action Row */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 w-full sm:w-auto justify-center">
          <Link
            href="/request"
            className="px-7 py-4 rounded-2xl bg-sky-600 hover:bg-sky-500 active:scale-95 text-white font-semibold text-base transition-all shadow-xl shadow-sky-600/25 flex items-center justify-center gap-2"
          >
            <span>Request Emergency Guarantee</span>
            <span aria-hidden="true">→</span>
          </Link>
          <Link
            href="/pool/0"
            className="px-7 py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold text-base transition-all flex items-center justify-center border border-slate-800"
          >
            View Pool Reserves ($1,000 USDC)
          </Link>
        </div>

        {/* Live Interactive Hero Simulation */}
        <div className="mt-14 w-full">
          <InteractiveEmergencyDemo />
        </div>
      </section>

      {/* 2. Sourced Problem Stakes */}
      <section className="px-4 py-16 sm:px-6 max-w-6xl mx-auto w-full">
        <div className="max-w-3xl mb-12">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            The 2:00 AM Upfront Deposit Crisis
          </h2>
          <p className="mt-3 text-base sm:text-lg text-slate-300 leading-relaxed">
            Across much of Nigeria and the developing world, emergency treatment stops before it begins. Private clinics and public hospitals routinely demand cash deposits upfront, leaving families helpless while patients deteriorate in triage rooms.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-7 rounded-3xl bg-slate-900 flex flex-col justify-between gap-6 border border-slate-800/80">
            <div>
              <div className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
                ₦50k – ₦500k
              </div>
              <div className="text-sm font-semibold text-sky-400 mt-2">
                Upfront Cash Gate ($38 – $376)
              </div>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              Deposits demanded before triage staff touch trauma victims or expectant mothers (Sahara Reporters, Daily Trust). High-profile figures have died waiting for deposit clearance.
            </p>
          </div>

          <div className="p-7 rounded-3xl bg-slate-900 flex flex-col justify-between gap-6 border border-slate-800/80">
            <div>
              <div className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
                3 to 5 Days
              </div>
              <div className="text-sm font-semibold text-amber-400 mt-2">
                Crowdfunding Delay vs Hours to Live
              </div>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              GoFundMe and bank transfers take days to coordinate and cash out. Clinical trauma and acute hemorrhage kill within two hours. Emergencies cannot wait for campaigns.
            </p>
          </div>

          <div className="p-7 rounded-3xl bg-slate-900 flex flex-col justify-between gap-6 border border-slate-800/80">
            <div>
              <div className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
                &lt; 2 Minutes
              </div>
              <div className="text-sm font-semibold text-emerald-400 mt-2">
                On-Chain Verification at Triage
              </div>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              Admit replaces cash anxiety with cryptographic proof. Hospital reception scans a QR code, enters 6 characters, and verifies reserves on NEAR RPC without any clinic crypto login.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Product Gallery / Visual Interface Showcase */}
      <section className="px-4 py-16 sm:px-6 max-w-6xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Tested Across the Full Care Journey
          </h2>
          <p className="mt-3 text-base text-slate-300">
            Real screens running against the live NEAR testnet contract.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Card 1: Hospital Intake */}
          <div className="rounded-3xl bg-slate-900 p-6 flex flex-col gap-5 border border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Hospital Intake &amp; QR Verification</h3>
                <p className="text-xs text-slate-400 mt-0.5">Direct RPC view calls · Zero clinic wallet needed</p>
              </div>
              <Link href="/g/0" className="text-xs font-semibold text-sky-400 hover:text-sky-300">
                View Live Page →
              </Link>
            </div>
            <div className="rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center p-4 border border-slate-800/80">
              <img
                src="/screenshots/guarantee.png"
                alt="Hospital QR Intake Interface"
                className="rounded-xl w-full max-h-[380px] object-contain shadow-2xl"
              />
            </div>
          </div>

          {/* Card 2: Revolving Member Credit */}
          <div className="rounded-3xl bg-slate-900 p-6 flex flex-col gap-5 border border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Revolving Member Credit &amp; Top-Up</h3>
                <p className="text-xs text-slate-400 mt-0.5">1Click Defuse quotes from Arbitrum, Base, Solana</p>
              </div>
              <Link href="/member" className="text-xs font-semibold text-sky-400 hover:text-sky-300">
                View Live Page →
              </Link>
            </div>
            <div className="rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center p-4 border border-slate-800/80">
              <img
                src="/screenshots/member.png"
                alt="Member Credit and Cross-chain Top-up"
                className="rounded-xl w-full max-h-[380px] object-contain shadow-2xl"
              />
            </div>
          </div>

          {/* Card 3: Council Dispute Audit & AI Review */}
          <div className="rounded-3xl bg-slate-900 p-6 flex flex-col gap-5 border border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Council Audit &amp; Confidential AI Review</h3>
                <p className="text-xs text-slate-400 mt-0.5">Intel TDX TEE quote hash · Reference tariff check</p>
              </div>
              <Link href="/council" className="text-xs font-semibold text-sky-400 hover:text-sky-300">
                View Live Page →
              </Link>
            </div>
            <div className="rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center p-4 border border-slate-800/80">
              <img
                src="/screenshots/council.png"
                alt="Council Audit and TDX TEE Review Panel"
                className="rounded-xl w-full max-h-[380px] object-contain shadow-2xl"
              />
            </div>
          </div>

          {/* Card 4: Community Pool Reserves */}
          <div className="rounded-3xl bg-slate-900 p-6 flex flex-col gap-5 border border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Community Pool Transparency</h3>
                <p className="text-xs text-slate-400 mt-0.5">Real-time balances, exposure caps, registered clinics</p>
              </div>
              <Link href="/pool/0" className="text-xs font-semibold text-sky-400 hover:text-sky-300">
                View Live Page →
              </Link>
            </div>
            <div className="rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center p-4 border border-slate-800/80">
              <img
                src="/screenshots/pool.png"
                alt="Pool Reserves Dashboard"
                className="rounded-xl w-full max-h-[380px] object-contain shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 4. The 5-Step Protocol Architecture */}
      <section className="px-4 py-16 sm:px-6 max-w-6xl mx-auto w-full">
        <div className="max-w-3xl mb-12">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            How the Protocol Moves Money
          </h2>
          <p className="mt-3 text-base sm:text-lg text-slate-300 leading-relaxed">
            Designed for 2:00 AM clinical emergencies when network delays and wallet friction cost lives.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900 flex flex-col gap-3 border border-slate-800">
            <div className="text-xs font-mono font-bold text-sky-400">STAGE 01</div>
            <h3 className="font-bold text-white text-base">Meta-Tx Request</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Family phone with 0 NEAR signs NEP-366 DelegateAction. Admit relayer wraps it and sponsors gas fees.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 flex flex-col gap-3 border border-slate-800">
            <div className="text-xs font-mono font-bold text-sky-400">STAGE 02</div>
            <h3 className="font-bold text-white text-base">Triage Verification</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Hospital enters 6-character code. Matches on-chain hash. Status locks to Accepted; countdown timer stops.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 flex flex-col gap-3 border border-slate-800">
            <div className="text-xs font-mono font-bold text-sky-400">STAGE 03</div>
            <h3 className="font-bold text-white text-base">Emergency Treatment</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Clinic provides urgent care backed by guaranteed reserve deposit. Patient admitted without upfront cash.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 flex flex-col gap-3 border border-slate-800">
            <div className="text-xs font-mono font-bold text-sky-400">STAGE 04</div>
            <h3 className="font-bold text-white text-base">Confidential AI Audit</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Intel TDX TEE cross-checks medical bills against Ministry tariffs, advising council on redundant fees.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 flex flex-col gap-3 border border-slate-800">
            <div className="text-xs font-mono font-bold text-sky-400">STAGE 05</div>
            <h3 className="font-bold text-white text-base">Revolving Recovery</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Hospital paid in USDC. Member repays their mutual-aid share, immediately restoring their revolving credit.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Mathematical Solvency Proof */}
      <section className="px-4 py-16 sm:px-6 max-w-6xl mx-auto w-full">
        <div className="rounded-3xl bg-slate-900 p-8 sm:p-12 border border-slate-800 flex flex-col lg:flex-row gap-10 items-center">
          <div className="flex-1 flex flex-col gap-5">
            <div className="inline-flex items-center gap-2 text-xs font-mono font-semibold text-emerald-400 uppercase tracking-wider">
              <span>●</span> Monte Carlo Verification (PRD §4 / A-10.3)
            </div>

            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              0.00% Insolvency Across 10,000 Runs
            </h2>

            <p className="text-base text-slate-300 leading-relaxed">
              Admit is not speculative insurance. The contract enforces mathematical exposure caps: pool reservations cannot exceed 80% of reserves. We stress-tested this over 24-month horizons across baseline, epidemic (&quot;bad year&quot;), and exit-wave conditions.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-2xl font-black text-emerald-400 font-mono">0.00%</div>
                <div className="text-xs text-slate-400 mt-1">Normal Insolvency</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-2xl font-black text-emerald-400 font-mono">0.00%</div>
                <div className="text-xs text-slate-400 mt-1">Epidemic Insolvency</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-2xl font-black text-white font-mono">24 Mos</div>
                <div className="text-xs text-slate-400 mt-1">Horizon Tested</div>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-96 rounded-2xl overflow-hidden bg-slate-950 p-4 border border-slate-800">
            <img
              src="/simulation/chart.png"
              alt="Monte Carlo Solvency Simulation Chart"
              className="w-full h-auto rounded-lg object-contain"
            />
            <div className="text-[11px] text-center text-slate-400 mt-2 font-mono">
              Chart generated by scripts/simulate.ts
            </div>
          </div>
        </div>
      </section>

      {/* 6. Access Portals Navigation Grid */}
      <section className="px-4 py-16 sm:px-6 max-w-6xl mx-auto w-full">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-8 text-center sm:text-left">
          Application Portals
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/request"
            className="p-6 rounded-2xl bg-slate-900 hover:bg-slate-800/90 border border-slate-800 transition-all flex flex-col justify-between gap-4 group"
          >
            <div>
              <div className="text-xs font-mono font-semibold text-sky-400 mb-1">FOR FAMILIES &amp; DELEGATES</div>
              <h3 className="font-bold text-white text-lg group-hover:text-sky-300 transition-colors">Emergency Request</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Issue a guaranteed hospital deposit in seconds with zero NEAR in your wallet.
              </p>
            </div>
            <div className="text-xs font-semibold text-sky-400 flex items-center gap-1">
              Open /request →
            </div>
          </Link>

          <Link
            href="/hospital"
            className="p-6 rounded-2xl bg-slate-900 hover:bg-slate-800/90 border border-slate-800 transition-all flex flex-col justify-between gap-4 group"
          >
            <div>
              <div className="text-xs font-mono font-semibold text-emerald-400 mb-1">FOR CLINIC RECEPTION</div>
              <h3 className="font-bold text-white text-lg group-hover:text-emerald-300 transition-colors">Hospital Intake</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Verify patient 6-character codes directly on NEAR RPC. Zero login required.
              </p>
            </div>
            <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
              Open /hospital →
            </div>
          </Link>

          <Link
            href="/member"
            className="p-6 rounded-2xl bg-slate-900 hover:bg-slate-800/90 border border-slate-800 transition-all flex flex-col justify-between gap-4 group"
          >
            <div>
              <div className="text-xs font-mono font-semibold text-indigo-400 mb-1">FOR POOL MEMBERS</div>
              <h3 className="font-bold text-white text-lg group-hover:text-indigo-300 transition-colors">Member Credit</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Monitor revolving credit limits, repay medical shares, and top up via 1Click.
              </p>
            </div>
            <div className="text-xs font-semibold text-indigo-400 flex items-center gap-1">
              Open /member →
            </div>
          </Link>

          <Link
            href="/council"
            className="p-6 rounded-2xl bg-slate-900 hover:bg-slate-800/90 border border-slate-800 transition-all flex flex-col justify-between gap-4 group"
          >
            <div>
              <div className="text-xs font-mono font-semibold text-amber-400 mb-1">FOR SPUTNIK DAO COUNCIL</div>
              <h3 className="font-bold text-white text-lg group-hover:text-amber-300 transition-colors">Council Queue</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Audit disputed bills with advisory Intel TDX TEE confidential tariff checks.
              </p>
            </div>
            <div className="text-xs font-semibold text-amber-400 flex items-center gap-1">
              Open /council →
            </div>
          </Link>
        </div>
      </section>

      {/* 7. Footer */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950 py-12 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-sky-500 flex items-center justify-center text-white font-bold text-xs">+</span>
            <span className="font-bold text-white">Admit Protocol</span>
            <span>· Built at NEAR Hackathon · Social Money Track</span>
          </div>

          <div className="flex flex-wrap gap-6 font-medium">
            <a href="https://github.com/mallison031/admit" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
              GitHub (MIT)
            </a>
            <a href="https://testnet.nearblocks.io/address/pool.admit.testnet" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
              Contract on NearBlocks
            </a>
            <Link href="/pool/0" className="hover:text-white transition-colors">
              Pool 0 State
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}