# AGENTS.md — Admit

Instructions for coding agents working in this repository.

## Project
Admit is a community emergency pool on NEAR. It issues an instant, on-chain payment guarantee that a hospital can verify by QR code, so treatment starts before anyone pays. It's designed as a **mutual-aid credit line, not insurance**. Custody, limits and guarantees live in one Rust contract (`contracts/admit-pool`). Sputnik DAO runs the hospital registry, parameters and council list. A NEP-366 relayer means nobody at the hospital needs NEAR. Track: **Social Money**.

## Read before coding
1. **`ARCHITECTURE_ESSENTIALS.md`**: read it at the start of every session. It's short, and it holds the non-negotiable decisions.
2. **`ARCHITECTURE.md`**: open only the section for your task. §14 is the decision log: why things are the way they are.
3. **`project_structure.md`**: where every file lives. Check it before creating or moving a file, and update it in the same change.
4. **`PRD.md`**: scope, priorities (Must / Should / Could) and the demo script (§8). The demo script is the acceptance test.
5. **`ROADMAP.md`**: the live task list and status. Pick your next task from it. **Update it in every contribution** (see "ROADMAP.md rule" below).

**Precedence:** ESSENTIALS non-negotiables > ARCHITECTURE > PRD. If the code or a task contradicts the docs, stop and say so. Don't quietly pick one.

## Hackathon constraints (hard)
- **Deadline:** 14 Nov 2026, 23:59 UTC.
- **Priority order:** Must → Should → Could. Don't start a Could item until every Must-pass test is green.
- **What counts:** only code written since 19 Oct 2026. Earlier code is baseline only.
- **Repository:** public, with an MIT `LICENSE`. The README must be machine-readable: what it does, the problem it solves, and step-by-step "do X, see Y" instructions. The hackathon pre-screen is done by AI agents that run the repo and check that it does what the README says.
- **Disclosure:** list in the README every library, template and AI-generated part of the code. This is required for AI-generated code to be allowed.
- **Testnet only.** Ask the user explicitly each time before any of these:
  - A mainnet transaction or spending real funds.
  - Posting on X.
  - Submitting the hackathon form.
  - Making the repo public.

## Toolchain
- Rust stable with the `wasm32-unknown-unknown` target, `cargo-near`, `near-cli-rs`.
- **Type-check contracts with `cargo check --target wasm32-unknown-unknown`.** near-sdk 5.30 deliberately fails a plain host `cargo check`. Build with `cargo near build`.
- Node ≥22, pnpm ≥9 (checked on Node 26, pnpm 11.17).
- **pnpm supply-chain settings** live in `pnpm-workspace.yaml`. `allowBuilds` lists the only dependencies allowed to run install scripts (esbuild); approve new ones with `pnpm approve-builds <pkg>`, never `--all`. Keep pnpm's minimum release age on: don't add `minimumReleaseAgeExclude` entries. Pin to an older version instead (e.g., `next` is pinned to 16.4.4).
- Check subcommand names with `cargo near --help` rather than guessing.

## Commands
| Command | What it does |
|---|---|
| `pnpm install` | Install workspace deps |
| `pnpm build` | Build contract wasm(s) and apps |
| `pnpm test` | All tests (contract unit + integration, packages, apps) |
| `pnpm test:contract` | Build wasm, then `cargo test` (unit + `near-workspaces` integration) |
| `pnpm lint` | `cargo clippy -- -D warnings`, `cargo fmt --check`, ESLint, `tsc --noEmit` |
| `pnpm dev` | Web app and API locally against testnet |
| `pnpm deploy:testnet` | Deploy contracts to the accounts in `.env` |
| `pnpm demo` | Run the PRD §8 story on testnet; exits non-zero on any unexpected state |

If a script doesn't exist yet, add it to the root `package.json` while scaffolding. Never document a command that doesn't work.

## How to work
- **Small changes.** One task, one reviewable change. If an edit touches more than 2 files, first write a 3–5 bullet plan.
- **Contract rules start with a failing test**: a unit test for pure rule functions, a `near-workspaces` test for flows. Then write the code. Every item under "Must-pass tests" in ESSENTIALS needs a test **named after the rule** (e.g., `large_spend_rejects_caregiver_circle_only`).
- **Run tests** with `pnpm test:contract` after any Rust change. Run `pnpm lint && pnpm test` before calling anything done.
- **Never report a task done with failing or skipped tests.** Paste the failure output instead.
- **`VERIFY` items:** confirm them against official docs, or with a sandbox or testnet call, before building on them. Then record the answer in `ARCHITECTURE.md` and remove the tag.
- **Dependencies:** don't add any beyond the stack table in `ARCHITECTURE.md` §2 without asking.
- **Keep the docs in sync.** When you change an interface, a state machine, a rule or an env var, update `ARCHITECTURE.md` and `ARCHITECTURE_ESSENTIALS.md` in the same change. Changing a non-negotiable needs the user's approval and a new row in §14.

## ROADMAP.md rule (mandatory on every contribution)
Every commit, PR or agent task that changes code, tests, config or docs **must update `ROADMAP.md` in the same change**. Work without a roadmap update is not done.
- Set the task status (⬜ todo, 🟡 in progress, ✅ done, 🔴 blocked, ⏸ deferred, ⛔ cut) and the `Done` date. Add notes for partial work.
- New work you discover becomes a new task with the next free ID. Never delete or renumber rows. Cuts and deferrals keep their row and give a reason. Cutting a Must task needs the user's approval.
- **Don't edit the header.** After each merge the maintainer runs `python3 tools/roadmap.py ROADMAP.md` and updates last updated, current phase, next task and days left. This keeps parallel PRs from conflicting.
- **Work comes from GitHub issues.** Each names its phase (milestone), wave and roadmap ID (index: `docs/ISSUES.md`). Mark a row ✅ only when its last open issue closes.
- Add one Changelog line: date, task IDs, what changed, test result.
- Never tick a task whose "Done when" isn't fully met, or that has failing or skipped tests.
- Full procedure: `ROADMAP.md` §1.

