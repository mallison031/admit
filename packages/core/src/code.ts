// Guarantee code: 6 chars from an unambiguous alphabet; on-chain only sha256(code ‖ id) (A-7.4).
export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 6;

export const generateCode = (): string => {
  throw new Error("not implemented: A-7.4");
};

export const codeHash = async (_code: string, _guaranteeId: number): Promise<number[]> => {
  throw new Error("not implemented: A-7.4");
};
