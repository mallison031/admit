# Admit — Architecture (v2)

> Companion to `PRD.md`. Short version for agents: `ARCHITECTURE_ESSENTIALS.md`.
> v2 (4 Nov 2026) applies the hard-questions review; §14 is the decision log.
> Live task list and status: `ROADMAP.md`. **Update it in every contribution.** If you change the design, also update this file and ESSENTIALS.
> Items marked **VERIFY** were not confirmed against live docs.

---

## 1. System overview

```
 Requester (phone, no NEAR) ─┐                 ┌─ Hospital staff (phone, no wallet)
                             ▼                 ▼
              ┌───────────────────────────────────────────┐
              │ Web app (Next.js): /request, /g/[id] (QR, │
              │ reads chain directly), /member, /council  │
              └──────┬───────────────────────────┬────────┘
                     │ signed delegate actions   │ view calls (RPC)
                     ▼                           │
              ┌──────────────┐                   │
              │ relayer      │  NEP-366 meta-tx  │
              │ (admit-api)  │──────────┐        │
              └──────────────┘          ▼        ▼
 ┌────────────────────┐        ┌──────────────────────┐
 │ Sputnik DAO        │───────►│ admit-pool contract  │
 │ registry, params,  │        │ custody, limits,     │
 │ council list,      │        │ guarantees, debt     │
 │ defaults           │        └──────────┬───────────┘
 └────────────────────┘                   │ NEP-141
                                          ▼
                                   tUSDC / USDC
```

### Key decisions
1. **The `admit-pool` contract holds custody and enforces limits, exposure and guarantees.** It supports many pools (`pool_id`); the demo uses one.
2. **Framed as a mutual-aid credit line, not insurance.** By default the member repays the full settled amount (`pool_covered_bps = 0`). The pool absorbs losses only on the patient's death (`cover_on_death`) or on a council write-off. The README states that any real pilot needs legal review (e.g., NAICOM in Nigeria).
3. **Two approval tiers:** **Instant** (≤ member limit) and **one council member** (≤ limit × multiplier). The DAO never issues guarantees. It manages the hospital registry, parameters, the council list and write-offs.
4. **No one at the hospital needs NEAR.**
   - **Requesters and delegates:** the app creates an implicit account per device with a **function-call key** limited to `request_guarantee` and `repay_intent`. They sign NEP-366 delegate actions, and the relayer pays gas.
   - **Hospitals:** each gets a function-call key at registration, limited to `hospital_accept`, `hospital_claim`, `hospital_release` and `hospital_transfer`. These also go through the relayer.
5. **The patient check uses a guarantee code**, not a hashed ID. The requester gets a random 6-character code. The contract stores `sha256(code ‖ guarantee_id)`. Hospital staff type the code shown on the requester's phone, and the page checks the hash locally.
6. **Accepted guarantees don't expire.** Only unaccepted ones expire after the TTL. This handles long admissions.
7. **The QR page reads the chain directly** with RPC view calls.

## 2. Tech stack