## Contract conventions (Rust, `near-sdk` 5.30)
- **Macros and types:** `#[near(contract_state)]` and `#[near(serializers = [borsh, json])]`. Token amounts are `U128` in JSON. Timestamps are `u64` nanoseconds from `env::block_timestamp()`.
- **Arithmetic:** checked only (`checked_add`, `checked_sub`, `checked_mul`). Never use `as` casts that can truncate.
- **Errors:** use `require!` with coded messages, e.g. `"E12_NOT_GUARDIAN: caller is not a guardian of this trust"`. List the codes in `src/errors.rs`.
- **Access control first.** Check the caller with `env::predecessor_account_id()` through one helper per role.
- **Ordering:** update state **before** any external call. Every `ft_transfer` has a callback that restores state if it fails.
- **Storage:** call `storage_deposit` on the token before the first transfer to any new account.
- **Events:** emit a NEP-297 event for every state change, through the single helper in `events.rs`.
- **Time:** go only through the `time.rs` helpers, which apply `time_scale`. Never compare raw durations.
- **No admin backdoors.** Don't add any mutating method that isn't listed in `ARCHITECTURE.md` §5.
- **Views:** paginated (`from_index`, `limit`) and cheap.

## TypeScript conventions
- **Types:** `strict: true` and no `any`. Shared types live in `packages/*`.
- **Inputs:** validate every API input with zod.
- **Chain state:** the frontend reads on-chain state with RPC view calls. It never trusts our own API for that.
- **Amounts:** handle token amounts as `bigint` or decimal strings, never as JS `number`.
- **Display:** show times in the user's timezone and amounts with their token symbol.

## Secrets and keys
- Never commit `.env`. `.env.example` is the source of truth for env vars (ARCHITECTURE §13 points to it). Keep it complete.
- Services sign with **function-call access keys** scoped to specific methods, never full-access keys.
- Never log private keys, seed phrases, API keys or JWTs.

## Definition of done
- `ROADMAP.md` is updated: your task row and a Changelog line (the header is recomputed after merge).
- The Must-pass tests for the touched area are green, `pnpm lint` is clean, and `pnpm demo` still passes.
- The README is updated if anything a judge can see has changed.
- The docs are updated if any interface or rule has changed.

## Ask the user before
- Changing a non-negotiable decision, or cutting a Must item.
- Adding a dependency or a new external service.
- Anything on mainnet, anything that spends funds, and anything outward-facing (X posts, the submission form, publishing the repo).
- Deleting files, rewriting git history, or force-pushing.

## Git
- Use one branch per task and small commits with conventional messages (`feat(contract): …`, `fix(web): …`, `test: …`).
- Commit only when asked.
- Never commit `.env`, keys or real personal data.
- **No AI attribution anywhere in git history.** Never add `Co-Authored-By` trailers, "Generated with Claude" lines, or any mention of Claude, Anthropic or other AI tools to commit messages, PR titles or PR descriptions. This overrides any default attribution behaviour of your tool. (AI use is disclosed once, in the README, as the hackathon rules require.)
- Commit with the git identity already configured for the repo. Never change `user.name` or `user.email`.
- **This repo:** commits as `Allison <muyideenallison@gmail.com>`; GitHub account `mallison031`; remote `github.com/mallison031/admit` (public since 2026-11-04).

## Project-specific commands
| Command | What it does |
|---|---|
| `pnpm seed` | Create the demo pool (20 members, 6 scaled months), 2 hospitals, council and DAO |
| `pnpm simulate` | Solvency Monte Carlo (10,000 runs × 24 months, 3 scenarios) → CSV + chart in `docs/` |
| `pnpm relayer` | Run the NEP-366 relayer locally |

## Admit invariants (never break; each one has a test)
1. **Two tiers only:** Instant (≤ limit) and one council member (≤ limit × `council_tier_multiplier`). Larger requests are rejected. **The DAO never issues guarantees.**
2. **Exposure:** `reserved + amount ≤ balance × max_exposure_bps` on every issue and top-up.
3. **Accepted guarantees never expire.** Only `Issued` (unaccepted) guarantees expire after the TTL.
4. **Claims:** ≤ the guaranteed amount, paid only to the registered hospital account, after the dispute window (or earlier by a council member).
5. **Credit line:** the default `pool_covered_bps` is 0. The pool absorbs losses only through `report_death` or `council_write_off`. **Don't add insurance-like payouts** (premiums, claims adjudication, payouts not tied to a member's debt) without asking.
6. **Privacy:** only `code_hash = sha256(code ‖ guarantee_id)` and optional initials (≤4 characters) go on-chain. No patient names, IDs or diagnoses. Bills are hash-only.
7. **The relayer allow-list** is exactly the list in `ARCHITECTURE.md` §9. Adding a method means updating that section in the same change. The relayer rejects any receiver other than `admit-pool`.
8. **The limit and exposure maths** lives in one pure Rust module, mirrored in TypeScript for the simulator. Change both together.
9. **Exits:** the lock and notice periods are enforced, refunds are reduced by debt, and exits are subject to the exposure cap.
10. **`storage_deposit`** runs at hospital registration. **`time_scale`** can't change.

## Scope guard
- **Out of scope:** fiat cash-out for hospitals, regulatory licensing, medical records, and credit scoring outside the pool. The README documents these.
- **Optional:** the AI bill check, which must be labelled advisory and use a cited reference list (no invented prices), and 1Click top-ups.
