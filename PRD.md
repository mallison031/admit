# Admit — Product Requirements Document

> Get the patient treated now; let the pool settle the bill later.
> NEAR Hackathon 2026 · Primary track: **Social Money** · Secondary: Real-World Money, Privacy & Private AI (optional AI module)
> Build window: 1–14 Nov 2026 (submission deadline 14 Nov 23:59 UTC)

---

## 1. Problem

In much of Africa and South Asia, hospitals refuse emergency treatment until a deposit is paid, and some detain patients who can't pay.

- Nigeria: a pregnant woman died after a hospital demanded a ₦500,000 deposit before treating her. A senator died when a hospital wouldn't operate without a $15,000 deposit. The National Health Act (2014) requires emergency care without upfront payment, yet the practice is "widespread, though largely unregulated" (Daily Trust).
- Nigeria's Basic Health Care Provision Fund sets aside 5% for emergency treatment, and in July 2026 a senator said there was no public evidence it was accessible.
- Chatham House (2017) estimated hundreds of thousands of people a year are detained in hospitals for unpaid bills across at least 14 countries.

**Insight:** hospitals ask for deposits because they fear not being paid, especially if the patient dies. Crowdfunding takes days, but deaths happen within hours. **What's needed is a guarantee the hospital can verify in minutes.**

## 2. Product in one sentence

A community pool (church, alumni group, market association, extended family) that pre-funds emergencies and issues an instant, on-chain payment guarantee a hospital can check by scanning a QR code, so treatment starts before anyone pays.

## 3. Users

| Persona | Who | What they need |
|---|---|---|
| **Member** | Contributes $2–5/month to a pool | Instant guarantee for self or registered dependents in an emergency; fair repayment terms |
| **Dependent** | Member's parent/child/spouse (no account needed) | Gets treated |
| **Requester** | Whoever is at the hospital at 2am (member or a delegate) | One screen: pick hospital, amount → guarantee in < 1 minute |
| **Hospital** | Private clinic/hospital with a NEAR account registered in the pool | Scan QR → see "guaranteed, amount, expiry" from the chain; later submit bill and get paid |
| **Council** | 3–7 trusted pool officers (Sputnik DAO) | Vet hospitals, approve mid/large guarantees, handle defaults |
| **Diaspora backer** | Relative abroad | Top up the pool or a member's balance from any chain/token |
| **Judge / reviewer** | Hackathon judges + AI screeners | Run the 2am story end-to-end on testnet |

## 4. Goals and non-goals

**Goals (hackathon scope)**
1. Pool contract: membership, contributions, standing, limits, exposure caps.
2. Instant guarantee issuance within the member's limit; tiered approvals above it.
3. Hospital-facing verification page (QR → on-chain status) and claim flow.
4. Settlement: the pool pays the hospital; the settled amount becomes interest-free member debt (credit line, not insurance); the pool writes it off if the patient dies.
5. Council governance through Sputnik DAO.
6. Abuse controls: tenure, cooldown, exposure caps, inflated-bill flag.
7. Solvency simulation published with the repo.

**Non-goals**
- Health insurance or claims adjudication beyond a deposit guarantee.
- Fiat payout to hospital bank accounts (hospital is a NEAR account in the demo; off-ramp documented).
- Medical records storage (only hashes; no diagnoses on-chain).
- Credit scoring outside the pool.

## 5. Core user stories

### Member
- M1. I join a pool and contribute monthly (tUSDC; any-chain via 1Click on mainnet). I add trusted relatives' phones as delegates by scanning a QR code. Each phone gets a key that can only request guarantees, and the pool pays its fees, so it never needs NEAR.
- M5. Contributions are locked for 12 months. After that I can leave with 30 days' notice and get back what I paid in, minus any debt.
- M2. My guarantee limit grows with tenure and contribution history; I see it on my page.
- M3. In an emergency, I (or my delegate) request a guarantee at a registered hospital. Within my limit it's issued immediately, and I get a 6-character code to show the hospital. Up to 2 guarantees can be active at once (e.g., two people hurt in one accident).
- M4. After settlement I owe the settled amount (Admit is a credit line, not insurance). I repay whenever I can, and my limit recovers as I repay. If the patient dies, the pool writes off the debt.
- M6. If the hospital claims for treatment that didn't happen, I dispute it within 24 hours.

### Hospital
- H1. Staff scan the QR code or open the link and see the pool name, guaranteed amount, expiry and status, read live from the chain. They type the requester's 6-character code and the page confirms the match.
- H2. Staff accept the guarantee from the hospital's registered device (no wallet or NEAR needed; the relayer pays). Once accepted, it no longer expires, even for a long admission.
- H3. After treatment, the hospital submits the final itemized bill (hash, plus amount ≤ guaranteed) and is paid after the 24-hour dispute window.
- H4. If the patient leaves or the guarantee isn't needed, the hospital releases it. If the patient is transferred, the hospital claims its part and moves the rest to the next hospital.
- H5. If the bill will exceed the guarantee, the member requests a top-up under the same limit rules.

### Council
- C1. Register/vet hospitals via DAO proposal.
- C2. Approve guarantees above the instant tier, up to 3× the member's limit (1 council member). Larger requests are rejected: Admit is for emergency deposits only.
- C3. Settle disputed bills and trim inflated items, with a recorded reason.
- C4. Mark a member in default, record a patient's death (debt written off), and set pool parameters by DAO proposal.

### Anyone
- A1. Public pool page: balance, reserved, exposure ratio, guarantees issued/settled, defaults, every event.

## 6. Functional requirements

