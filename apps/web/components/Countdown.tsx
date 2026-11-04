// Countdown timer component (A-9.4)
import React, { useEffect, useState } from "react";

export interface CountdownProps {
  targetNs: bigint | string | number;
  isAccepted?: boolean;
  className?: string;
  onExpire?: () => void;
}

export function Countdown({
  targetNs,
  isAccepted = false,
  className = "",
  onExpire,
}: CountdownProps) {
  // Target in milliseconds
  const targetMs = typeof targetNs === "bigint"
    ? Number(targetNs / 1_000_000n)
    : (typeof targetNs === "string"
      ? (targetNs.length > 13 ? Number(BigInt(targetNs) / 1_000_000n) : Number(targetNs))
      : targetNs);

  const [timeLeftMs, setTimeLeftMs] = useState<number>(() =>
    Math.max(0, targetMs - Date.now()),
  );

  useEffect(() => {
    if (isAccepted) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, targetMs - Date.now());
      setTimeLeftMs(remaining);
      if (remaining === 0) {
        clearInterval(interval);
        onExpire?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetMs, isAccepted, onExpire]);

  // Hidden once accepted
  if (isAccepted) {
    return null;
  }

  if (timeLeftMs <= 0) {
    return (
      <div
        role="timer"
        aria-live="polite"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-mono font-medium ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
        <span>Guarantee Expired</span>
      </div>
    );
  }

  const totalSeconds = Math.floor(timeLeftMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const formatted = [
    hours.toString().padStart(2, "0"),
    minutes.toString().padStart(2, "0"),
    seconds.toString().padStart(2, "0"),
  ].join(":");

  return (
    <div
      role="timer"
      aria-live="polite"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-mono font-semibold ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
      <span>Expires in: {formatted}</span>
    </div>
  );
}