| Layer | Choice |
|---|---|
| Contract | Rust, `near-sdk` 5.30, `cargo-near` |
| Tests | `near-workspaces` 0.24, unit tests; TS packages use Node's built-in `node:test` via `tsx` (no extra dependency) |
| Approved extra deps (2026-11-04) | `near-contract-standards` 5.30 (mock-ft NEP-141/145) · Vitest 5.1 (web tests) |
| Token | Mock NEP-141 `tusdc.<you>.testnet` (with NEP-145 storage); mainnet native USDC: `17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1` (NEP-141, 6 decimals; per Circle's USDC-on-NEAR page). Not the bridged `a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.factory.bridge.near` (USDC.e). |
| Council | Sputnik DAO v2. Factory: `sputnik-v2.testnet` (testnet), `sputnik-dao.near` (mainnet), both confirmed on-chain with near-cli on 2026-11-04. DAO contract version 2.0.0. Fixed-weight policy: `{"weight_kind":"RoleWeight","quorum":"0","threshold":"3"}`. `threshold` is an untagged enum, so a string is a fixed weight (`"3"`) and a pair is a ratio (`[1,2]`, which resolves to `num × total / denom + 1`). Source: `sputnikdao2/src/policy.rs` (`WeightOrRatio`). |
| Relayer | NEP-366 delegate actions; `admit-api` relayer account with allow-list `admit-pool` methods only (reference: `pagoda-relayer-rs` or a small TS relayer with `near-api-js` `signedDelegate`) **VERIFY** current relayer tooling |
| Versions (checked 2026-11-04) | near-sdk 5.30.0 · near-workspaces 0.24.0 · Next 16.4 · React 19.3 · Hono 4.13 · near-api-js 7.4 · zod 4.6 · Tailwind 4.3 · wallet-selector 10.1 · TypeScript 5.9 (typescript-eslint doesn't support TS 7 yet) |
| Frontend | Next.js 16, TypeScript, Tailwind, `near-api-js`, `qrcode`; wallet-selector only for council/members who have wallets |
| Backend | Node 22 + Hono (`admit-api`): relayer, (stretch) AI bill check, quote proxy |
| Simulation | TypeScript `scripts/simulate.ts` → CSV + chart |
| Hosting | Vercel |
| Monorepo | pnpm workspaces |

## 3. Repository layout
See `project_structure.md` for the full tree, module responsibilities, dependency direction and where new code goes.

## 4. Data model

```rust
pub struct PoolParams {
    monthly_contribution: U128,
    min_tenure_months: u8,             // e.g. 3
    base_limit: U128,                  // calibrate to real deposit sizes (≈ ₦500k ≈ $300+) — cite sources in README
    limit_per_month: U128, max_limit: U128,
    late_limit_bps: u16,               // Late members get limit × this (e.g. 5000) — 1-month grace
    max_exposure_bps: u16,             // reserved ≤ balance × this
    max_active_per_member: u8,         // e.g. 2 (two emergencies at once)
    cooldown: u64,
    guarantee_ttl: u64,                // unaccepted guarantees only (72h)
    dispute_window: u64,               // after claim, before settle (24h)
    pool_covered_bps: u16,             // default 0 (credit line)
    cover_on_death: bool,              // default true
    council_tier_multiplier: u8,       // e.g. 3
    exit_lock_months: u8,              // e.g. 12
    exit_notice: u64,                  // e.g. 30 days
    time_scale: u32,                   // immutable
}

pub struct Pool {
    id: PoolId, name: String, dao: AccountId, token: AccountId,
    params: PoolParams,
    council: Vec<AccountId>,           // set by DAO only
    hospitals: Vec<Hospital>,          // set by DAO only
    balance: U128, reserved: U128, written_off: U128,
}

pub struct Hospital { account: AccountId, name: String, fc_public_key: PublicKey }

pub enum Standing { Good, Late, Default }

pub struct Member {
    account: AccountId, joined_at: u64,
    contributed: U128,                 // months_paid = contributed / monthly_contribution
    outstanding: U128,                 // debt from settled guarantees
    standing: Standing,
    active_guarantees: u8,
    last_guarantee_at: Option<u64>,
    delegates: Vec<AccountId>,         // implicit accounts with function-call keys
    exit_requested_at: Option<u64>,
}

pub enum GStatus { PendingCouncil, Issued, Accepted, Claimed, Disputed, Settled, Released, Expired, Rejected, WrittenOff }

pub struct Guarantee {
    id: GuaranteeId, pool_id: PoolId,
    member: AccountId, requested_by: AccountId,
    patient_initials: String,          // ≤ 4 chars, optional
    code_hash: [u8; 32],               // sha256(code ‖ id)
    hospital: AccountId,
    amount: U128,                      // reserved; can grow via top-up
    local: Option<LocalAmount>,        // {currency:"NGN", amount, fx_rate_e6} recorded at issue (informational)
    status: GStatus,
    issued_at: u64, expires_at: u64,   // expiry ignored once Accepted
    claim: Option<Claim>,
    approved_by: Option<AccountId>,    // council member for tier 2
    transferred_from: Option<AccountId>,
}

pub struct Claim {
    amount: U128, file_hash: [u8; 32], claimed_at: u64,
    dispute: Option<String>,           // member's reason
    adjustment: U128, adjustment_reason: Option<String>,
    paid: U128,
    ai_review: Option<AiReview>,       // stretch, advisory
}
```

### Derived (pure functions, unit-tested; ported to TS for the simulator)
- `tenure_months = scaled(now − joined_at) / MONTH`
- `good_months = min(tenure_months, contributed / monthly_contribution)` (both required)
- `raw_limit = min(max_limit, base_limit + limit_per_month × good_months)`
- `limit` depends on standing:
  - Good: `raw_limit − outstanding − reserved_for_member`
  - Late: `raw_limit × late_limit_bps − …`
  - Default: 0
  - Also 0 if tenure < min.
- `exposure_ok = reserved + amount ≤ balance × max_exposure_bps / 10_000`
- `tier`: Instant if ≤ limit; Council if ≤ limit × multiplier; otherwise rejected (not an emergency product)

## 5. Contract interface

**Pool / DAO-only**
- `create_pool(name, dao, token, params)`.
- `council_set_members`, `council_add_hospital(h)` (also calls `token.storage_deposit(h.account)` and records the hospital's function-call public key; the hospital account's key is added off-chain at onboarding), `council_remove_hospital`, `council_set_params` (can't change `time_scale`), `council_write_off(guarantee_id, reason)`, `council_mark_default(member)`.

**Members**
- `join(pool_id)`, `add_delegate(pool_id, account)`, `remove_delegate`.
- `ft_on_transfer` with `msg` set to `{"contribute": pool_id}`, `{"repay": pool_id}` (reduces `outstanding`; a `Late` member with no debt returns to `Good`), or `{"topup": pool_id}`.
- `request_exit(pool_id)`: allowed after `exit_lock_months`. `execute_exit` runs after `exit_notice`. Refund = `contributed − outstanding`, paid only if `exposure_ok` still holds afterwards; otherwise it's queued.

**Guarantees (member or delegate, via relayer)**
- `request_guarantee(pool_id, member, hospital, amount, code_hash, patient_initials, local)`.
  - Checks: caller ∈ {member, delegates}; hospital registered; `active_guarantees < max_active_per_member`; cooldown; tier; `exposure_ok`.
  - Instant → `Issued` (amount reserved). Council tier → `PendingCouncil`.
- `request_topup(guarantee_id, extra)`: same tier and exposure checks on the new total.
- `council_approve(guarantee_id)` / `council_reject`: by a council member.

**Hospital (function-call key, via relayer)**
- `hospital_accept(guarantee_id)` → `Accepted`. The expiry no longer applies.
- `hospital_claim(guarantee_id, amount ≤ guarantee.amount, file_hash)` → `Claimed`. Starts the `dispute_window`.
- `hospital_release(guarantee_id)` → `Released`.
- `hospital_transfer(guarantee_id, to_hospital, partial_amount)`: the current hospital keeps a partial claim, and the remainder becomes a new guarantee at `to_hospital`, with the same code hash.

**Settlement**
- `member_dispute(guarantee_id, reason)`: within the window → `Disputed`.
- `settle(guarantee_id)`: anyone, after the window if not disputed. A council member can settle earlier, or with an `adjustment` (which also resolves a dispute). Pays the hospital `amount − adjustment`, releases the reservation, and adds to the member's debt: `paid × (1 − pool_covered_bps)`.
- `report_death(guarantee_id)`: council member. If `cover_on_death`, the debt from this guarantee is written off.
- `expire(guarantee_id)`: anyone; works only on `Issued` past `expires_at`.

**Views**
- `get_guarantee(id)` (used by the QR page), `get_member`, `get_limit`, `get_pool`, `get_pool_stats`, `list_guarantees`.

## 6. Guarantee state machine
```
request ─┬─ Instant ─────────────────────► Issued
         └─ Council tier ─► PendingCouncil ─approve─► Issued   (reject → Rejected)
Issued ──ttl──► Expired
Issued ──hospital_accept──► Accepted ──hospital_claim──► Claimed ──window──► settle ──► Settled
                                   └─hospital_release─► Released         └─member_dispute─► Disputed ─council settle─► Settled
Accepted/Claimed ──hospital_transfer──► (partial Claimed here) + new Issued/Accepted at next hospital
Settled ──report_death / write_off──► debt written off (status WrittenOff for the debt record)
```
Funds are reserved from `Issued` until the guarantee is `Settled`, `Released`, `Expired` or `Rejected`.

## 7. Events (NEP-297, `admit` v1.0.0)
`pool_created, member_joined, contribution, topup, repayment, guarantee_requested, guarantee_issued, guarantee_topped_up, guarantee_accepted, guarantee_claimed, guarantee_disputed, guarantee_settled, guarantee_released, guarantee_expired, guarantee_transferred, debt_written_off, standing_changed, hospital_added, params_changed, exit_requested, exit_executed`

## 8. QR verification page (`/g/[id]`)
- **QR contents:** `network`, `contract`, `guarantee_id`. The page calls `get_guarantee` through public RPC.
- **Status banner:** GUARANTEED / PENDING / EXPIRED / SETTLED, shown with:
  - The amount, plus the local amount recorded at issue, labelled "estimate".
  - The hospital name and pool name.
  - An expiry countdown (hidden once accepted).
- **Code check:** staff type the 6-character code from the requester's phone. The page hashes `code ‖ id` locally and shows a ✓ match.
- **Accept button:** visible on the hospital's registered device, which holds the function-call key.
- **Explorer links** for the contract and the transaction.

## 9. Relayer (`admit-api`)
- **`POST /relay`:** accepts a signed NEP-366 delegate action. It checks:
  - Receiver = `admit-pool`.
  - The method is on the allow-list.
  - The rate limit per signer.

  Then it wraps and submits the action, paying the gas.
- **Allow-list:** `request_guarantee`, `request_topup`, `hospital_accept`, `hospital_claim`, `hospital_release`, `hospital_transfer`, `member_dispute`.
- **Onboarding:** `POST /onboard/device` returns nothing secret. The device generates its own keypair, and the member's wallet adds it as a delegate (`add_delegate`) by scanning a QR code.

## 10. Simulator (`scripts/simulate.ts`)
- **Inputs:**
  - Members and contribution.
  - Monthly emergency probability.
  - Bill distribution (lognormal, calibrated to the cited deposit sizes).
  - Repayment default probability and death probability.
  - Mass-casualty shocks.
  - The pool parameters.
- **Runs:** 10,000 runs × 24 months, under 3 scenarios: `normal`, `bad_year` (3× claims), `exit_wave` (20% of members exit after the lock).
- **Outputs:** P(insolvent), P(a legitimate request denied by the exposure cap), and the reserve ratio over time.
- **Code:** reuses the TS port of the derived functions (no parity test; see §14.3).

## 11. Threat model
| Threat | Control |
|---|---|
| Join-then-claim | Minimum tenure plus contributions paid |
| Serial claims | `max_active_per_member`, cooldown, debt reduces the limit |
| Fake or colluding hospital | DAO registry; payment only to registered accounts; public history per hospital |
| Inflated or never-treated bill | Claim ≤ guarantee; member dispute window; council adjustment |
| Pool run | Exit lock, notice period, exits subject to the exposure cap |
| Insolvency in a mass-casualty event | Exposure cap (first-come); simulator; documented |
| Council member abuse | Tier ≤ limit × multiplier; council only approves within bounds; everything is public |
| Requester or hospital lacks NEAR | Function-call keys plus the relayer |
| Relayer abuse | Method allow-list, rate limits, receiver check |
| Hospital not registered with the token | `storage_deposit` at registration |
| `ft_transfer` failure | State updated first; callback restores it |

**Documented, not solved:**
- Regulatory classification of the pool.
- Fiat cash-out for hospitals.
- Real hospital adoption.

## 12. Tests (must pass)
- Instant issuance within the limit; exposure cap enforced; Council tier requires an approval.
- Denied requests: tenure, unpaid contributions, active-guarantee cap, cooldown, a Default member.
- A Late member gets a reduced limit.
- An accepted guarantee doesn't expire, while an unaccepted one does, releasing its reservation.
- A claim above the guarantee fails.
- Settlement: the dispute window blocks early settle; a council adjustment pays the right amounts; debt is recorded.
- `report_death` writes off the debt.
- Top-up and transfer to another hospital both work.
- Exit is blocked before the lock, and the refund is reduced by debt.
- DAO-only methods reject other callers; the relayer rejects methods off the allow-list.
- Registered hospitals can receive tokens (`storage_deposit`).
- A failed transfer rolls back.

## 13. Env
The full list lives in `.env.example` (source of truth, grouped: network and contracts, script accounts, relayer, public web vars, optional). Change both together.

---

## 14. Hard questions — decision log

### 14.1 What would break → decision
| # | Issue | Decision | Status |
|---|---|---|---|
| B1 | It may be regulated insurance | Credit-line framing: `pool_covered_bps = 0`, pool absorbs only on death or write-off; README requires legal review | Applied |
| B2 | Contribution withdrawal undefined | 12-month lock, 30-day notice, refund = contributed − debt, subject to the exposure cap | Applied |
| B3 | Requester has no gas at 2am | Device function-call keys plus NEP-366 relayer (Must) | Applied |
| B4 | Hospital can't sign | Hospital function-call key at registration plus relayer. **Accept kept**, because long admissions need guarantees that don't expire | Applied (revised) |
| B5 | Patient-ref salt unavailable | Replaced by a guarantee code; staff type the code; hash checked locally | Applied |
| B6 | Hospital token storage | `storage_deposit` at `council_add_hospital` | Applied |
| B7 | Hospital needs naira | Documented dependency on fiat cash-out | Deferred |
| B8 | Instant limit too small | Calibrate defaults to cited deposit sizes; simulator shows the contribution needed | Applied |
| B9 | Mass-casualty lockout | First-come under the exposure cap; simulator reports the denial rate | Accepted |

### 14.2 Edge cases → decision
| Edge case | Decision |
|---|---|
| Patient dies | `cover_on_death` (default true) → debt written off |
| Bill exceeds the guarantee | `request_topup` |
| Long admission | Accepted guarantees don't expire |
| Transfer to another hospital | `hospital_transfer` |
| Two emergencies at once | `max_active_per_member = 2` |
| Hospital claims without treating | Member dispute window |
| Member behind on contributions | Late = 1-month grace at a reduced limit |
| FX moves | `local` amount and rate recorded at issue (informational) |
| Member leaves or dies with debt | Exit refund reduced by debt; council write-off |
| Prepaid contributions | Both tenure and contributions are required |
| DAO's 7-day proposal period | DAO never issues guarantees |

### 14.3 Cuts
| Cut | Status |
|---|---|
| DAO-issued guarantees (third tier) | Removed |
| Salted patient-ref hashing and dependent hashes | Removed (guarantee code instead) |
| Repayment-plan engine (instalments, missed counters, automatic Late/Default) | Removed. Debt reduces the limit; repay any time; Late/Default via contributions and the council |
| `hospital_accept` | **Kept**, via function-call key (see B4) |
| AI bill check with a reference price list | Stretch only; must be labelled clearly |
| Simulator–contract parity test | Removed |
| Multi-pool contract | Kept (cheap), demo uses one pool |
