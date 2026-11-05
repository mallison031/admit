# Admit — X (Twitter) Launch Post Draft

> **Status:** Draft awaiting maintainer approval (A-13.9 / Issue #194)  
> **Rule:** Post ONLY with explicit maintainer OK.

---

### Main Tweet (Thread 1/4)

In much of Nigeria, trauma patients and pregnant women are turned away at 2:00 AM because clinics demand upfront cash deposits before doctors touch them.

Crowdfunding takes days. Emergencies kill in hours.

We built **Admit** at the NEAR HACKATHON (@NEARProtocol) — instant hospital-deposit guarantees from community circles on NEAR. #NEARHackathon 🧵👇

---

### Tweet 2/4 (The 2:04 AM Emergency Flow)

How Admit works when seconds count:

1. **2:04 AM:** Member’s relative on a phone with 0 NEAR triggers a $300 guarantee. A paired device signs an inner NEP-366 DelegateAction; our relayer covers gas.
2. **2:06 AM:** Triage staff scan the QR code and type a 6-character code. The page verifies directly against NEAR RPC (zero wallet or clinic login needed).
3. Care starts immediately.

---

### Tweet 3/4 (Community Solvency & Confidential AI)

Admit isn't insurance — it's revolving mutual-aid credit:
- **Calibrated Solvency:** Strict pool exposure caps ($reserved \le 80\% \times pool$) maintain 0.00% insolvency across 10,000 Monte Carlo simulation runs.
- **AI Bill Check:** Itemized hospital claims are cross-checked against standard benchmark tariffs inside a confidential Intel TDX TEE on NEAR AI Cloud to prevent overbilling before council payout.

---

### Tweet 4/4 (Open Source & Live Testnet)

Built with @nearcore Rust SDK 5.30, NEP-141 USDC, NEP-366 Meta-Transactions, Sputnik DAO v2, and Next.js 16.

- 100% open source: https://github.com/mallison031/admit
- 265/265 unit & sandbox integration tests passing
- Full 2-minute demo & testnet explorer walkthrough below 🎥

#NEAR #Web3SocialMoney #SocialImpact
