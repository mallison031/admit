# Admit — Project Structure

> This is where every file lives and what it's responsible for. Read it before creating a file.
> It complements `ARCHITECTURE.md` (what the system does) and `AGENTS.md` (how to work).
> If you add, move or rename a file, update this document in the same change.
> Every contribution must also update `ROADMAP.md` (task status, header progress, Changelog line). See `ROADMAP.md` §1.

---

## 1. Top-level tree

```
admit/
├── AGENTS.md                     # agent rules (read first)
├── CLAUDE.md                     # imports AGENTS.md + Claude Code notes
├── PRD.md                        # product scope, demo script (§8) = acceptance test
├── ARCHITECTURE.md               # full design, §14 decision log
├── ARCHITECTURE_ESSENTIALS.md    # short reference for agents
├── project_structure.md          # this file
├── ROADMAP.md                    # live task list + status — UPDATE IN EVERY CONTRIBUTION
├── README.md                     # judge-facing: problem, "do X, see Y", AI/library disclosure
├── LICENSE                       # MIT
│
├── package.json                  # root scripts (§4), devDeps for lint/format only
├── pnpm-workspace.yaml           # packages/*, apps/*, scripts
├── tsconfig.base.json            # strict TS settings shared by all TS projects
├── eslint.config.mjs             # flat config, shared
├── .prettierrc
├── .editorconfig
├── .nvmrc                        # 22
├── .env.example                  # every variable from ARCHITECTURE.md §13, no values
├── .gitignore
│
├── Cargo.toml                    # Rust workspace: members = contracts/*
├── rust-toolchain.toml           # stable + wasm32-unknown-unknown
├── rustfmt.toml
│
├── .github/workflows/ci.yml      # lint + unit tests + contract tests on push/PR
│
├── contracts/
│   ├── admit-pool/               # the product contract
│   └── mock-ft/                  # testnet tUSDC (NEP-141 + NEP-145)
├── packages/
│   └── core/                     # @admit/core — shared TS: types, limits math, contract client, delegate actions
├── apps/
│   ├── web/                      # Next.js UI
│   └── api/                      # Hono: relayer, quote proxy (AI bill check later, optional)
├── scripts/                      # deploy, seed, demo, simulate (TS, run with tsx)
├── fixtures/                     # fictional demo data (bills, seed members)
└── docs/                         # generated, committed outputs: simulation results, screenshots
```

## 2. Contracts

### 2.1 `contracts/admit-pool/`
```
admit-pool/
├── Cargo.toml                    # near-sdk 5.x; dev: near-workspaces, tokio, serde_json
├── src/
│   ├── lib.rs                    # #[near(contract_state)] Contract, init, ft_on_transfer dispatch, mod wiring
│   ├── types.rs                  # PoolParams, Pool, Hospital, Member, Standing, Guarantee, GStatus, Claim, LocalAmount
│   ├── errors.rs                 # every error code + message (E01_…); nothing else
│   ├── events.rs                 # NEP-297 helper + AdmitEvent enum (one variant per event in ARCHITECTURE §7)
│   ├── time.rs                   # time_scale helpers: scaled(), months_between(); the ONLY place durations are computed
│   ├── limits.rs                 # PURE functions: tenure_months, good_months, raw_limit, limit, exposure_ok, tier
│   ├── access.rs                 # role guards: assert_dao, assert_council, assert_hospital, assert_member_or_delegate
│   ├── pool.rs                   # create_pool
│   ├── member.rs                 # join, add/remove_delegate, contribute, repay, request_exit, execute_exit
│   ├── guarantee.rs              # request_guarantee, request_topup, council_approve/reject, expire
│   ├── hospital.rs               # hospital_accept, hospital_claim, hospital_release, hospital_transfer
│   ├── settle.rs                 # member_dispute, settle (incl. council adjustment), report_death
│   ├── council.rs                # DAO-only: council_set_members, council_add/remove_hospital, council_set_params,
│   │                             #           council_write_off, council_mark_default
│   ├── token.rs                  # ft_transfer / storage_deposit promises + #[private] callbacks that restore state
│   └── views.rs                  # get_guarantee, get_member, get_limit, get_pool, get_pool_stats, list_guarantees
├── tests/                        # near-workspaces integration tests (one file per area)
│   ├── common/mod.rs             # sandbox setup: deploy pool + mock-ft + pinned Sputnik, create accounts, helpers
│   ├── tiers_and_exposure.rs
│   ├── eligibility.rs            # tenure, unpaid contributions, active cap, cooldown, Default, Late reduced limit
│   ├── guarantee_lifecycle.rs    # issue → accept → claim → settle; expiry only before accept; release; top-up; transfer
│   ├── settlement.rs             # dispute window, adjustment, debt, death write-off
│   ├── exits.rs
│   ├── access_control.rs         # DAO-only, council-only, hospital-only methods reject others
│   └── transfer_failures.rs      # failed ft_transfer rolls back; storage_deposit at hospital registration
└── res/
    ├── sputnikdao2.wasm          # pinned Sputnik DAO v2 build used in tests (committed)
    └── SPUTNIK_VERSION.txt       # source commit + sha256 of the wasm
```
**Rules**
- **`limits.rs` is pure**: no `env::` calls. Pass `now` and state in. Unit tests sit in the same file (`#[cfg(test)]`).
- **`packages/core/src/limits.ts` mirrors `limits.rs`.** Each file's header comment points to the other, and they change together (AGENTS invariant 8).
- **One domain per module.** A new method goes in the module for its domain, and its integration test goes in the matching `tests/*.rs` file.
- **Test names** state the rule they check (`claim_above_guarantee_fails`).

