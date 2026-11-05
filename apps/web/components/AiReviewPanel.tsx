"use client";

import type { AiReview } from "@admit/core";

export interface AiReviewPanelProps {
  review: AiReview;
}

export function AiReviewPanel({ review }: AiReviewPanelProps) {
  const hashHex = Array.isArray(review.report_hash)
    ? review.report_hash.map((b) => b.toString(16).padStart(2, "0")).join("")
    : "";

  return (
    <div
      data-testid="ai-review-panel"
      className="p-3.5 bg-slate-950/80 rounded-xl border border-amber-500/30 flex flex-col gap-2 text-xs"
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold text-amber-400 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          AI Bill Review (Advisory Only)
        </span>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-950/40 text-amber-300 border border-amber-800/40">
          {review.flagged_lines} {review.flagged_lines === 1 ? "flagged item" : "flagged items"}
        </span>
      </div>

      <div className="text-slate-200 font-medium">
        {review.verdict}
      </div>

      <div className="flex flex-col gap-1 text-[11px] text-slate-400 font-mono bg-slate-900/60 p-2 rounded-lg border border-slate-800">
        <div className="flex justify-between items-center">
          <span className="text-slate-500">TEE Signer:</span>
          <span className="text-slate-300 truncate max-w-[200px]" title={review.signing_address}>
            {review.signing_address}
          </span>
        </div>
        {hashHex && (
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Report Hash:</span>
            <span className="text-slate-300 truncate max-w-[200px]" title={hashHex}>
              {hashHex.slice(0, 16)}...
            </span>
          </div>
        )}
      </div>

      <div className="text-[10px] text-slate-500 italic">
        Advisory benchmark against cited reference rates. Final adjustments are set solely by council adjudication.
      </div>
    </div>
  );
}
