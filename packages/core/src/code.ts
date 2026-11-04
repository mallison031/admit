// Guarantee code: 6 chars from an unambiguous alphabet; on-chain only sha256(code ‖ id) (A-7.4).
export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 6;

export const generateCode = (): string => {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  let code = "";
  // CODE_ALPHABET length is 32, exactly 2^5. Since 256 is an exact multiple of 32 (256 = 32 * 8),
  // byte % 32 has zero modulo bias across the 0..255 byte domain.
  for (let i = 0; i < CODE_LENGTH; i++) {
    const idx = bytes[i]! % CODE_ALPHABET.length;
    code += CODE_ALPHABET.charAt(idx);
  }
  return code;
};

export const codeHash = async (code: string, guaranteeId: number): Promise<number[]> => {
  const codeBytes = new TextEncoder().encode(code);
  const buf = new Uint8Array(codeBytes.length + 8);
  buf.set(codeBytes, 0);

  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  view.setBigUint64(codeBytes.length, BigInt(guaranteeId), true); // little-endian u64

  const hashBuffer = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hashBuffer));
};
