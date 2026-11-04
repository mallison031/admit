// Explorer link builder (A-9.4)
import { explorerAccountUrl, explorerTxUrl, type Network } from "@admit/core";
import React from "react";

export interface ExplorerLinkProps {
  type: "tx" | "account";
  value: string;
  network?: Network;
  label?: string;
  className?: string;
}

export function ExplorerLink({
  type,
  value,
  network = "testnet",
  label,
  className = "",
}: ExplorerLinkProps) {
  const url = type === "tx"
    ? explorerTxUrl(network, value)
    : explorerAccountUrl(network, value);

  const display = label ?? (
    type === "tx"
      ? (value.length > 12 ? `${value.slice(0, 6)}...${value.slice(-6)}` : value)
      : value
  );

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`View ${type} ${value} on NEAR Explorer`}
      className={`inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 hover:underline font-mono text-xs transition-colors ${className}`}
    >
      <span>{display}</span>
      <svg
        className="w-3 h-3 opacity-70"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
        />
      </svg>
    </a>
  );
}
