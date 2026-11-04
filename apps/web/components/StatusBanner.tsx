// Guarantee status banner (A-9.3)
import type { GStatus } from "@admit/core";
import React from "react";

export interface StatusBannerProps {
  status: GStatus;
  className?: string;
}

interface StatusConfig {
  label: string;
  badgeBg: string;
  badgeText: string;
  bannerBg: string;
  bannerBorder: string;
  description: string;
}

const STATUS_CONFIGS: Record<GStatus, StatusConfig> = {
  Issued: {
    label: "Issued (Active)",
    badgeBg: "bg-emerald-500/20",
    badgeText: "text-emerald-400",
    bannerBg: "bg-emerald-950/20",
    bannerBorder: "border-emerald-800/40",
    description: "Deposit is locked in the pool. Hospital can accept admission.",
  },
  Accepted: {
    label: "Accepted by Hospital",
    badgeBg: "bg-emerald-500/20",
    badgeText: "text-emerald-400",
    bannerBg: "bg-emerald-950/20",
    bannerBorder: "border-emerald-800/40",
    description: "Patient admitted. Deposit is guaranteed until treatment conclusion.",
  },
  PendingCouncil: {
    label: "Pending Council Approval",
    badgeBg: "bg-amber-500/20",
    badgeText: "text-amber-400",
    bannerBg: "bg-amber-950/20",
    bannerBorder: "border-amber-800/40",
    description: "Amount exceeds instant tier. Awaiting Sputnik DAO council confirmation.",
  },
  Claimed: {
    label: "Claim Filed",
    badgeBg: "bg-sky-500/20",
    badgeText: "text-sky-400",
    bannerBg: "bg-sky-950/20",
    bannerBorder: "border-sky-800/40",
    description: "Hospital filed settlement invoice. Dispute window is open.",
  },
  Disputed: {
    label: "Disputed by Member",
    badgeBg: "bg-rose-500/20",
    badgeText: "text-rose-400",
    bannerBg: "bg-rose-950/20",
    bannerBorder: "border-rose-800/40",
    description: "Member flagged claim disparity. Escalated to council review.",
  },
  Settled: {
    label: "Settled & Paid",
    badgeBg: "bg-slate-500/20",
    badgeText: "text-slate-300",
    bannerBg: "bg-slate-900/40",
    bannerBorder: "border-slate-800",
    description: "Tokens transferred to hospital. Guarantee is fulfilled and closed.",
  },
  Released: {
    label: "Released",
    badgeBg: "bg-slate-500/20",
    badgeText: "text-slate-300",
    bannerBg: "bg-slate-900/40",
    bannerBorder: "border-slate-800",
    description: "Hospital discharged patient with zero claim. Reservation returned to pool.",
  },
  Expired: {
    label: "Expired",
    badgeBg: "bg-slate-500/20",
    badgeText: "text-slate-400",
    bannerBg: "bg-slate-900/40",
    bannerBorder: "border-slate-800",
    description: "Guarantee was not accepted within TTL and reservation lapsed.",
  },
  Rejected: {
    label: "Rejected by Council",
    badgeBg: "bg-rose-500/20",
    badgeText: "text-rose-400",
    bannerBg: "bg-rose-950/20",
    bannerBorder: "border-rose-800/40",
    description: "Council declined high-tier request. Capital unlocked.",
  },
  WrittenOff: {
    label: "Written Off (Demise)",
    badgeBg: "bg-purple-500/20",
    badgeText: "text-purple-400",
    bannerBg: "bg-purple-950/20",
    bannerBorder: "border-purple-800/40",
    description: "Member death reported. Remaining debt absorbed by mutual aid pool.",
  },
};

export function StatusBanner({ status, className = "" }: StatusBannerProps) {
  const config = STATUS_CONFIGS[status] ?? {
    label: status,
    badgeBg: "bg-slate-500/20",
    badgeText: "text-slate-400",
    bannerBg: "bg-slate-900/40",
    bannerBorder: "border-slate-800",
    description: "",
  };

  return (
    <div
      role="status"
      className={`p-3.5 rounded-xl border flex flex-col gap-1.5 ${config.bannerBg} ${config.bannerBorder} ${className}`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${config.badgeBg} ${config.badgeText}`}
        >
          {config.label}
        </span>
        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">
          Status
        </span>
      </div>
      {config.description && (
        <p className="text-xs text-slate-300 leading-relaxed">
          {config.description}
        </p>
      )}
    </div>
  );
}
