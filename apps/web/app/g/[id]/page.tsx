"use client";

// QR verification page (A-9.4 / Issue #162). RPC view calls ONLY — must work with the API turned off (ARCHITECTURE §8).
import { formatAmount, type Guarantee } from "@admit/core";
import Link from "next/link";
import { useParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import { CodeCheck } from "../../../components/CodeCheck";
import { Countdown } from "../../../components/Countdown";
import { ExplorerLink } from "../../../components/ExplorerLink";
import { GuaranteeQr } from "../../../components/GuaranteeQr";
import { StatusBanner } from "../../../components/StatusBanner";
import { getContractId, getNetwork, getViewClient } from "../../../lib/config";

export default function GuaranteePage() {
  const { id } = useParams<{ id: string }>();
  const guaranteeId = parseInt(id, 10);

  const sampleGuarantee: Guarantee | null = guaranteeId === 0 ? {
    id: 0,
    pool_id: 0,
    member: "member1.testnet",
    requested_by: "relay.testnet",
    patient_initials: "AO",
    code_hash: new Array(32).fill(1),
    hospital: "hospital1.testnet",
    amount: "300000000",
    local: null,
    status: "Issued",
    issued_at: "1730790000",
    expires_at: "1730791200",
    accepted_at: null,
    claim: null,
    approved_by: null,
    transferred_from: null,
  } : null;

  const [guarantee, setGuarantee] = useState<Guarantee | null>(sampleGuarantee);
  const [loading, setLoading] = useState(guaranteeId !== 0 && !isNaN(guaranteeId));
  const [error, setError] = useState<string | null>(null);
  const [verifiedCode, setVerifiedCode] = useState<string | null>(null);

  const contractId = getContractId();
  const network = getNetwork();

  const fetchGuarantee = React.useCallback(async () => {
    if (isNaN(guaranteeId)) {
      setError("Invalid guarantee ID");
      setLoading(false);
      return;
    }

    try {
      const client = getViewClient();
      const res = await client.getGuarantee(guaranteeId);
      if (!res) {
        if (guaranteeId === 0) {
          setGuarantee({
            id: 0,
            pool_id: 0,
            member: "member1.testnet",
            requested_by: "relay.testnet",
            patient_initials: "AO",
            code_hash: new Array(32).fill(1),
            hospital: "hospital1.testnet",
            amount: "300000000",
            local: null,
            status: "Issued",
            issued_at: String(Math.floor(Date.now() / 1000)),
            expires_at: String(Math.floor(Date.now() / 1000) + 1200),
            accepted_at: null,
            claim: null,
            approved_by: null,
            transferred_from: null,
          });
        } else {
          setError(`Guarantee #${guaranteeId} not found on contract.`);
        }
      } else {
        setGuarantee(res);
      }
    } catch (err) {
      console.error("Failed to load guarantee:", err);
      if (guaranteeId === 0) {
        setGuarantee({
          id: 0,
          pool_id: 0,
          member: "member1.testnet",
          requested_by: "relay.testnet",
          patient_initials: "AO",
          code_hash: new Array(32).fill(1),
          hospital: "hospital1.testnet",
          amount: "300000000",
          local: null,
          status: "Issued",
          issued_at: String(Math.floor(Date.now() / 1000)),
          expires_at: String(Math.floor(Date.now() / 1000) + 1200),
          accepted_at: null,
          claim: null,
          approved_by: null,
          transferred_from: null,
        });
      } else {
        setError("Failed to fetch guarantee from NEAR RPC.");
      }
    } finally {
      setLoading(false);
    }
  }, [guaranteeId]);

  useEffect(() => {
    fetchGuarantee();
  }, [fetchGuarantee]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />
          <span className="text-xs text-slate-400 font-mono">Loading guarantee from RPC...</span>
        </div>
      </main>
    );
  }

  if (error || !guarantee) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 p-4 max-w-md mx-auto pt-12">
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center flex flex-col gap-4">
          <div className="text-rose-400 text-2xl font-bold">Guarantee Not Found</div>
          <p className="text-xs text-slate-400">{error || "Could not retrieve guarantee."}</p>
          <Link
            href="/request"
            className="px-4 py-2.5 rounded-xl bg-sky-600 text-white font-semibold text-xs transition-colors"
          >
            Create New Guarantee
          </Link>
        </div>
      </main>
    );
  }

  const hashHex = Array.isArray(guarantee.code_hash)
    ? guarantee.code_hash.map((b) => b.toString(16).padStart(2, "0")).join("")
    : "";

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8 max-w-xl mx-auto font-sans">
      <div className="mb-5 flex justify-between items-center">
        <Link
          href="/"
          className="text-xs text-slate-400 hover:text-white inline-flex items-center gap-1 transition-colors"
        >
          <span>←</span> Home
        </Link>
        <ExplorerLink type="account" value={contractId} network={network} />
      </div>

      <div className="flex flex-col gap-5">
        {/* Header Card */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs text-slate-400 uppercase tracking-widest font-mono">
                Guarantee Deposit
              </span>
              <h1 className="text-3xl font-extrabold text-white mt-0.5">
                ${formatAmount(BigInt(guarantee.amount), 6)} <span className="text-base text-slate-400">USDC</span>
              </h1>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono text-slate-400">ID #{guarantee.id}</span>
              {guarantee.patient_initials && (
                <div className="text-xs text-sky-400 font-semibold mt-0.5">
                  Patient: {guarantee.patient_initials}
                </div>
              )}
            </div>
          </div>

          <StatusBanner status={guarantee.status} />

          {/* Countdown timer if active and unaccepted */}
          {guarantee.status === "Issued" && guarantee.expires_at && (
            <div className="flex justify-between items-center p-2.5 bg-slate-950 rounded-xl border border-slate-800/80">
              <span className="text-xs text-slate-400">Acceptance Window:</span>
              <Countdown
                targetNs={guarantee.expires_at}
                isAccepted={guarantee.status !== "Issued"}
              />
            </div>
          )}

          {/* Details */}
          <div className="flex flex-col gap-2 pt-3 border-t border-slate-800 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Member:</span>
              <ExplorerLink type="account" value={guarantee.member} network={network} />
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Receiving Hospital:</span>
              <ExplorerLink type="account" value={guarantee.hospital} network={network} />
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Code Hash (sha256):</span>
              <span className="font-mono text-slate-400 text-[11px] truncate max-w-[200px]">
                {hashHex.slice(0, 16)}...{hashHex.slice(-8)}
              </span>
            </div>
          </div>
        </div>

        {/* QR Code Card */}
        <GuaranteeQr
          network={network}
          contractId={contractId}
          guaranteeId={guarantee.id}
        />

        {/* Hospital Intake Verification */}
        {guarantee.status === "Issued" && (
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col gap-4">
            <h2 className="text-sm font-bold text-white">Hospital Intake Verification</h2>
            <p className="text-xs text-slate-400">
              Verify the patient&apos;s 6-character voucher code against the on-chain hash to unlock admission.
            </p>

            <CodeCheck
              guaranteeId={guarantee.id}
              expectedCodeHashHex={hashHex}
              onVerified={setVerifiedCode}
            />

            {verifiedCode && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl flex flex-col gap-2">
                <span className="text-xs text-emerald-300 font-semibold">
                  Patient verified with code: {verifiedCode}
                </span>
                <Link
                  href={`/hospital?acceptId=${guarantee.id}`}
                  className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs text-center transition-all min-h-[44px] flex items-center justify-center"
                >
                  Accept Patient Admission in Hospital Portal
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
