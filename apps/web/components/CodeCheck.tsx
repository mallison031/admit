// Hospital 6-char verification code checker (A-9.3)
import { codeHash } from "@admit/core";
import React, { useState } from "react";

export interface CodeCheckProps {
  guaranteeId: number;
  expectedCodeHashHex: string; // 64 hex chars
  onVerified?: (code: string) => void;
  disabled?: boolean;
}

export function CodeCheck({
  guaranteeId,
  expectedCodeHashHex,
  onVerified,
  disabled = false,
}: CodeCheckProps) {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "valid" | "invalid">("idle");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    setCode(raw);
    setStatus("idle");
  };

  const handleVerify = async () => {
    if (code.length !== 6) {
      setStatus("invalid");
      return;
    }

    try {
      const hashBytes = await codeHash(code, guaranteeId);
      const computedHex = hashBytes
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
        .toLowerCase();

      const expected = expectedCodeHashHex.toLowerCase().replace(/^0x/, "");

      if (computedHex === expected) {
        setStatus("valid");
        onVerified?.(code);
      } else {
        setStatus("invalid");
      }
    } catch {
      setStatus("invalid");
    }
  };

  return (
    <div className="w-full flex flex-col gap-2.5 p-4 rounded-xl bg-slate-900 border border-slate-800 font-sans">
      <label htmlFor="check-code-input" className="text-xs font-semibold text-slate-200">
        Patient Verification Code (6 Characters)
      </label>

      <div className="flex gap-2">
        <input
          id="check-code-input"
          type="text"
          value={code}
          onChange={handleInputChange}
          placeholder="e.g. 7K2M9X"
          disabled={disabled}
          maxLength={6}
          className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-center text-lg font-mono font-bold tracking-widest text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 uppercase disabled:opacity-50"
        />
        <button
          type="button"
          onClick={handleVerify}
          disabled={disabled || code.length !== 6}
          className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 active:scale-95 text-white text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Verify
        </button>
      </div>

      {status === "valid" && (
        <div
          role="status"
          className="text-xs font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-3 py-2 rounded-lg flex items-center gap-1.5"
        >
          <span className="text-base">✓</span> Verification code confirmed! Patient matches guarantee.
        </div>
      )}

      {status === "invalid" && (
        <div
          role="alert"
          className="text-xs font-semibold text-rose-400 bg-rose-950/40 border border-rose-800/40 px-3 py-2 rounded-lg flex items-center gap-1.5"
        >
          <span className="text-base">✗</span> Code does not match this guarantee. Check patient voucher.
        </div>
      )}
    </div>
  );
}