### 2.2 `contracts/mock-ft/`
```
mock-ft/
├── Cargo.toml
└── src/lib.rs                    # NEP-141 + NEP-145 (near-contract-standards), `mint(account, amount)` open on testnet
```
Testnet and the sandbox only. Never deployed to mainnet.

## 3. TypeScript workspace

### 3.1 `packages/core/` (`@admit/core`)
```
core/
├── package.json                  # deps: near-api-js, zod; tests: node:test via tsx
├── tsconfig.json
├── src/
│   ├── index.ts                  # public exports only
│   ├── types.ts                  # TS mirrors of contract JSON (amounts as string), zod schemas for views
│   ├── limits.ts                 # mirror of contracts/admit-pool/src/limits.rs (used by simulator + UI previews)
│   ├── contract.ts               # typed wrappers: views (RPC) and change-call builders for every method
│   ├── delegate.ts               # build + sign NEP-366 delegate actions with a device key
│   ├── code.ts                   # 6-char guarantee code generation, sha256(code ‖ id)
│   ├── format.ts                 # bigint amounts ↔ display, scaled time display
│   └── config.ts                 # network/contract ids from env, explorer URL builders
└── test/
    ├── limits.test.ts
    ├── code.test.ts
    └── delegate.test.ts
```
**Rule:** all contract calls from TypeScript go through `contract.ts`. No app builds raw `functionCall` arguments itself.

### 3.2 `apps/web/` (Next.js 16, App Router)
```
web/
├── package.json                  # deps: next, react, @admit/core, @near-wallet-selector/*, qrcode, tailwindcss
├── next.config.ts
├── postcss.config.mjs            # Tailwind 4 via @tailwindcss/postcss
├── app/
│   ├── globals.css               # @import "tailwindcss"
│   ├── layout.tsx                # shell, DEMO MODE banner when time_scale ≠ 1
│   ├── page.tsx                  # landing: problem, how it works, links to demo flows
│   ├── request/page.tsx          # 2am requester flow (delegate device): hospital, amount → code + QR
│   ├── g/[id]/page.tsx           # QR verification: client-only, RPC view, code check, accept (hospital device)
│   ├── hospital/page.tsx         # registered hospital device: open guarantees, claim, release, transfer
│   ├── member/page.tsx           # limit, debt, repay, contribute, delegate pairing QR, exit
│   ├── council/page.tsx          # pending council-tier approvals, disputes, settle, report death
│   └── pool/[id]/page.tsx        # public stats: balance, reserved, exposure, guarantees, events
├── components/                   # StatusBanner, CodeCheck, AmountInput, GuaranteeQr, ExplorerLink, Countdown, …
├── lib/
│   ├── wallet.ts                 # wallet-selector setup (members, council)
│   ├── device-key.ts             # generate/store device keypair (IndexedDB), never leaves the device
│   └── relay.ts                  # POST signed delegate actions to apps/api
└── test/                         # component + flow tests (Vitest)
```
**Rules**
- **`g/[id]`** must work with no API at all, using only RPC view calls (ARCHITECTURE §8).
- **Device keys** are never sent to the server. The relayer only ever receives signed delegate actions.

### 3.3 `apps/api/` (Hono, Node 22)
```
api/
├── package.json                  # deps: hono, @hono/node-server, @admit/core, near-api-js, zod
├── src/
│   ├── index.ts                  # app + routes + error handler
│   ├── env.ts                    # zod-validated env (fails fast on missing vars)
│   ├── routes/
│   │   ├── relay.ts              # POST /relay
│   │   ├── onboard.ts            # POST /onboard/device (no secrets returned)
│   │   └── quote.ts              # POST /quote → 1Click /v0/quote with dry:true
│   └── relayer/
│       ├── allowlist.ts          # THE method allow-list (single source; mirrors ARCHITECTURE §9)
│       ├── verify.ts             # receiver == admit-pool, method ∈ allowlist, signature/nonce sanity
│       ├── ratelimit.ts          # per-signer + global token buckets
│       └── submit.ts             # wrap in SignedDelegate, send with relayer key
└── test/
    ├── allowlist.test.ts         # rejects unknown method / wrong receiver
    └── relay.test.ts
```
**Optional, later:** `src/routes/ai.ts` for the AI bill check (Could). Create it only once that work starts.

