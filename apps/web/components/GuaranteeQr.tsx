// QR for /g/[id] (A-9.3)
import QRCode from "qrcode";
import React, { useEffect, useState } from "react";

export interface GuaranteeQrProps {
  network: string;
  contractId: string;
  guaranteeId: number;
}

export function GuaranteeQr({
  network,
  contractId,
  guaranteeId,
}: GuaranteeQrProps) {
  const [dataUrl, setDataUrl] = useState<string>("");

  const url = typeof window !== "undefined"
    ? `${window.location.origin}/g/${guaranteeId}`
    : `/g/${guaranteeId}`;

  useEffect(() => {
    QRCode.toDataURL(url, {
      width: 240,
      margin: 1.5,
      color: {
        dark: "#0F172A", // Slate-900
        light: "#FFFFFF",
      },
    })
      .then(setDataUrl)
      .catch((err) => console.error("Failed to generate QR code:", err));
  }, [url]);

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-slate-900/60 border border-slate-800 rounded-xl max-w-[280px] mx-auto text-center font-sans">
      <div className="bg-white p-2.5 rounded-lg shadow-md aspect-square flex items-center justify-center w-[200px] h-[200px]">
        {dataUrl ? (
          <img
            src={dataUrl}
            alt={`QR code for Guarantee #${guaranteeId}`}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="animate-pulse text-xs text-slate-400 font-mono">
            Generating QR...
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-0.5">
        <span className="text-sm font-semibold text-white">
          Guarantee #{guaranteeId}
        </span>
        <span className="text-[11px] text-slate-400 font-mono break-all">
          {contractId} ({network})
        </span>
      </div>
    </div>
  );
}