| ID | Requirement | Priority |
|---|---|---|
| F1 | Pool params: monthly contribution, min tenure, base limit (calibrated to real deposit sizes), limit growth, Late-member limit, max exposure, max active per member (2), cooldown, guarantee TTL, dispute window, pool-covered share (default 0), cover on death (default on), exit lock and notice | Must |
| F2 | Member standing Good/Late/Default; good months = min(tenure, months paid) | Must |
| F3 | Instant guarantee if: tenure ≥ min, contributions paid, active < max, cooldown passed, amount ≤ limit, pool `reserved + amount ≤ balance × max_exposure` | Must |
| F4 | Two tiers: instant ≤ limit; ≤ 3× limit needs 1 council member; larger requests are rejected | Must |
| F5 | Guarantee lifecycle: `Issued → Accepted → Claimed → (dispute window) → Settled`, or `Released`/`Expired`; accepted guarantees don't expire | Must |
| F6 | Hospital claim ≤ guaranteed amount; payment to the registered hospital account only; top-up and transfer to another hospital | Must |
| F7 | Credit line: settled amount becomes member debt that reduces the limit; repay any time; debt written off if the patient dies | Must |
| F8 | No NEAR needed at the hospital: device and hospital function-call keys plus NEP-366 relayer with a method allow-list | Must |
| F9 | Guarantee code (6 characters) checked locally on the QR page, which reads the chain directly | Must |
| F10 | DAO manages the hospital registry (with `storage_deposit`), parameters, council list and write-offs | Must |
| F11 | Exit: 12-month lock, 30-day notice, refund = contributed − debt, subject to the exposure cap | Must |
| F12 | Solvency simulator (Monte Carlo) script and chart in the README | Should |
| F13 | Any-chain top-ups via 1Click (mainnet), dry-run quotes on testnet | Could |
| F14 | AI bill check (TEE model), clearly labelled as advisory and using a cited reference list | Could |

## 7. Non-functional requirements

- **Speed**: guarantee issuance in one transaction, < 5 s on testnet.
- **Verifiability**: hospital page shows the contract address and a link to the explorer; no trust in our server.
- **Privacy**: no names or diagnoses on-chain; `patient_ref = sha256(dependent_id || salt)`; bill files off-chain.
- **Mobile first**: requester and hospital flows work on a cheap Android phone.
- **Reproducible**: `pnpm demo` + `pnpm simulate`.

## 8. Demo script (what judges will see)

1. Seed: pool "St. Mark's Emergency Circle", 20 members, 6 months of simulated contributions (time-scaled), 2 hospitals registered via DAO.
2. 2:04 am: Ngozi's brother, using a delegate phone with no NEAR, requests a 300 tUSDC guarantee for their mother at `stnicholas-clinic.testnet`. It's issued instantly with code `K7Q2MX`.
3. Clinic scans the QR code, types the code (✓ match), and sees **GUARANTEED · 300 tUSDC · expires in 72h**. It accepts from its registered device, and the expiry stops.
4. Bill submitted (280 tUSDC). Ngozi disputes one line item within the window, and the council trims 30 tUSDC. The hospital is paid 250.
5. Ngozi now owes 250 and her limit drops by that amount. She repays 50, and her limit recovers by 50.
6. Abuse attempts:
   - A brand-new member requests: denied (tenure).
   - Ngozi requests a 3rd concurrent guarantee: denied.
   - A 2,000 request: rejected (above the council tier).
   - The relayer refuses a call to a method not on its allow-list.
7. `pnpm simulate` prints solvency under normal / bad-year / run-on-pool scenarios.

## 9. Success metrics (hackathon)

- Every README claim maps to a passing integration test.
- 2am story runs in < 5 minutes.
- Simulation shows the default parameters keep the pool solvent in ≥95% of 10,000 runs at a stated claim rate.

## 10. Risks and open questions

| Risk | Mitigation |
|---|---|
| Pool may be classified as regulated insurance | Credit-line design (member repays; pool absorbs only on death or write-off); README says any pilot needs legal review (e.g., NAICOM) |
| Requester or hospital has no NEAR at 2am | Function-call keys plus NEP-366 relayer |
| Hospitals don't accept on-chain guarantees | Pilot with private clinics; guarantee page designed for non-crypto staff; payment in stablecoin + documented off-ramp |
| Pool insolvency | Exposure cap, per-member limits, cooldown, pool-covered share < 100%, simulator |
| Members join just before an emergency | Minimum tenure |
| Fake hospital colluding with member | DAO-vetted hospital registry; claims only to registered accounts |
| Inflated bills | AI flag + council trim; public record per hospital |
| Defaults | Standing → Default, limit 0, public record; council can restructure |
| No NEAR Intents testnet | Mock tUSDC; real dry-run quotes |

## 11. Milestones (11 days)

> Summary only. The detailed, live plan with task IDs, acceptance criteria and status is **`ROADMAP.md`**, which is updated in every contribution.

| Day | Deliverable |
|---|---|
| 4–5 Nov | Pool contract: members, contributions, standing, limits, exits; tests |
| 6–7 Nov | Guarantees: issue/accept/claim/dispute/settle/release/expire/top-up/transfer, exposure, tiers, debt, death write-off; tests |
| 8 Nov | NEP-366 relayer with allow-list; function-call key onboarding; Sputnik DAO (registry, params) |
| 9–10 Nov | Web UI: requester flow, hospital QR page, member page, council inbox, public pool page |
| 11 Nov | Solvency simulator; 1Click dry-run top-ups only if ahead of schedule |
| 12 Nov | Demo script, README, LICENSE |
| 13 Nov | Demo video + X post |
| 14 Nov | Submit |
