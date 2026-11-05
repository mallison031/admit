# Admit — NEAR Hackathon Submission Checklist & Copy

> **Target Submission Date:** 14 Nov 2026, 18:00 UTC  
> **Final Deadline:** 14 Nov 2026, 23:59 UTC  
> **Rule:** Submit ONLY with explicit maintainer OK (submissions cannot be modified after submission).

---

## 1. Project Overview & Metadata

- **Project Name:** Admit
- **Tagline:** Instant hospital-deposit guarantees from community pools on NEAR — so emergency treatment starts before anyone pays.
- **Track Selection:**
  - **Primary Track:** Social Money
  - **Secondary Tracks:** Real-World Money · Privacy & Private AI (Optional AI Module)
- **Repository URL:** `https://github.com/mallison031/admit` (Public, MIT License)
- **Multi-Project Disclosure:** N/A (Admit is entered as a standalone, dedicated single project submission).

---

## 2. Project Description (Target: 20 – 2,000 characters)

```text
In much of sub-Saharan Africa and South Asia, private clinics and public hospitals routinely refuse emergency medical treatment until an upfront cash deposit is placed ($50–$500), causing preventable deaths in triage rooms. Crowdfunding campaigns take days to coordinate and cash out, but clinical emergencies kill within hours.

Admit enables community circles (extended families, alumni associations, churches, market unions) to pre-fund pooled reserves on NEAR. When a medical emergency strikes at 2:00 AM:

1. Request: A member's relative on a paired phone with zero NEAR triggers an admission guarantee. The device signs an inner NEP-366 DelegateAction; our relayer covers gas.
2. Triage Verification: Hospital staff scan the QR code and enter a 6-character code. The page verifies directly against NEAR RPC view calls—zero clinic wallet, tokens, or login required. Staff tap Accept, locking the guarantee and permanently stopping the countdown. Treatment begins immediately.
3. Settlement & AI Audit: Post-treatment, the hospital submits an itemized bill. An advisory review running in a confidential Intel TDX TEE on NEAR AI Cloud cross-checks charges against standard benchmark tariffs, flagging redundant line items. The community council audits disputes and disburses USDC.
4. Revolving Recovery: When the member repays via NEP-141 USDC, their debt decreases and revolving credit recovers.

Admit is not insurance—it is a community mutual-aid credit line backed by Sputnik DAO v2 governance, strict exposure caps (proven 0.00% insolvent across 10,000 Monte Carlo simulations), and 265 automated unit and sandbox integration tests.
```
*(Character count: ~1,680 characters — well within the 20 to 2,000 character limit).*

---

## 3. On-Chain Testnet Artifacts

- **Pool Contract:** [`pool.admit.testnet`](https://testnet.nearblocks.io/address/pool.admit.testnet)
- **Token Contract (tUSDC):** [`tusdc.admit.testnet`](https://testnet.nearblocks.io/address/tusdc.admit.testnet)
- **Accredited Clinic:** [`hospital1.admit.testnet`](https://testnet.nearblocks.io/address/hospital1.admit.testnet)
- **Sponsored Relayer:** [`relay.testnet`](https://testnet.nearblocks.io/address/relay.testnet)

---

## 4. Submission Links Checklist

- [ ] Repository: `https://github.com/mallison031/admit`
- [ ] Live Web App: `https://admit-web.vercel.app` (or Vercel production deployment URL)
- [ ] Demo Video URL: `<YouTube or Loom Link, ≤ 2 min>` (see `docs/video-script.md`)
- [ ] Public X Post URL: `<Tweet URL>` (see `docs/x-post.md`)
- [ ] Author / Team: Allison (`mallison031`)
- [ ] Payout NEAR Wallet Address: `<maintainer-wallet.near>`
