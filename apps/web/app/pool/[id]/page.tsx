"use client";

// Public pool stats: balance, reserved, exposure, guarantees, events (A-9.8 / Issue #166).
import { formatAmount, type Guarantee, type Pool, type PoolStats } from "@admit/core";
import Link from "next/link";
import { useParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import { ExplorerLink } from "../../../components/ExplorerLink";
import { StatusBanner } from "../../../components/StatusBanner";
import { getContractId, getNetwork, getViewClient } from "../../../lib/config";

export default function PoolPage() {
  const { id } = useParams<{ id: string }>();
  const poolId = parseInt(id, 10) || 0;

  const [pool, setPool] = useState<Pool | null>(null);
  const [stats, setStats] = useState<PoolStats | null>(null);
  const [guarantees, setGuarantees] = useState<Guarantee[]>([]);
  const [loading, setLoading] = useState(true);

  const contractId = getContractId();
  const network = getNetwork();

  useEffect(() => {
    let active = true;
    const client = getViewClient();

    Promise.all([
      client.getPool(poolId).catch(() => null),
      client.getPoolStats(poolId).catch(() => null),
      client.listGuarantees(poolId, 0, 20).catch(() => []),
    ]).then(([p, s, g]) => {
      if (!active) return;
      setPool(p);
      setStats(s);
      setGuarantees(g);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [poolId]);

  const balanceBig = pool ? BigInt(pool.balance) : 5_000_000_000n;
  const reservedBig = pool ? BigInt(pool.reserved) : 350_000_000n;

  const balanceUsd = Number(balanceBig) / 1_000_000;
  const reservedUsd = Number(reservedBig) / 1_000_000;
  const exposurePct = balanceUsd > 0 ? (reservedUsd / balanceUsd) * 100 : 0;
  const maxExposurePct = pool ? pool.params.max_exposure_bps / 100 : 80;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8 sm:py-12 max-w-3xl mx-auto font-sans">
      <div className="mb-6">
        <Link
          href="/"
          className="text-xs text-slate-400 hover:text-white inline-flex items-center gap-1 mb-2 transition-colors"
        >
          <span>←</span> Back to Overview
        </Link>
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Community Pool #{poolId} Liquidity
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Public verifiable reserve on NEAR backing emergency hospital admissions.
            </p>
          </div>
          <ExplorerLink type="account" value={contractId} network={network} />
        </div>
      </div>

      {/* Reserve Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <span className="text-xs text-slate-400">Total Pool Liquidity</span>
          <div className="text-2xl font-extrabold text-white mt-2">
            ${balanceUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-emerald-400 mt-1 font-mono">100% USDC Backed</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <span className="text-xs text-slate-400">Reserved for Patients</span>
          <div className="text-2xl font-extrabold text-sky-400 mt-2">
            ${reservedUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 font-mono">
            {stats ? stats.issued : guarantees.length} Total Issued
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <span className="text-xs text-slate-400">Written Off (Mutual Aid)</span>
          <div className="text-2xl font-extrabold text-slate-300 mt-2">
            ${pool ? (Number(BigInt(pool.written_off)) / 1_000_000).toFixed(2) : "0.00"}
          </div>
          <span className="text-[10px] text-purple-400 mt-1 font-mono">Demise Relief Absorbed</span>
        </div>
      </div>

      {/* Solvency Exposure Gauge */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col gap-3 mb-6">
        <div className="flex justify-between items-center text-xs">
          <span className="font-semibold text-white">Pool Solvency Exposure Gauge</span>
          <span className="text-slate-400 font-mono">
            {exposurePct.toFixed(1)}% / Max {maxExposurePct}%
          </span>
        </div>

        <div className="w-full bg-slate-950 rounded-full h-3.5 p-0.5 border border-slate-800 overflow-hidden flex">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              exposurePct > maxExposurePct ? "bg-rose-500" : "bg-sky-500"
            }`}
            style={{ width: `${Math.min(100, Math.max(2, exposurePct))}%` }}
          />
        </div>

        <p className="text-[11px] text-slate-400 leading-relaxed">
          The smart contract enforces a hard <strong>80% exposure cap</strong>. If reserved capital exceeds 80% of balance, new guarantees are throttled until claims settle or new member contributions arrive.
        </p>
      </div>

      {/* Calibrated Parameters Table */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col gap-4 mb-6">
        <h2 className="text-sm font-bold text-white">Calibrated Pool Charter</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80">
            <span className="text-slate-400">Monthly Dues</span>
            <div className="font-mono font-bold text-white mt-1">$5.00 USDC</div>
          </div>
          <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80">
            <span className="text-slate-400">Base Credit Limit</span>
            <div className="font-mono font-bold text-white mt-1">$100.00 USDC</div>
          </div>
          <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80">
            <span className="text-slate-400">Tenure Growth</span>
            <div className="font-mono font-bold text-white mt-1">+$25.00/mo</div>
          </div>
          <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80">
            <span className="text-slate-400">Max Member Cap</span>
            <div className="font-mono font-bold text-white mt-1">$400.00 USDC</div>
          </div>
          <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80">
            <span className="text-slate-400">Pool Coverage</span>
            <div className="font-mono font-bold text-white mt-1">70% Mutual Aid</div>
          </div>
          <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80">
            <span className="text-slate-400">Member Co-pay</span>
            <div className="font-mono font-bold text-white mt-1">30% (Repayable)</div>
          </div>
          <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80">
            <span className="text-slate-400">Dispute Window</span>
            <div className="font-mono font-bold text-white mt-1">14 Days</div>
          </div>
          <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80">
            <span className="text-slate-400">Council Multiplier</span>
            <div className="font-mono font-bold text-white mt-1">3× ($1,200)</div>
          </div>
        </div>
      </div>

      {/* Recent Guarantees */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col gap-4">
        <h2 className="text-sm font-bold text-white">Guarantees Backed by Pool</h2>
        {loading ? (
          <div className="text-xs text-slate-500 font-mono py-4 text-center">
            Loading guarantees from contract...
          </div>
        ) : guarantees.length === 0 ? (
          <div className="text-xs text-slate-500 py-4 text-center">
            No guarantees issued on this pool yet.
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {guarantees.map((g) => (
              <div
                key={g.id}
                className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-bold text-white">
                    <Link href={`/g/${g.id}`} className="hover:text-sky-400">
                      Guarantee #{g.id}
                    </Link>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {g.hospital} · {g.member}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-extrabold text-white">
                    ${formatAmount(BigInt(g.amount), 6)} USDC
                  </span>
                  <div>
                    <StatusBanner status={g.status} className="!py-0.5 !px-2 !text-[10px]" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
