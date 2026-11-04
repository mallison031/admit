# Admit — Architecture Essentials (v2)

> Quick reference. Full detail: `ARCHITECTURE.md` (decision log in §14). Product: `PRD.md`.
> Tasks and status: `ROADMAP.md`. **Every contribution must update it** (status, progress, Changelog).

## What it is
- A community pool that issues an instant, on-chain guarantee to a hospital, so emergency care starts before anyone pays.
- Track: Social Money.

## Non-negotiable decisions
1. **The `admit-pool` contract (Rust) holds custody and enforces limits, exposure and guarantees.**
2. **It's a credit line, not insurance.**
   - `pool_covered_bps = 0` by default, and `cover_on_death = true`.
   - The README says any pilot needs legal review.
3. **Two tiers only:** Instant (≤ limit) and 1 council member (≤ limit × multiplier). Requests above that are rejected.
4. **The DAO handles the registry, parameters, council list and write-offs. It never issues guarantees.**
5. **No one at the hospital needs NEAR.**
   - Devices and hospitals get **function-call keys** limited to specific methods.
   - They sign **NEP-366 delegate actions**, and the relayer pays gas.
   - The relayer has a method allow-list and rate limits.
6. **Guarantee code:** the requester gets a 6-character code, and only `sha256(code‖id)` goes on-chain. Staff type the code and the QR page checks it locally.
7. **Accepted guarantees don't expire**; only unaccepted ones expire after the TTL.
8. **The QR page reads the chain directly** with RPC views. `storage_deposit` is called when a hospital is registered.
9. **Exits:** 12-month lock, 30-day notice, refund = contributed − debt, subject to the exposure cap.

## Limit maths
- `good_months = min(tenure_months, contributed / monthly)`
- `limit = min(max_limit, base + per_month × good_months) − outstanding − reserved_for_member`
- Late members get `× late_limit_bps`. Default members, or members under the minimum tenure, get 0.
- `exposure_ok: reserved + amount ≤ balance × max_exposure_bps`
- `max_active_per_member = 2`, plus a cooldown.

## State machine
- **Issue:** a request becomes `Issued` (instant), or goes through `PendingCouncil` first.
- **Expire:** `Issued` becomes `Expired` after the TTL.
- **Normal path:** `Issued → Accepted → Claimed → (dispute window) → Settled`.
- **Release:** `Accepted` or `Claimed` can become `Released`.
- **Dispute:** `Claimed → Disputed → Settled`, settled by a council member, optionally with an adjustment.
- **Transfer:** `hospital_transfer` keeps a partial claim and opens a new guarantee at the next hospital.
- **Top-up:** `request_topup` raises the amount under the same tier rules.
- **Write-off:** `report_death` or `council_write_off` writes off the debt.

## Core types
- `PoolParams{monthly_contribution,min_tenure_months,base_limit,limit_per_month,max_limit,late_limit_bps,max_exposure_bps,max_active_per_member,cooldown,guarantee_ttl,dispute_window,pool_covered_bps,cover_on_death,council_tier_multiplier,exit_lock_months,exit_notice,time_scale}`
- `Member{joined_at,contributed,outstanding,standing,active_guarantees,delegates,exit_requested_at}`
- `Guarantee{member,requested_by,patient_initials,code_hash,hospital,amount,local,status,expires_at,claim}`
- `Claim{amount,file_hash,dispute,adjustment,paid}`

## `ft_on_transfer` messages
`{"contribute":pool_id}` · `{"repay":pool_id}` · `{"topup":pool_id}`

## Stack
- **Contract and tests:** Rust `near-sdk` 5.30; tests in `near-workspaces`.
- **Apps:** Next.js 16 + Tailwind + near-api-js + qrcode; Hono `admit-api`, which runs the relayer and the quote proxy.
- **Simulator:** TypeScript.
- **Tooling:** pnpm monorepo, deployed on Vercel.

## Must-pass tests
- Tiers and exposure.
- Each kind of denial: tenure, unpaid contributions, active cap, cooldown, Default.
- The reduced limit for Late members.
- Expiry only before acceptance.
- Claim ≤ guarantee.
- The dispute window and adjustments.
- Death write-off.
- Top-up and transfer.
- Exit rules.
- DAO-only methods and the relayer allow-list.
- Hospital `storage_deposit`.
- A failed transfer rolls back.

## Commands
- `pnpm demo`: the 2am story.
- `pnpm simulate`.

## Out of scope (documented)
- Regulatory classification.
- Fiat cash-out for hospitals.
- Hospital adoption.

## Verify
- ~~Sputnik factory names~~ (verified 2026-11-04: `sputnik-v2.testnet`, `sputnik-dao.near`).
- ~~The mainnet USDC id~~ (recorded 2026-11-04).
- ~~Current NEP-366 relayer tooling~~ (decided 2026-11-04: near-api-js 7.4; relayer has a full-access key on a dedicated account, §14 B10).
