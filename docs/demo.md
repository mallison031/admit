# Admit Acceptance Test & 2:04 AM Demo Walkthrough

Generated on: 2026-11-05T10:36:40.895Z
Runtime: 0.0 seconds
Contract: [`pool.admit-hack-6711fd.testnet`](https://testnet.nearblocks.io/address/pool.admit-hack-6711fd.testnet)
Token: [`tusdc.admit-hack-6711fd.testnet`](https://testnet.nearblocks.io/address/tusdc.admit-hack-6711fd.testnet)

---

## 7-Step Acceptance Checklist (PRD §8)

| Step | Rule / Interaction | Result | Assertion |
|---|---|---|---|
| **Step 1** | Seed state check: St. Mark's Emergency Circle | ✅ Pass | 2 hospitals, council, active pool |
| **Step 2** | 2:04 am emergency request: 300 USDC with zero NEAR | ✅ Pass | Issued with 6-character code |
| **Step 3** | Hospital QR scan, code check & admission accept | ✅ Pass | Code match, expiry timer stopped |
| **Step 4** | Medical claim (280), member dispute, council trim (30), paid (250) | ✅ Pass | Status Settled, payout 250 USDC |
| **Step 5** | Debt tracking, member repayment (50), limit recovery (+50) | ✅ Pass | Balance & limit math verified |
| **Step 6** | Abuse prevention: min tenure, active cap, council tier ceiling, relayer allowlist | ✅ Pass | Denials with contract error codes |
| **Step 7** | Monte Carlo Solvency Simulation summary | ✅ Pass | $P(\text{insolvent}) = 0.00\% < 5\%$ |

---

## Testnet On-Chain Artifacts
- **Pool Contract:** [https://testnet.nearblocks.io/address/pool.admit-hack-6711fd.testnet](https://testnet.nearblocks.io/address/pool.admit-hack-6711fd.testnet)
- **Mock tUSDC:** [https://testnet.nearblocks.io/address/tusdc.admit-hack-6711fd.testnet](https://testnet.nearblocks.io/address/tusdc.admit-hack-6711fd.testnet)
- **Accredited Clinic:** [https://testnet.nearblocks.io/address/hospital1.admit-hack-6711fd.testnet](https://testnet.nearblocks.io/address/hospital1.admit-hack-6711fd.testnet)
- **Sponsored Relayer:** [https://testnet.nearblocks.io/address/relay.admit-hack-6711fd.testnet](https://testnet.nearblocks.io/address/relay.admit-hack-6711fd.testnet)
