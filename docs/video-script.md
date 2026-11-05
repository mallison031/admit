# Admit Demo Video Script (≤ 120 Seconds)

> **Track:** Social Money · NEAR Hackathon  
> **Target Duration:** 1 minute 50 seconds (under 2:00 cap)  
> **Visual Focus:** Screen recording of mobile web app (`/request`, `/g/[id]`, `/member`, `/council`) + terminal testnet execution

---

## Storyboard & Voiceover

### [0:00 – 0:25] The Problem: The 2:00 AM Crisis
- **Visual:** Dim hospital corridor / title card: *Lagos, Nigeria — 2:04 AM*.
- **Voiceover:**
  > "Across much of the developing world, emergency care has a brutal prerequisite: pay upfront or be turned away. In Nigeria, trauma victims and expectant mothers routinely wait in triage while staff demand cash deposits of 50 to 500 dollars before doctors will intervene. Crowdfunding campaigns take three to five days to coordinate, but clinical emergencies kill within hours. Hospitals demand deposits because they fear non-payment. What patients desperately need is an instant, verifiable guarantee."

---

### [0:25 – 0:50] The Solution & Mobile Request (NEP-366 Meta-Tx)
- **Visual:** Mobile screen recording on `/request`. User selects "St. Nicholas Clinic", enters 300 USDC, patient initials "AO", and taps "Generate Emergency Guarantee".
- **Voiceover:**
  > "Meet Admit. Community circles—churches, alumni groups, extended families—pre-fund pooled reserves on NEAR. At 2:04 AM, a member's brother rushes to the hospital with zero NEAR in his wallet. His paired phone signs an inner NEP-366 DelegateAction. Admit’s relayer sponsors the gas and submits the transaction on-chain in seconds. The screen displays an intake QR code and a 6-character code."

---

### [0:50 – 1:15] Hospital Triage Verification (Zero Login Required)
- **Visual:** Switch to `/g/0` view on hospital tablet. Shows "Status: Issued" and countdown timer. Staff enter the 6-character code (`3PXHTS`), verification ticks green, and staff tap "Accept Guarantee". The status switches to "Accepted" and the countdown timer stops.
- **Voiceover:**
  > "At the triage desk, the admitting nurse scans the QR code. Notice: the hospital requires zero crypto wallet, zero NEAR tokens, and zero login. The page queries NEAR RPC view calls directly. The nurse types the 6-character intake code. The cryptographic hash matches on-chain. She taps Accept Guarantee. Treatment begins immediately."

---

### [1:15 – 1:35] Post-Treatment Claim, TEE AI Audit & Council Settlement
- **Visual:** Show `/council` view with `AiReviewPanel` displaying medical bill line-item audit and TDX TEE quote hash. Show council approving 250 USDC payout.
- **Voiceover:**
  > "Post-treatment, the clinic claims 280 dollars. If contested, an advisory AI model running in an Intel TDX confidential enclave on NEAR AI Cloud cross-checks the invoice against Ministry of Health reference tariffs, flagging an inflated observation bed charge. The community council reviews the advisory verdict, trims thirty dollars, and disburses 250 USDC on-chain."

---

### [1:35 – 1:50] Credit Recovery & Solvency
- **Visual:** Show `/member` screen with credit limit restoring upon 50 USDC repayment. Quick glimpse of 10,000-run Monte Carlo solvency chart (0.00% insolvency).
- **Voiceover:**
  > "When the patient recovers and repays their share via NEP-141 USDC, their credit limit restores automatically. With strict pool exposure caps proven solvent across 10,000 Monte Carlo simulations, Admit ensures community reserves never run dry. Emergency treatment starts before anyone pays."