### 3.4 `scripts/`
```
scripts/
├── package.json                  # deps: tsx, @admit/core
├── lib/
│   ├── accounts.ts               # load/create testnet accounts from .env (function-call keys where possible)
│   └── log.ts                    # step logging with explorer links; exit non-zero on unexpected state
├── deploy-testnet.ts             # build + deploy mock-ft and admit-pool, init
├── seed.ts                       # demo pool: 20 members, 6 scaled months, 2 hospitals, council, DAO
├── demo.ts                       # PRD §8 story end to end
└── simulate.ts                   # Monte Carlo → docs/simulation/{results.csv, chart.png, summary.md}
```

## 4. Root scripts (`package.json`)

| Script | Runs |
|---|---|
| `build` | `pnpm build:contract && pnpm -r --filter ./packages/* --filter ./apps/* build` |
| `build:contract` | `cargo near build non-reproducible-wasm` in each contract (verified with cargo-near 0.22.0) |
| `check:contract` | `cargo check --workspace --target wasm32-unknown-unknown` (fast type-check; plain host `cargo check` is blocked by near-sdk) |
| `test` | `pnpm test:contract && pnpm -r test` |
| `test:contract` | `pnpm build:contract && cargo test --workspace` |
| `lint` | `cargo fmt --check && cargo clippy --workspace -- -D warnings && eslint . && tsc -b` |
| `dev` | web + api in parallel against testnet |
| `relayer` | api only |
| `deploy:testnet` | `tsx scripts/deploy-testnet.ts` |
| `seed` | `tsx scripts/seed.ts` |
| `demo` | `tsx scripts/demo.ts` |
| `simulate` | `tsx scripts/simulate.ts` |

## 5. Dependency direction

```
contracts/*          (no TS deps)
packages/core   ◄──  apps/web
                ◄──  apps/api
                ◄──  scripts
```
- `apps/web` never imports from `apps/api`, and the reverse is also true. They talk over HTTP only.
- Only `packages/core` knows contract method names and argument shapes.
- `scripts` may read `fixtures/`; apps may not.

## 6. Fixtures and generated files

| Path | Committed? | Notes |
|---|---|---|
| `fixtures/members.json` | yes | Fictional demo members (names clearly fake) |
| `fixtures/bills/sample_bill.pdf` | yes | Fictional itemised bill |
| `docs/simulation/*` | yes | Regenerated by `pnpm simulate`; README embeds the chart |
| `docs/screenshots/*` | yes | For README / demo post |
| `contracts/admit-pool/res/sputnikdao2.wasm` | yes | Pinned, with version + sha256 |
| `target/`, `node_modules/`, `.next/`, `dist/`, `*.wasm` outside `res/` | no | `.gitignore` |
| `.env` | **never** | `.env.example` only |

## 7. Where new code goes

| You're adding… | Put it in… | Also update |
|---|---|---|
| **Anything at all** | — | **`ROADMAP.md`**: task status, header progress, Changelog line |
| A contract method | The domain module in `src/`, registered in `lib.rs` if needed | `tests/<area>.rs`, `packages/core/src/contract.ts`, ARCHITECTURE §5 |
| A contract type or field | `types.rs` | `packages/core/src/types.ts`, ARCHITECTURE §4 |
| An event | `events.rs` | ARCHITECTURE §7 |
| An error | `errors.rs` | — |
| A limit or exposure rule | `limits.rs` **and** `limits.ts` | ESSENTIALS "Limit maths" |
| A relayed method | `apps/api/src/relayer/allowlist.ts` | ARCHITECTURE §9, tests |
| A UI page | `apps/web/app/<route>/page.tsx` | ARCHITECTURE §8 if hospital-facing |
| An env var | `env.ts` of the app using it | `.env.example`, ARCHITECTURE §13 |
| A demo step | `scripts/demo.ts` | PRD §8, README |

## 8. Naming
- **Rust:** modules and functions in `snake_case`, types in `PascalCase`. Error constants are `E##_SCREAMING_SNAKE`.
- **TypeScript:** files in `kebab-case.ts` (React components in `PascalCase.tsx`), functions in `camelCase`.
- **Branches:** `feat/…`, `fix/…`, `test/…`, `docs/…`.
- **Testnet accounts:** `admit.<you>.testnet`, `tusdc.<you>.testnet`, `relay.<you>.testnet`, `council-dao.<factory>`, `stnicholas-clinic.<you>.testnet`.
