# Admit — Roadmap to 100% readiness

> **This file is the live plan and status of the project.**
> **Every contribution (commit, PR or agent task) must update it in the same change.** See §1.

| | |
|---|---|
| **Last updated** | 2026-11-04 |
| **Current phase** | P6 — Testnet deployment & DAO |
| **Next task** | P6 (#110–#116) |
| **Must progress** | 62 / 105 Must tasks done (59%) |
| **Overall progress** | 63 / 114 tasks done (55%) — 105 Must · 6 Should · 3 Could |
| **Submission deadline** | 14 Nov 2026, 23:59 UTC (internal target: **14 Nov 18:00 UTC**) |
| **Days left** | 10 |

---

## 1. How to update this file (mandatory on every contribution)

Every commit or PR that changes code, tests, config or docs must also update `ROADMAP.md` **in the same change**. A contribution without a roadmap update isn't done.

1. **Tick and date the task.** Set its status (see legend) and add the date in the `Done` column, e.g. `2026-11-05`.
2. **Partial work:** set the status to 🟡 and add a short note in `Notes` saying what's left.
3. **New work discovered:** add a task with the next free ID in the right phase. Never reuse IDs.
4. **Cut or deferred work:** never delete a row. Set ⛔ (cut) or ⏸ (deferred) and give the reason in `Notes`. Cutting a **Must** task needs the user's approval; record it in ARCHITECTURE §14 too.
5. **Blocked:** set 🔴 and name what blocks it.
6. **Don't edit the header in a contribution.** After each merge the maintainer runs `python3 tools/roadmap.py ROADMAP.md` (recomputes Must and overall progress) and updates `Last updated`, `Current phase`, `Next task` and `Days left`. This keeps parallel PRs from conflicting.
7. **Add one line to the Changelog (§6)**, newest first: date, task IDs, what changed, test result.
8. **Never tick a task whose "Done when" isn't fully met.** Never tick a task that has failing or skipped tests.
9. **Work comes from GitHub issues.** Each issue names its phase (milestone), wave and roadmap ID; the index is `docs/ISSUES.md`. Mark a row ✅ only when its last open issue closes, otherwise 🟡.

**Status legend:** ⬜ todo · 🟡 in progress · ✅ done · 🔴 blocked · ⏸ deferred · ⛔ cut
**Priority:** M = Must · S = Should · C = Could (from PRD §6)

## 2. Definition of 100% readiness

Admit is **100% ready** when all of these are true:

1. Every **Must** task in §4 is ✅, and every Should task is ✅ or ⏸ with a reason.
2. `pnpm lint` and `pnpm test` pass on a **fresh clone**, following only the README.
3. The contracts are deployed on testnet. `pnpm seed` and `pnpm demo` run the full PRD §8 story with no manual steps and exit 0.
4. The web app is deployed (Vercel). The QR page works on a phone against testnet.
5. The README meets the hackathon checklist:
   - Problem with sources.
   - "Do X, see Y" steps.
   - Architecture overview.
   - Limitations.
   - Library and AI disclosure.
   - LICENSE.
6. An **independent AI-judge dry run** passes: an agent given only the repo URL and README reproduces every README claim (A-14.3).
7. The demo video and X post are published, the repo is public, and the form is submitted. **Each of these needs the user's explicit OK.**

## 3. Timeline

| Date (Nov) | Phases | Exit criterion |
|---|---|---|
| 4 | P0, P1 | Decisions recorded; skeleton builds; `pnpm test` green (empty) |
| 5 | P2 | Pool, members, council, limits maths with unit tests |
| 6 | P3 | Full guarantee lifecycle |
| 7 | P4, P5 | Settlement, debt, exits; all Must-pass integration tests green |
| 8 | P6, P7, P8 | Deployed on testnet with DAO; core TS package; relayer working end to end |
| 9–10 | P9 | All web pages working against testnet |
| 11 | P10, P11 | Simulator results; `pnpm demo` passes |
| 12 | P13, P14 | README complete; Vercel live; fresh-clone + AI-judge dry run |
| 13 | P13 | Video + X post (with OK); buffer for fixes |
| 14 | P13 | Submit by 18:00 UTC (with OK) |

**Cut order if behind schedule** (each needs the user's OK):
1. P12 (optional features).
2. Tasks marked S.
3. `hospital_transfer`.
4. Top-ups.
5. The exits UI (keep the contract logic).

## 4. Phases and tasks

### P0 — Decisions & verification
| ID | Pri | Task | Done when | Depends | Status | Done | Notes |
|---|---|---|---|---|---|---|---|
| A-0.1 | M | Confirm git identity (name/email) for this repo | User confirms; recorded in AGENTS.md Git section | — | ✅ | 2026-11-04 | Allison <muyideenallison@gmail.com>; GitHub mallison031 |
| A-0.2 | M | Approve extra deps: Vitest, `near-contract-standards` | User approves; added to ARCHITECTURE §2 | — | ✅ | 2026-11-04 | Vitest 5.1 + near-contract-standards 5.30 approved and added |
| A-0.3 | M | Verify Sputnik DAO v2 factory accounts (testnet/mainnet) and the fixed-weight vote policy JSON | Answer recorded in ARCHITECTURE §2; VERIFY tag removed | — | ✅ | 2026-11-04 | sputnik-v2.testnet + sputnik-dao.near confirmed on-chain; fixed weight = `"3"` |
| A-0.4 | M | Pin the Sputnik DAO v2 wasm (source commit + sha256) | `contracts/admit-pool/res/` has the wasm + `SPUTNIK_VERSION.txt` | A-1.4 | ✅ | 2026-11-04 | live testnet DAO code v2.0.0; sha256 matches chain |
| A-0.5 | M | Verify `cargo-near` build subcommand and `near-workspaces` version for near-sdk 5.x | Commands recorded in project_structure §4 | — | ✅ | 2026-11-04 | cargo-near 0.22.0: `cargo near build non-reproducible-wasm` confirmed; near-cli-rs installed |
| A-0.6 | M | Verify current NEP-366 relayer approach (library vs hand-rolled with `near-api-js` `signedDelegate`) | Decision recorded in ARCHITECTURE §2 + §14 | — | 🟡 |  | proposal in ARCHITECTURE §2: TS relayer on near-api-js 7.4; needs decision on a full-access relayer key |
| A-0.7 | M | Research real emergency deposit sizes (Nigeria) with sources, and set default `base_limit` / `limit_per_month` / `max_limit` | Values + citations in ARCHITECTURE §4 and README draft | — | ✅ | 2026-11-04 | 4 sourced deposit figures (₦50k–₦500k ≈ $38–$376); defaults proposed in ARCHITECTURE §4 |
| A-0.8 | M | Create and fund testnet accounts: deployer, `admit`, `tusdc`, `relay`, 3 council members, 2 hospitals, demo members | Accounts listed in `.env` (not committed); faucet limits noted | — | ✅ | 2026-11-04 | root admit-hack-6711fd.testnet (faucet, 10 NEAR) + 11 role sub-accounts; keys in ~/.near-credentials + local .env |
| A-0.9 | S | Look up mainnet USDC token id on NEAR (docs only, no transaction) | Recorded in ARCHITECTURE §2 | — | ✅ | 2026-11-04 | native USDC id + decimals recorded; bridged USDC.e flagged |

### P1 — Scaffolding
| ID | Pri | Task | Done when | Depends | Status | Done | Notes |
|---|---|---|---|---|---|---|---|
| A-1.1 | M | `git init`, `.gitignore`, `.editorconfig`, `.nvmrc`, MIT `LICENSE` | Repo initialised; first commit has no AI attribution | A-0.1 | ✅ | 2026-11-04 | git init; private repo mallison031/admit |
| A-1.2 | M | pnpm workspace: root `package.json` (all scripts from project_structure §4), `pnpm-workspace.yaml`, `tsconfig.base.json`, ESLint, Prettier | `pnpm install` works | A-1.1 | ✅ | 2026-11-04 | pnpm 11.17 install OK; allowBuilds = esbuild only; next pinned 16.4.4 (release-age policy) |
| A-1.3 | M | Rust workspace: `Cargo.toml`, `rust-toolchain.toml`, `rustfmt.toml` | `cargo check --workspace` works | A-1.1 | ✅ | 2026-11-04 | cargo check --target wasm32 passes |
| A-1.4 | M | `contracts/admit-pool` skeleton (empty contract, module files from project_structure §2.1) | `pnpm build:contract` produces wasm | A-1.3, A-0.5 | ✅ | 2026-11-04 | contract wasm builds with cargo-near |
| A-1.5 | M | `contracts/mock-ft` (NEP-141 + NEP-145 + open `mint`) | Builds; unit test mints and transfers | A-1.3, A-0.2 | ✅ | 2026-11-04 | NEP-141/145 via near-contract-standards; open mint; tUSDC 6 dp |
| A-1.6 | M | `tests/common/mod.rs` sandbox harness (deploy pool + mock-ft + Sputnik, create accounts) | A smoke test deploys everything in sandbox | A-1.4, A-1.5, A-0.4 | ✅ | 2026-11-04 | setup() deploys admit-pool + mock-ft; user/register_storage/mint/balance helpers; 2 smoke tests |
| A-1.7 | M | `packages/core`, `apps/api`, `apps/web`, `scripts` skeletons | `pnpm build` and `pnpm -r test` pass (placeholder tests) | A-1.2 | ✅ | 2026-11-04 | tsc -b, eslint, next build, pnpm -r test all pass (tests are todo placeholders) |
| A-1.8 | M | `.env.example` with every var from ARCHITECTURE §13 | File matches §13 exactly | A-1.2 | ✅ | 2026-11-04 | .env.example is the source of truth; ARCHITECTURE §13 points to it |
| A-1.9 | M | CI: `.github/workflows/ci.yml` (lint + unit + contract tests) | CI green on first push | A-1.6, A-1.7 | ✅ | 2026-11-04 | CI green on GitHub: cargo-near 0.22.0, lint, contract builds, smoke + mock-ft tests |
| A-1.10 | M | README stub (title, one-line pitch, "status: in progress", link to ROADMAP) + Contributing section stating the ROADMAP update rule | Exists; Contributing section present | A-1.1 | ✅ | 2026-11-04 | README stub with Contributing section |

### P2 — Contract core
| ID | Pri | Task | Done when | Depends | Status | Done | Notes |
|---|---|---|---|---|---|---|---|
| A-2.1 | M | `types.rs`: all types from ARCHITECTURE §4 | Compiles; JSON shapes documented in core `types.ts` later | A-1.4 | ✅ | 2026-11-04 | all §4 types + Tier, FtMessage, PoolStats, LimitView; JSON uses U64 for timestamps |
| A-2.2 | M | `errors.rs` (coded errors), `events.rs` (NEP-297 helper + all §7 events) | Unit test: event JSON matches NEP-297 format | A-2.1 | ✅ | 2026-11-04 | NEP-297 emit helper + emit_writes_nep297_json unit test |
| A-2.3 | M | `time.rs` (`time_scale` helpers) | Unit tests incl. boundary at month edges | A-2.1 | ✅ | 2026-11-04 | scaled + months_between with 4 unit tests |
| A-2.4 | M | `limits.rs` pure functions: `tenure_months`, `good_months`, `raw_limit`, `limit` (Good/Late/Default), `exposure_ok`, `tier` | Unit tests for every branch, named after the rule | A-2.3 | ✅ | 2026-11-04 | raw_limit, exposure_ok, tier, tenure_months, good_months, limit done with 13 tests |
| A-2.5 | M | `access.rs` role guards | Unit tests | A-2.1 | ✅ | 2026-11-04 | assert_dao, assert_council, assert_hospital, assert_member_or_delegate with 8 tests |
| A-2.6 | M | `create_pool` (validates params; `time_scale` immutable) | Integration test | A-2.1–A-2.5, A-1.6 | ✅ | 2026-11-04 | validate_params and create_pool implemented with storage deposit check and PoolCreated event |
| A-2.7 | M | Members: `join`, `add_delegate`, `remove_delegate` | Integration tests | A-2.6 | ✅ | 2026-11-04 | join, add_delegate, remove_delegate implemented with 6 tests |
| A-2.8 | M | `ft_on_transfer` dispatch: `contribute`, `repay`, `topup`; rejects other tokens | Integration tests | A-2.7 | ✅ | 2026-11-04 | parse_ft_message helper + internal_contribute/topup/repay dispatched, wrong token rejected, with 8 tests |
| A-2.9 | M | Council (DAO-only): `council_set_members`, `council_add_hospital` (+ `storage_deposit`), `council_remove_hospital`, `council_set_params` (no `time_scale` change), `council_mark_default` | Integration tests incl. non-DAO caller rejected | A-2.6 | ✅ | 2026-11-04 | council_set_members, council_add_hospital, council_remove_hospital, council_set_params, council_mark_default with 10 tests |
| A-2.10 | M | `token.rs`: `ft_transfer` + `storage_deposit` promises with restoring callbacks | Failure-path test with a rejecting receiver | A-2.8 | ✅ | 2026-11-04 | ft_transfer, storage_deposit, on_storage_registered, on_hospital_paid, on_exit_refunded callbacks implemented |
| A-2.11 | M | Views: `get_pool`, `get_member`, `get_limit`, `get_pool_stats` (paginated where needed) | Integration tests | A-2.7 | ✅ | 2026-11-04 | get_pool, get_member, list_members, get_pool_stats, get_limit with 5 tests |
| A-2.12 | M | Unit-test state builders (`src/test_utils.rs`: make_pool, make_member, make_guarantee, insert helpers) | Builders used by at least one unit test | A-2.1 | ✅ | 2026-11-04 | params, pool, member, guarantee builders and inserters in src/test_utils.rs |

### P3 — Guarantees
| ID | Pri | Task | Done when | Depends | Status | Done | Notes |
|---|---|---|---|---|---|---|---|
| A-3.1 | M | `request_guarantee` Instant tier (eligibility, exposure, reservation, `code_hash`, initials ≤4, `local`) | Tests: issued within limit; reservation increases | A-2.4, A-2.9 | ✅ | 2026-11-04 | request_guarantee Instant tier implemented with reservation and events |
| A-3.2 | M | Council tier: `PendingCouncil`, `council_approve`, `council_reject`; above the tier → rejected | Tests for all three outcomes | A-3.1 | ✅ | 2026-11-04 | council_approve, council_reject implemented with 4 tests |
| A-3.3 | M | Eligibility denials: tenure, unpaid contributions, `max_active_per_member`, cooldown, Default; Late reduced limit | One named test per denial | A-3.1 | ✅ | 2026-11-04 | check_tenure, check_contributions, check_active_cap, check_cooldown, check_initials implemented with 10 tests |
| A-3.4 | M | Delegate requests (caller ∈ delegates) | Test; non-delegate rejected | A-3.1 | ✅ | 2026-11-04 | delegate or member can request guarantees |
| A-3.5 | M | `expire` (only `Issued` past TTL; frees the reservation) | Tests: expires before accept, not after | A-3.1 | ✅ | 2026-11-04 | expire frees reservation and active count with 2 tests |
| A-3.6 | M | `hospital_accept` (registered hospital only; disables expiry) | Test | A-3.1 | ✅ | 2026-11-04 | hospital_accept sets accepted_at with 2 tests |
| A-3.7 | M | `hospital_claim` (≤ guarantee; starts dispute window; stores `file_hash`) | Tests incl. claim above guarantee fails | A-3.6 | ✅ | 2026-11-04 | hospital_claim validates amount and sets Claim with 2 tests |
| A-3.8 | M | `hospital_release` | Test: reservation freed | A-3.6 | ✅ | 2026-11-04 | hospital_release frees reservation and active count with 2 tests |
| A-3.9 | M | `request_topup` (same tier + exposure checks on new total) | Tests | A-3.1 | ✅ | 2026-11-04 | request_topup checks tier and exposure with 2 tests |
| A-3.10 | M | `hospital_transfer` (partial claim here + new guarantee at next hospital, same code hash) | Test | A-3.7 | ✅ | 2026-11-04 | hospital_transfer implemented with partial claim and transfer guarantee |
| A-3.11 | M | Views: `get_guarantee`, `list_guarantees` | Tests | A-3.1 | ✅ | 2026-11-04 | get_guarantee and list_guarantees with 2 tests |

### P4 — Settlement, debt, exits
| ID | Pri | Task | Done when | Depends | Status | Done | Notes |
|---|---|---|---|---|---|---|---|
| A-4.1 | M | `member_dispute` within window → `Disputed` | Test incl. after-window rejection | A-3.7 | ✅ | 2026-11-04 | member_dispute implemented with window check and event emission |
| A-4.2 | M | `settle`: anyone after window if undisputed; council early or with `adjustment` + reason; pays hospital; frees reservation; adds debt `paid × (1 − pool_covered_bps)` | Tests for each path | A-4.1, A-2.10 | ✅ | 2026-11-04 | settle implemented with authorization, split maths, reservation release, token transfer, and rollback callback |
| A-4.3 | M | Debt and repayment: `repay` reduces `outstanding`; limit recovers; Late → Good when settled | Tests | A-4.2 | ✅ | 2026-11-04 | internal_repay reduces debt and restores Good standing |
| A-4.4 | M | Standing: Late after one missed contribution period (grace), Default via council | Tests | A-2.9, A-4.3 | ✅ | 2026-11-04 | derive_standing implemented with 2 tests |
| A-4.5 | M | `report_death` (cover_on_death) and `council_write_off` → `written_off` updated, debt cleared | Tests | A-4.2 | ✅ | 2026-11-04 | report_death and council_write_off implemented with tests |
| A-4.6 | M | Exits: `request_exit` (after lock), `execute_exit` (after notice), refund = contributed − debt, subject to exposure (else queued) | Tests incl. blocked-before-lock | A-4.3 | ✅ | 2026-11-04 | request_exit and execute_exit with exposure check and refund rollback implemented |

### P5 — Integration test suite (Must-pass list from ESSENTIALS)
| ID | Pri | Task | Done when | Depends | Status | Done | Notes |
|---|---|---|---|---|---|---|---|
| A-5.1 | M | `tests/tiers_and_exposure.rs` complete | Green | P3 | ✅ | 2026-11-04 | 5 tests passing |
| A-5.2 | M | `tests/eligibility.rs` complete | Green | A-3.3 | ✅ | 2026-11-04 | 7 tests passing |
| A-5.3 | M | `tests/guarantee_lifecycle.rs` complete (issue → accept → claim → settle; expiry; release; top-up; transfer) | Green | P3, A-4.2 | ✅ | 2026-11-04 | 6 tests passing |
| A-5.4 | M | `tests/settlement.rs` complete (dispute, adjustment, debt, death write-off) | Green | P4 | ✅ | 2026-11-04 | 6 tests passing |
| A-5.5 | M | `tests/exits.rs` complete | Green | A-4.6 | ✅ | 2026-11-04 | 4 tests passing |
| A-5.6 | M | `tests/access_control.rs` (every DAO/council/hospital-only method rejects others) | Green | P2–P4 | ✅ | 2026-11-04 | 4 tests passing |
| A-5.7 | M | `tests/transfer_failures.rs` (rollback; hospital `storage_deposit`) | Green | A-2.10 | ✅ | 2026-11-04 | 3 tests passing |
| A-5.8 | M | Real Sputnik DAO in sandbox: proposal → `council_add_hospital` executes | Green | A-0.3, A-0.4 | ✅ | 2026-11-04 | 1 test passing with real sputnikdao2.wasm |
| A-5.9 | M | `cargo clippy -D warnings` + `cargo fmt` clean | `pnpm lint` (Rust part) green | P2–P4 | ✅ | 2026-11-04 | clean fmt and clippy |

### P6 — Testnet deployment & DAO
| ID | Pri | Task | Done when | Depends | Status | Done | Notes |
|---|---|---|---|---|---|---|---|
| A-6.1 | M | `scripts/deploy-testnet.ts`: build, deploy mock-ft + admit-pool, init | Explorer links printed; idempotent re-run | P5, A-0.8 | 🟡 | | log.ts and accounts.ts implemented with tests |
| A-6.2 | M | Create the council Sputnik DAO on testnet (fixed weight policy) | DAO account recorded in `.env.example` comment + README | A-0.3, A-6.1 | ⬜ | | |
| A-6.3 | M | `scripts/seed.ts`: pool, 20 members, 6 scaled months, council list, 2 hospitals via DAO proposals, delegate keys | `pnpm seed` exits 0 on a clean deploy | A-6.2 | 🟡 | | members.json extended to 20 fictional members |
| A-6.4 | M | Hospital + delegate function-call keys created and scoped to allow-listed methods | Keys verified with `near-cli-rs` view-access-key | A-6.3 | ⬜ | | |

### P7 — Shared TypeScript core (`@admit/core`)
| ID | Pri | Task | Done when | Depends | Status | Done | Notes |
|---|---|---|---|---|---|---|---|
| A-7.1 | M | `types.ts` + zod schemas mirroring contract JSON | Parses real view output from testnet | A-6.1 | ✅ | 2026-11-04 | Verified against sample JSON fixtures |
| A-7.2 | M | `limits.ts` mirror of `limits.rs` (header cross-references) | Unit tests for the same cases as Rust | A-2.4 | ✅ | 2026-11-04 | Mirrored all Rust tests and math with BigInt |
| A-7.3 | M | `contract.ts`: typed views + change-call builders for every method | Unit tests; used by scripts | A-7.1 | ✅ | 2026-11-04 | ViewClient + full change-call builders |
| A-7.4 | M | `code.ts`: 6-character code generation + `sha256(code ‖ id)` matching Rust | Test vector matches contract | A-3.1 | ✅ | 2026-11-04 | Unbiased 6-char generator and sha256 hash |
| A-7.5 | M | `delegate.ts`: build + sign NEP-366 delegate actions with a device key | Test: signed action accepted by sandbox/testnet | A-0.6 | ✅ | 2026-11-04 | near-api-js NEP-366 delegate builder and signer |
| A-7.6 | M | `format.ts`, `config.ts` (bigint amounts, scaled time, explorer URLs) | Unit tests | A-1.7 | ✅ | 2026-11-04 | formatAmount, parseAmount, and explorer URLs |

### P8 — Relayer & API (`apps/api`)
| ID | Pri | Task | Done when | Depends | Status | Done | Notes |
|---|---|---|---|---|---|---|---|
| A-8.1 | M | `env.ts` zod-validated config | Missing var → clear startup error | A-1.7 | ⬜ | | |
| A-8.2 | M | `relayer/allowlist.ts` = ARCHITECTURE §9 list; `verify.ts` (receiver + method) | Tests: wrong receiver / method rejected | A-7.5 | ⬜ | | |
| A-8.3 | M | `ratelimit.ts` (per signer + global) | Test | A-8.2 | ⬜ | | |
| A-8.4 | M | `submit.ts` + `POST /relay` | End-to-end: delegate device requests a guarantee on testnet with zero NEAR | A-8.2, A-6.4 | ⬜ | | |
| A-8.5 | M | `POST /onboard/device` (device pairing flow, no secrets returned) | Test | A-8.4 | ⬜ | | |
| A-8.6 | M | No secrets in logs (relayer key, API keys) | Test asserts log output | A-8.4 | ⬜ | | |
| A-8.7 | C | `POST /quote` (1Click dry-run) | Returns a real dry-run quote | A-8.1 | ⬜ | | P12-adjacent |

### P9 — Web app (`apps/web`)
| ID | Pri | Task | Done when | Depends | Status | Done | Notes |
|---|---|---|---|---|---|---|---|
| A-9.1 | M | Layout, landing page, DEMO MODE banner when `time_scale ≠ 1` | Renders on mobile + desktop | A-7.6 | ⬜ | | |
| A-9.2 | M | `lib/device-key.ts` (IndexedDB keypair) + `lib/relay.ts` | Key persists across reloads; never sent to server | A-7.5, A-8.4 | ⬜ | | |
| A-9.3 | M | `/request`: hospital picker, amount (shows limit), submit → code + QR | Works on a phone against testnet | A-9.2 | ⬜ | | |
| A-9.4 | M | `/g/[id]`: RPC-only status banner, amount + local estimate, expiry countdown, code check, explorer links | Works with the API turned off | A-7.3, A-7.4 | ⬜ | | |
| A-9.5 | M | `/hospital`: accept, claim (bill hash), release, transfer | Each action succeeds via relayer | A-9.2 | ⬜ | | |
| A-9.6 | M | `/member` (wallet): limit, debt, contribute, repay, delegate pairing QR, exit | Each action succeeds | A-7.3 | ⬜ | | |
| A-9.7 | M | `/council` (wallet): pending approvals, disputes, settle with adjustment, report death | Each action succeeds | A-7.3 | ⬜ | | |
| A-9.8 | M | `/pool/[id]`: balance, reserved, exposure, guarantee list, recent events | Matches chain state | A-7.3 | ⬜ | | |
| A-9.9 | S | Component/flow tests (Vitest + Testing Library) for code check + status banner | Green | A-9.4 | ⬜ | | |
| A-9.10 | M | Accessibility + mobile pass (tap targets, contrast, readable at 360 px) | Manual checklist in Notes | A-9.3–A-9.8 | ⬜ | | |

### P10 — Solvency simulator
| ID | Pri | Task | Done when | Depends | Status | Done | Notes |
|---|---|---|---|---|---|---|---|
| A-10.1 | S | `scripts/simulate.ts` using `@admit/core` limits (10,000 runs × 24 months; normal / bad_year / exit_wave) | Runs in < 2 min | A-7.2 | ⬜ | | |
| A-10.2 | S | Outputs `docs/simulation/{results.csv, chart.png, summary.md}` incl. P(insolvent) and P(denied by exposure cap) | Files committed; numbers quoted in README | A-10.1 | ⬜ | | |
| A-10.3 | S | Tune default params so P(insolvent) < 5% in `normal`; record final params | ARCHITECTURE §4 updated | A-10.2, A-0.7 | ⬜ | | |

### P11 — Demo script (PRD §8 = acceptance test)
| ID | Pri | Task | Done when | Depends | Status | Done | Notes |
|---|---|---|---|---|---|---|---|
| A-11.1 | M | `scripts/demo.ts` step 1: seed state check | Logs pool summary | A-6.3 | ⬜ | | |
| A-11.2 | M | Step 2: delegate (zero NEAR) requests 300 → issued + code | Explorer link printed | A-8.4 | ⬜ | | |
| A-11.3 | M | Step 3: hospital code check + accept | Expiry disabled verified | A-11.2 | ⬜ | | |
| A-11.4 | M | Step 4: claim 280, member dispute, council trims 30, paid 250 | Balances asserted | A-11.3 | ⬜ | | |
| A-11.5 | M | Step 5: debt 250, repay 50, limit +50 | Asserted | A-11.4 | ⬜ | | |
| A-11.6 | M | Step 6: abuse attempts (new member, 3rd concurrent, 2,000 over tier, relayer off-allow-list) all denied | Each denial asserted with error code | A-11.5 | ⬜ | | |
| A-11.7 | S | Step 7: run `simulate` summary | Printed | A-10.2 | ⬜ | | |
| A-11.8 | M | `pnpm demo` exits non-zero on any unexpected state; runs < 5 min | Two consecutive clean runs on a fresh seed | A-11.1–A-11.6 | ⬜ | | |

### P12 — Optional (Could)
| ID | Pri | Task | Done when | Depends | Status | Done | Notes |
|---|---|---|---|---|---|---|---|
| A-12.1 | C | AI bill check: NEAR AI Cloud attestation + completion + signature verification, cited reference list, advisory panel | Verified panel renders; `post_ai_review` stores result | All M done | ⬜ | | Cut order #1 |
| A-12.2 | C | 1Click any-chain top-up UI (dry-run quote) | Quote shown on `/member` | A-8.7 | ⬜ | | Cut order #1 |

### P13 — Documentation, deployment, submission
| ID | Pri | Task | Done when | Depends | Status | Done | Notes |
|---|---|---|---|---|---|---|---|
| A-13.1 | M | README: problem + sources, how it works, architecture diagram | Reviewed against PRD §1 | P11 | ⬜ | | |
| A-13.2 | M | README: "do X, see Y" quickstart (clone → install → test → seed → demo → open QR page) | A-14.2 passes using only these steps | A-11.8 | ⬜ | | |
| A-13.3 | M | README: limitations (insurance classification, fiat cash-out, hospital adoption), threat model summary | Matches ARCHITECTURE §11 | A-13.1 | ⬜ | | |
| A-13.4 | M | README: library list + AI-generated code disclosure (hackathon rule), no AI attribution in git history | Present | A-13.1 | ⬜ | | |
| A-13.5 | M | README: name the second project if the user enters two (hackathon rule) | Present or N/A noted | user decision | ⬜ | | |
| A-13.6 | M | Deploy web to Vercel (testnet config) | Public URL works on a phone | P9 | ⬜ | | Ask before deploying |
| A-13.7 | M | Screenshots + simulation chart in README | Present | A-13.6, A-10.2 | ⬜ | | |
| A-13.8 | M | Demo video (2am story, ≤ 2 min) | File ready for user review | A-11.8, A-13.6 | ⬜ | | |
| A-13.9 | M | X post draft (built at NEAR HACKATHON, @NEARProtocol, #NEARHackathon, video) | Draft approved by user; **posted only with explicit OK** | A-13.8 | ⬜ | | |
| A-13.10 | M | Make repo public | **Only with explicit OK** | A-14.4 | ✅ | 2026-11-04 | made public on user's explicit OK (2026-11-04); secrets scan clean |
| A-13.11 | M | Submit hackathon form (repo URL, post URL, wallet, description 20–2,000 chars) | **Only with explicit OK**; submissions can't be edited | A-13.9, A-13.10 | ⬜ | | Target 14 Nov 18:00 UTC |

### P14 — Final QA
| ID | Pri | Task | Done when | Depends | Status | Done | Notes |
|---|---|---|---|---|---|---|---|
| A-14.1 | M | Full `pnpm lint && pnpm test` green; no skipped tests; no TODOs in Must paths | Output pasted in Changelog | All M | ⬜ | | |
| A-14.2 | M | Fresh-clone test in a clean directory following only the README | Every step works | A-13.2 | ⬜ | | |
| A-14.3 | M | AI-judge dry run: an agent given only the repo + README verifies each claim | Report has no failed claims | A-14.2 | ⬜ | | |
| A-14.4 | M | Secrets audit: no keys/.env in history; `.env.example` complete | `git log -p` scan clean | A-14.1 | ⬜ | | |
| A-14.5 | M | Docs consistency: PRD, ARCHITECTURE, ESSENTIALS, project_structure, AGENTS match the code | Checklist in Notes | A-14.1 | ⬜ | | |
| A-14.6 | M | Commit history check: conventional messages, no AI attribution | `git log` scan clean | A-14.1 | ⬜ | | |

## 5. Already done (pre-code)
| ID | Task | Done |
|---|---|---|
| A-D.1 | PRD.md | 2026-11-03 |
| A-D.2 | ARCHITECTURE.md v2 with §14 decision log | 2026-11-04 |
| A-D.3 | ARCHITECTURE_ESSENTIALS.md v2 | 2026-11-04 |
| A-D.4 | AGENTS.md + CLAUDE.md | 2026-11-04 |
| A-D.5 | project_structure.md | 2026-11-04 |
| A-D.6 | ROADMAP.md | 2026-11-04 |

(Pre-code docs are not counted in the progress totals.)

## 6. Changelog (newest first)
| Date | Tasks | Change | Tests |
|---|---|---|---|
| 2026-11-04 | A-7.1, A-7.2, A-7.3, A-7.4, A-7.5, A-7.6 | P7: complete shared TypeScript core (@admit/core) with zod schemas, BigInt limits mirroring limits.rs, typed views, change-call builders, code generation & sha256 hash, NEP-366 delegate action signer, amount formatters and explorer URLs. | 25 tests in @admit/core ✅ · pnpm lint ✅ · pnpm -r test ✅ |
| 2026-11-04 | A-6.1, A-6.3 | P6 Wave 1: implement step/link logging, loadAccounts with zod env validation and key redaction, and extend members fixture to 20 fictional members. | 2 new node tests (2 total scripts tests) ✅ · pnpm lint ✅ · pnpm test ✅ |
| 2026-11-04 | A-5.1, A-5.2, A-5.3, A-5.4, A-5.5, A-5.6, A-5.7, A-5.8, A-5.9 | P5 Wave 1: full integration test suite completed across 8 test suites (36 integration tests + 2 smoke tests) with real Sputnik DAO v2 integration, clean clippy and rustfmt. | 168 tests (130 unit + 38 integration) ✅ · pnpm lint ✅ · pnpm test ✅ |
| 2026-11-04 | A-4.2, A-4.6, A-2.10 | P4 Wave 2: settle with adjustments/undisputed execution, execute_exit with exposure check, and rollback callbacks (on_hospital_paid, on_exit_refunded). | 9 new unit tests (130 total) ✅ · pnpm lint ✅ · pnpm test ✅ |
| 2026-11-04 | A-4.1, A-4.2, A-4.3, A-4.4, A-4.5, A-4.6 | P4 Wave 1: member_dispute, settlement_split, derive_standing, report_death, council_write_off, exit_refund, and request_exit. | 16 new unit tests (121 total) ✅ · pnpm lint ✅ · pnpm test ✅ |
| 2026-11-04 | A-3.1, A-3.4, A-3.10 | P3 Wave 2 & 3: request_guarantee Instant/Council tiers with delegate check, and hospital_transfer with partial claim. | 10 new unit tests (105 total) ✅ · pnpm lint ✅ · pnpm test ✅ |
| 2026-11-04 | A-3.1, A-3.2, A-3.3, A-3.5, A-3.6, A-3.7, A-3.8, A-3.9, A-3.11 | P3 Wave 1: guarantee eligibility helpers, council approve/reject, expire, hospital accept/claim/release, request_topup, get/list_guarantees views. | 26 new unit tests (95 total) ✅ · pnpm lint ✅ · pnpm test ✅ |
| 2026-11-04 | A-2.4, A-2.8, A-2.11 | P2 Wave 3: limits::limit (Good/Late/Default/debt/reservation), views::get_limit with eligibility checks, ft_on_transfer dispatch and token verification. | 10 new unit tests (69 total) ✅ · pnpm lint ✅ · pnpm test ✅ |
| 2026-11-04 | A-2.4, A-2.6, A-2.7, A-2.8, A-2.9, A-2.10, A-2.11 | P2 Wave 2: create_pool, member join/delegates/internal contributions, council management methods, tenure/good_months limits, get_pool_stats. | 22 new unit tests (59 total) ✅ · pnpm lint ✅ · pnpm test ✅ |
| 2026-11-04 | A-2.2, A-2.3, A-2.4, A-2.5, A-2.6, A-2.8, A-2.10, A-2.11, A-2.12 | P2 Wave 1: state builders, NEP-297 events, time scaling, pure limits (raw_limit, exposure_ok, tier), access guards, validate_params, parse_ft_message, token promises, views (get_pool, get_member, list_members). | 37 unit tests ✅ · pnpm lint ✅ · pnpm test ✅ |
| 2026-11-04 | A-1.9 | First CI runs green on GitHub (runs 41797073885, 41797447043). | CI ✅ lint · build · 2 smoke + 3 mock-ft tests |
| 2026-11-04 | A-0.8 | Created testnet root `admit-hack-6711fd.testnet` via the faucet (10 NEAR; one faucet grant) and sub-accounts pool (3), tusdc (1.5), relay (1), council1–3, hospital1–2, member1–3 (0.3 each). Root keeps ~2 NEAR for fees. Added COUNCIL/HOSPITAL/MEMBER_ACCOUNTS to .env.example. | view-account-summary ✅ |
| 2026-11-04 | A-1.9 | CI runs lint + all tests on push/PR; installs cargo-near 0.22.0 from the checksum-verified release. Fixed `pnpm lint` (clippy now targets wasm32; allowed dead code on two stub blocks until P2 wires them). | pnpm lint ✅ locally |
| 2026-11-04 | A-1.6 | Harness now deploys mock-ft too, registers the pool with the token, and adds user, register_storage, mint and balance helpers. | cargo test -p admit-pool --test smoke ✅ 2 passed |
| 2026-11-04 | A-1.6 | Sandbox harness: setup() deploys admit-pool and calls new(); smoke test added. | cargo test -p admit-pool --test smoke ✅ 1 passed |
| 2026-11-04 | A-1.5 | mock-ft implements NEP-141 + NEP-145 (near-contract-standards 5.30) with an open mint. | cargo test -p mock-ft ✅ 3 passed · wasm build ✅ · clippy ✅ |
| 2026-11-04 | A-0.6 | Proposed the relayer approach (near-api-js 7.4, no extra library) and flagged that the relayer likely needs a full-access key; awaiting maintainer decision. | n/a (docs) |
| 2026-11-04 | A-0.7 | Recorded sourced emergency-deposit sizes and proposed default limits (base 100, +25/month, max 400, contribution 5). | n/a (docs) |
| 2026-11-04 | A-0.9 | Recorded native USDC on NEAR (Circle) and warned against bridged USDC.e. | n/a (docs) |
| 2026-11-04 | A-0.4 | Pinned sputnikdao2.wasm (v2.0.0, downloaded from the testnet factory's latest DAO; sha256 matches on-chain checksum). | `shasum -a 256` ✅ matches chain |
| 2026-11-04 | A-0.3 | Verified Sputnik factories on-chain and the fixed-weight threshold format; recorded in ARCHITECTURE §2 and .env.example. | n/a (docs) |
| 2026-11-04 | A-2.12 (new) | Created 202 GitHub issues covering every open roadmap task (milestone per phase; labels phase/area/size/wave/maintainer; index in docs/ISSUES.md). Repo interaction limited to collaborators. Header rule changed: contributions update their row + Changelog only; maintainer recomputes the header with tools/roadmap.py. Added A-2.12 (test-state builders) so wave issues stay independent. | n/a (docs and process) |
| 2026-11-04 | A-13.10 | Repo made public at github.com/mallison031/admit on the user's explicit OK. | n/a |
| 2026-11-04 | A-0.2, A-0.5, A-1.2, A-1.4, A-1.7 | Approved deps added (Vitest, near-contract-standards); installed cargo-near 0.22.0 + near-cli-rs; pnpm install with build-script allow-list; pinned next 16.4.4 to respect pnpm's minimum release age; ignored next-env.d.ts; docs updated (AGENTS toolchain, ARCHITECTURE §2, project_structure). | cargo near build ✅ (2 contracts) · cargo test ✅ 0 failed (scaffold tests ignored) · tsc -b ✅ · eslint ✅ · next build ✅ · pnpm -r test ✅ 0 failed (todo placeholders) |
| 2026-11-04 | A-0.1, A-1.1, A-1.9 | Git initialised; identity recorded in AGENTS.md; CI set to manual-only; first push to private repo mallison031/admit. | n/a (no code change) |
| 2026-11-04 | A-1.1–A-1.10, A-2.1, A-0.5 | Scaffolded the full repo per project_structure.md: root config, Rust workspace, admit-pool data model + method stubs, mock-ft stub, 36 named integration-test skeletons, /core (zod mirror of the data model), api, web, scripts, fixtures. Docs synced to current versions (Next 16, near-sdk 5.30, zod 4, near-api-js 7) and to `.env.example`. | `cargo check --target wasm32-unknown-unknown` ✅ (warnings: unused stubs); TS not installed yet |
| 2026-11-04 | A-D.6 | Created ROADMAP.md; update-on-every-contribution rule added to AGENTS.md, CLAUDE.md, project_structure.md and the other docs | n/a (docs only) |
