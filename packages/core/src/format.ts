// Amount and time formatting (A-7.6). Amounts are bigint; never JS number.
export const formatAmount = (_raw: bigint, _decimals: number, _symbol: string): string => {
  throw new Error("not implemented: A-7.6");
};
export const parseAmount = (_display: string, _decimals: number): bigint => {
  throw new Error("not implemented: A-7.6");
};
