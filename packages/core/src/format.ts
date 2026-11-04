// Amount and time formatting (A-7.6). Amounts are bigint; never JS number.
export const formatAmount = (raw: bigint, decimals: number, symbol = ""): string => {
  const isNegative = raw < 0n;
  const abs = isNegative ? -raw : raw;
  const divisor = 10n ** BigInt(decimals);
  const intPart = decimals === 0 ? abs : abs / divisor;
  const fracPart = decimals === 0 ? 0n : abs % divisor;

  const intFormatted = intPart.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  let result = intFormatted;
  if (decimals > 0 && fracPart > 0n) {
    let fracFormatted = fracPart.toString().padStart(decimals, "0");
    fracFormatted = fracFormatted.replace(/0+$/, "");
    if (fracFormatted.length > 0) {
      result = `${intFormatted}.${fracFormatted}`;
    }
  }

  const sign = isNegative ? "-" : "";
  return symbol ? `${sign}${result} ${symbol}` : `${sign}${result}`;
};

export const parseAmount = (display: string, decimals: number): bigint => {
  const trimmed = display.trim().replace(/,/g, "");
  if (!trimmed) {
    throw new Error("Cannot parse empty amount");
  }

  const isNegative = trimmed.startsWith("-");
  const unsigned = isNegative ? trimmed.slice(1) : trimmed;

  const parts = unsigned.split(".");
  if (parts.length > 2) {
    throw new Error(`Invalid amount format: ${display}`);
  }

  const intPart = parts[0] ?? "";
  const fracPart = parts[1] ?? "";
  if (!/^\d*$/.test(intPart) || !/^\d*$/.test(fracPart)) {
    throw new Error(`Invalid amount format: ${display}`);
  }
  if (intPart.length === 0 && fracPart.length === 0) {
    throw new Error(`Invalid amount format: ${display}`);
  }
  if (fracPart.length > decimals) {
    throw new Error(`Fractional part exceeds ${decimals} decimals: ${display}`);
  }

  const paddedFrac = fracPart.padEnd(decimals, "0");
  const intVal = intPart.length === 0 ? "0" : intPart;
  const fullVal = BigInt(intVal + paddedFrac);
  return isNegative ? -fullVal : fullVal;
};
