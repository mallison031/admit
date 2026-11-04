// Token amount input (bigint-safe) (A-9.3)
import React from "react";

export interface AmountInputProps {
  value: string;
  onChange: (v: string) => void;
  max?: string;
  id?: string;
  label?: string;
  disabled?: boolean;
  placeholder?: string;
}

export function AmountInput({
  value,
  onChange,
  max,
  id = "amount-input",
  label = "Amount (USDC)",
  disabled = false,
  placeholder = "0.00",
}: AmountInputProps) {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Allow digits and up to one decimal point with at most 6 decimal places
    if (/^\d*\.?\d{0,6}$/.test(val)) {
      onChange(val);
    }
  };

  const handleMaxClick = () => {
    if (max !== undefined) {
      onChange(max);
    }
  };

  return (
    <div className="w-full flex flex-col gap-1.5 font-sans">
      <div className="flex justify-between items-center text-xs text-slate-400">
        <label htmlFor={id} className="font-medium text-slate-200">
          {label}
        </label>
        {max !== undefined && (
          <div className="flex items-center gap-1.5">
            <span>Max: {max}</span>
            <button
              type="button"
              onClick={handleMaxClick}
              disabled={disabled}
              className="text-[11px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 active:scale-95 transition-all font-semibold disabled:opacity-50"
            >
              MAX
            </button>
          </div>
        )}
      </div>

      <div className="relative flex items-center">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-base sm:text-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed font-mono"
        />
        <span className="absolute right-3.5 text-xs sm:text-sm font-semibold text-slate-400 pointer-events-none">
          USDC
        </span>
      </div>
    </div>
  );
}
