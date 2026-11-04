// THE relayer method allow-list. Must equal ARCHITECTURE §9 exactly (AGENTS invariant 7).
export const RELAYED_METHODS = [
  "request_guarantee",
  "request_topup",
  "hospital_accept",
  "hospital_claim",
  "hospital_release",
  "hospital_transfer",
  "member_dispute",
] as const;

export type RelayedMethod = (typeof RELAYED_METHODS)[number];

export const isRelayedMethod = (m: string): m is RelayedMethod =>
  (RELAYED_METHODS as readonly string[]).includes(m);
