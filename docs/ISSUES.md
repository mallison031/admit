# Issues index

All work to complete `ROADMAP.md`, as GitHub issues in [mallison031/admit](https://github.com/mallison031/admit/issues).
Each phase is a milestone. Within a wave, no issue blocks another; a later wave starts after the earlier wave of that phase is merged.
`maintainer` issues need keys, funds or decisions. Contributions are from collaborators only.

## P0 — Decisions & verification (6 issues)

| # | Wave | Roadmap | Size | Issue |
|---|---|---|---|---|
| [#1](https://github.com/mallison031/admit/issues/1) | 1 | A-0.3 | S | Verify Sputnik DAO v2 factory accounts and fixed-weight vote policy JSON |
| [#2](https://github.com/mallison031/admit/issues/2) | 1 | A-0.4 | S | Pin the Sputnik DAO v2 wasm used in tests |
| [#3](https://github.com/mallison031/admit/issues/3) | 1 | A-0.6 | S | Decide the NEP-366 relayer approach · **maintainer** |
| [#4](https://github.com/mallison031/admit/issues/4) | 1 | A-0.7 | S | Research real emergency-deposit sizes and propose default limits |
| [#5](https://github.com/mallison031/admit/issues/5) | 1 | A-0.8 | S | Create and fund the testnet accounts · **maintainer** |
| [#6](https://github.com/mallison031/admit/issues/6) | 1 | A-0.9 | XS | Look up the mainnet USDC token id on NEAR (docs only) |

## P1 — Scaffolding (4 issues)

| # | Wave | Roadmap | Size | Issue |
|---|---|---|---|---|
| [#7](https://github.com/mallison031/admit/issues/7) | 1 | A-1.5 | S | mock-ft: implement NEP-141 + NEP-145 with open mint |
| [#8](https://github.com/mallison031/admit/issues/8) | 1 | A-1.6 | S | sandbox harness: deploy admit-pool and call `new` |
| [#9](https://github.com/mallison031/admit/issues/9) | 1 | A-1.9 | S | CI: install cargo-near and run on every push |
| [#10](https://github.com/mallison031/admit/issues/10) | 2 | A-1.6 | S | sandbox harness: add mock-ft deployment and storage helpers to `setup()` |

## P2 — Contract core (35 issues)

| # | Wave | Roadmap | Size | Issue |
|---|---|---|---|---|
| [#11](https://github.com/mallison031/admit/issues/11) | 1 | A-2.10 | XS | token: implement `ft_transfer` |
| [#12](https://github.com/mallison031/admit/issues/12) | 1 | A-2.10 | XS | token: implement `storage_deposit` |
| [#13](https://github.com/mallison031/admit/issues/13) | 1 | A-2.11 | XS | views: implement `get_pool` |
| [#14](https://github.com/mallison031/admit/issues/14) | 1 | A-2.11 | XS | views: implement `get_member` |
| [#15](https://github.com/mallison031/admit/issues/15) | 1 | A-2.11 | XS | views: implement `list_members` |
| [#16](https://github.com/mallison031/admit/issues/16) | 1 | A-2.12 | S | test utils: unit-test state builders |
| [#17](https://github.com/mallison031/admit/issues/17) | 1 | A-2.2 | XS | events: implement `emit` (NEP-297) |
| [#18](https://github.com/mallison031/admit/issues/18) | 1 | A-2.3 | XS | time: implement `scaled` |
| [#19](https://github.com/mallison031/admit/issues/19) | 1 | A-2.3 | XS | time: implement `months_between` |
| [#20](https://github.com/mallison031/admit/issues/20) | 1 | A-2.4 | XS | limits: implement `raw_limit` |
| [#21](https://github.com/mallison031/admit/issues/21) | 1 | A-2.4 | XS | limits: implement `exposure_ok` |
| [#22](https://github.com/mallison031/admit/issues/22) | 1 | A-2.4 | XS | limits: implement `tier` |
| [#23](https://github.com/mallison031/admit/issues/23) | 1 | A-2.5 | XS | access: implement `assert_dao` |
| [#24](https://github.com/mallison031/admit/issues/24) | 1 | A-2.5 | XS | access: implement `assert_council` |
| [#25](https://github.com/mallison031/admit/issues/25) | 1 | A-2.5 | XS | access: implement `assert_hospital` |
| [#26](https://github.com/mallison031/admit/issues/26) | 1 | A-2.5 | XS | access: implement `assert_member_or_delegate` |
| [#27](https://github.com/mallison031/admit/issues/27) | 1 | A-2.6 | XS | pool: add `validate_params` and use it in `create_pool` |
| [#28](https://github.com/mallison031/admit/issues/28) | 1 | A-2.8 | XS | ft_on_transfer: add `parse_ft_message` helper |
| [#29](https://github.com/mallison031/admit/issues/29) | 2 | A-2.11 | XS | views: implement `get_pool_stats` |
| [#30](https://github.com/mallison031/admit/issues/30) | 2 | A-2.4 | XS | limits: implement `tenure_months` |
| [#31](https://github.com/mallison031/admit/issues/31) | 2 | A-2.4 | XS | limits: implement `good_months` |
| [#32](https://github.com/mallison031/admit/issues/32) | 2 | A-2.6 | S | pool: implement `create_pool` |
| [#33](https://github.com/mallison031/admit/issues/33) | 2 | A-2.7 | XS | member: implement `join` |
| [#34](https://github.com/mallison031/admit/issues/34) | 2 | A-2.7 | XS | member: implement `add_delegate` |
| [#35](https://github.com/mallison031/admit/issues/35) | 2 | A-2.7 | XS | member: implement `remove_delegate` |
| [#36](https://github.com/mallison031/admit/issues/36) | 2 | A-2.8 | XS | member: implement `internal_contribute` |
| [#37](https://github.com/mallison031/admit/issues/37) | 2 | A-2.8 | XS | member: implement `internal_topup` |
| [#38](https://github.com/mallison031/admit/issues/38) | 2 | A-2.9 | XS | council: implement `council_set_members` |
| [#39](https://github.com/mallison031/admit/issues/39) | 2 | A-2.9 | XS | council: implement `council_remove_hospital` |
| [#40](https://github.com/mallison031/admit/issues/40) | 2 | A-2.9 | XS | council: implement `council_set_params` |
| [#41](https://github.com/mallison031/admit/issues/41) | 2 | A-2.9 | XS | council: implement `council_mark_default` |
| [#42](https://github.com/mallison031/admit/issues/42) | 2 | A-2.9 | S | council: implement `council_add_hospital` with token storage registration |
| [#43](https://github.com/mallison031/admit/issues/43) | 3 | A-2.11 | XS | views: implement `get_limit` |
| [#44](https://github.com/mallison031/admit/issues/44) | 3 | A-2.4 | XS | limits: implement `limit` |
| [#45](https://github.com/mallison031/admit/issues/45) | 3 | A-2.8 | XS | ft_on_transfer: dispatch messages and reject wrong tokens |

## P3 — Guarantees (17 issues)

| # | Wave | Roadmap | Size | Issue |
|---|---|---|---|---|
| [#46](https://github.com/mallison031/admit/issues/46) | 1 | A-3.1 | XS | guarantee: add eligibility helper `check_initials` |
| [#47](https://github.com/mallison031/admit/issues/47) | 1 | A-3.11 | XS | views: implement `get_guarantee` |
| [#48](https://github.com/mallison031/admit/issues/48) | 1 | A-3.11 | XS | views: implement `list_guarantees` |
| [#49](https://github.com/mallison031/admit/issues/49) | 1 | A-3.2 | S | guarantee: implement `council_approve` |
| [#50](https://github.com/mallison031/admit/issues/50) | 1 | A-3.2 | S | guarantee: implement `council_reject` |
| [#51](https://github.com/mallison031/admit/issues/51) | 1 | A-3.3 | XS | guarantee: add eligibility helper `check_tenure` |
| [#52](https://github.com/mallison031/admit/issues/52) | 1 | A-3.3 | XS | guarantee: add eligibility helper `check_contributions` |
| [#53](https://github.com/mallison031/admit/issues/53) | 1 | A-3.3 | XS | guarantee: add eligibility helper `check_active_cap` |
| [#54](https://github.com/mallison031/admit/issues/54) | 1 | A-3.3 | XS | guarantee: add eligibility helper `check_cooldown` |
| [#55](https://github.com/mallison031/admit/issues/55) | 1 | A-3.5 | S | guarantee: implement `expire` |
| [#56](https://github.com/mallison031/admit/issues/56) | 1 | A-3.6 | S | hospital: implement `hospital_accept` |
| [#57](https://github.com/mallison031/admit/issues/57) | 1 | A-3.7 | S | hospital: implement `hospital_claim` |
| [#58](https://github.com/mallison031/admit/issues/58) | 1 | A-3.8 | S | hospital: implement `hospital_release` |
| [#59](https://github.com/mallison031/admit/issues/59) | 1 | A-3.9 | S | guarantee: implement `request_topup` |
| [#60](https://github.com/mallison031/admit/issues/60) | 2 | A-3.1 | M | guarantee: implement `request_guarantee` |
| [#61](https://github.com/mallison031/admit/issues/61) | 2 | A-3.10 | M | hospital: implement `hospital_transfer` |
| [#62](https://github.com/mallison031/admit/issues/62) | 3 | A-3.4 | XS | guarantee: unit-test the delegate request path |

## P4 — Settlement, debt, exits (10 issues)

| # | Wave | Roadmap | Size | Issue |
|---|---|---|---|---|
| [#63](https://github.com/mallison031/admit/issues/63) | 1 | A-4.1 | S | settle: implement `member_dispute` |
| [#64](https://github.com/mallison031/admit/issues/64) | 1 | A-4.2 | XS | settle: add pure `settlement_split` |
| [#65](https://github.com/mallison031/admit/issues/65) | 1 | A-4.3 | S | member: implement `internal_repay` |
| [#66](https://github.com/mallison031/admit/issues/66) | 1 | A-4.4 | XS | limits: implement `derive_standing` |
| [#67](https://github.com/mallison031/admit/issues/67) | 1 | A-4.5 | S | settle: implement `report_death` |
| [#68](https://github.com/mallison031/admit/issues/68) | 1 | A-4.5 | S | council: implement `council_write_off` |
| [#69](https://github.com/mallison031/admit/issues/69) | 1 | A-4.6 | XS | exits: add pure `exit_refund` |
| [#70](https://github.com/mallison031/admit/issues/70) | 1 | A-4.6 | XS | member: implement `request_exit` |
| [#71](https://github.com/mallison031/admit/issues/71) | 2 | A-4.2 | M | settle: implement `settle` with payment and rollback callback |
| [#72](https://github.com/mallison031/admit/issues/72) | 2 | A-4.6 | M | exits: implement `execute_exit` with refund rollback |

## P5 — Integration test suite (37 issues)

| # | Wave | Roadmap | Size | Issue |
|---|---|---|---|---|
| [#73](https://github.com/mallison031/admit/issues/73) | 1 | A-5.1 | S | test: `tiers_and_exposure::instant_guarantee_issued_within_limit` |
| [#74](https://github.com/mallison031/admit/issues/74) | 1 | A-5.1 | S | test: `tiers_and_exposure::council_tier_requires_one_council_approval` |
| [#75](https://github.com/mallison031/admit/issues/75) | 1 | A-5.1 | S | test: `tiers_and_exposure::request_above_council_tier_is_rejected` |
| [#76](https://github.com/mallison031/admit/issues/76) | 1 | A-5.1 | S | test: `tiers_and_exposure::exposure_cap_blocks_issue` |
| [#77](https://github.com/mallison031/admit/issues/77) | 1 | A-5.1 | S | test: `tiers_and_exposure::topup_rechecks_tier_and_exposure` |
| [#78](https://github.com/mallison031/admit/issues/78) | 1 | A-5.2 | S | test: `eligibility::new_member_below_min_tenure_is_denied` |
| [#79](https://github.com/mallison031/admit/issues/79) | 1 | A-5.2 | S | test: `eligibility::unpaid_contributions_are_denied` |
| [#80](https://github.com/mallison031/admit/issues/80) | 1 | A-5.2 | S | test: `eligibility::third_concurrent_guarantee_is_denied` |
| [#81](https://github.com/mallison031/admit/issues/81) | 1 | A-5.2 | S | test: `eligibility::cooldown_blocks_next_guarantee` |
| [#82](https://github.com/mallison031/admit/issues/82) | 1 | A-5.2 | S | test: `eligibility::default_member_is_denied` |
| [#83](https://github.com/mallison031/admit/issues/83) | 1 | A-5.2 | S | test: `eligibility::late_member_gets_reduced_limit` |
| [#84](https://github.com/mallison031/admit/issues/84) | 1 | A-5.2 | S | test: `eligibility::non_delegate_cannot_request` |
| [#85](https://github.com/mallison031/admit/issues/85) | 1 | A-5.3 | S | test: `guarantee_lifecycle::issue_accept_claim_settle_happy_path` |
| [#86](https://github.com/mallison031/admit/issues/86) | 1 | A-5.3 | S | test: `guarantee_lifecycle::issued_guarantee_expires_after_ttl` |
| [#87](https://github.com/mallison031/admit/issues/87) | 1 | A-5.3 | S | test: `guarantee_lifecycle::accepted_guarantee_never_expires` |
| [#88](https://github.com/mallison031/admit/issues/88) | 1 | A-5.3 | S | test: `guarantee_lifecycle::release_frees_reservation` |
| [#89](https://github.com/mallison031/admit/issues/89) | 1 | A-5.3 | S | test: `guarantee_lifecycle::transfer_splits_claim_and_creates_new_guarantee` |
| [#90](https://github.com/mallison031/admit/issues/90) | 1 | A-5.3 | S | test: `guarantee_lifecycle::claim_above_guarantee_fails` |
| [#91](https://github.com/mallison031/admit/issues/91) | 1 | A-5.4 | S | test: `settlement::settle_before_dispute_window_closes_fails` |
| [#92](https://github.com/mallison031/admit/issues/92) | 1 | A-5.4 | S | test: `settlement::dispute_within_window_blocks_auto_settle` |
| [#93](https://github.com/mallison031/admit/issues/93) | 1 | A-5.4 | S | test: `settlement::council_adjustment_pays_reduced_amount` |
| [#94](https://github.com/mallison031/admit/issues/94) | 1 | A-5.4 | S | test: `settlement::settlement_adds_member_debt` |
| [#95](https://github.com/mallison031/admit/issues/95) | 1 | A-5.4 | S | test: `settlement::repay_reduces_debt_and_restores_limit` |
| [#96](https://github.com/mallison031/admit/issues/96) | 1 | A-5.4 | S | test: `settlement::report_death_writes_off_debt` |
| [#97](https://github.com/mallison031/admit/issues/97) | 1 | A-5.5 | S | test: `exits::exit_before_lock_is_rejected` |
| [#98](https://github.com/mallison031/admit/issues/98) | 1 | A-5.5 | S | test: `exits::exit_before_notice_is_rejected` |
| [#99](https://github.com/mallison031/admit/issues/99) | 1 | A-5.5 | S | test: `exits::exit_refund_is_reduced_by_debt` |
| [#100](https://github.com/mallison031/admit/issues/100) | 1 | A-5.5 | S | test: `exits::exit_queued_when_exposure_cap_would_break` |
| [#101](https://github.com/mallison031/admit/issues/101) | 1 | A-5.6 | S | test: `access_control::dao_only_methods_reject_other_callers` |
| [#102](https://github.com/mallison031/admit/issues/102) | 1 | A-5.6 | S | test: `access_control::council_methods_reject_non_council` |
| [#103](https://github.com/mallison031/admit/issues/103) | 1 | A-5.6 | S | test: `access_control::hospital_methods_reject_other_accounts` |
| [#104](https://github.com/mallison031/admit/issues/104) | 1 | A-5.6 | S | test: `access_control::time_scale_cannot_change` |
| [#105](https://github.com/mallison031/admit/issues/105) | 1 | A-5.7 | S | test: `transfer_failures::failed_hospital_payment_rolls_back` |
| [#106](https://github.com/mallison031/admit/issues/106) | 1 | A-5.7 | S | test: `transfer_failures::failed_exit_refund_rolls_back` |
| [#107](https://github.com/mallison031/admit/issues/107) | 1 | A-5.7 | S | test: `transfer_failures::hospital_registration_registers_token_storage` |
| [#108](https://github.com/mallison031/admit/issues/108) | 1 | A-5.8 | S | test: `dao_integration::sputnik_proposal_adds_hospital` |
| [#109](https://github.com/mallison031/admit/issues/109) | 1 | A-5.9 | S | lint: make clippy and rustfmt clean |

## P6 — Testnet deployment & DAO (7 issues)

| # | Wave | Roadmap | Size | Issue |
|---|---|---|---|---|
| [#110](https://github.com/mallison031/admit/issues/110) | 1 | A-6.1 | XS | log.ts: implement `step` |
| [#111](https://github.com/mallison031/admit/issues/111) | 1 | A-6.1 | XS | accounts.ts: implement `loadAccounts` |
| [#112](https://github.com/mallison031/admit/issues/112) | 1 | A-6.1 | M | scripts: write `deploy-testnet.ts` · **maintainer** |
| [#113](https://github.com/mallison031/admit/issues/113) | 1 | A-6.2 | S | Create the council Sputnik DAO on testnet · **maintainer** |
| [#114](https://github.com/mallison031/admit/issues/114) | 1 | A-6.3 | XS | fixtures: extend `members.json` to 20 fictional members |
| [#115](https://github.com/mallison031/admit/issues/115) | 1 | A-6.3 | M | scripts: write `seed.ts` · **maintainer** |
| [#116](https://github.com/mallison031/admit/issues/116) | 1 | A-6.4 | S | Create scoped function-call keys for hospitals and delegates · **maintainer** |

## P7 — Shared TypeScript core (25 issues)

| # | Wave | Roadmap | Size | Issue |
|---|---|---|---|---|
| [#117](https://github.com/mallison031/admit/issues/117) | 1 | A-7.1 | XS | core: test the zod schemas against sample view JSON |
| [#118](https://github.com/mallison031/admit/issues/118) | 1 | A-7.2 | XS | limits.ts: implement `tenureMonths` |
| [#119](https://github.com/mallison031/admit/issues/119) | 1 | A-7.2 | XS | limits.ts: implement `goodMonths` |
| [#120](https://github.com/mallison031/admit/issues/120) | 1 | A-7.2 | XS | limits.ts: implement `rawLimit` |
| [#121](https://github.com/mallison031/admit/issues/121) | 1 | A-7.2 | XS | limits.ts: implement `limit` |
| [#122](https://github.com/mallison031/admit/issues/122) | 1 | A-7.2 | XS | limits.ts: implement `exposureOk` |
| [#123](https://github.com/mallison031/admit/issues/123) | 1 | A-7.2 | XS | limits.ts: implement `tier` |
| [#124](https://github.com/mallison031/admit/issues/124) | 1 | A-7.2 | XS | limits.ts: implement `deriveStanding` |
| [#125](https://github.com/mallison031/admit/issues/125) | 1 | A-7.3 | S | contract.ts: implement `createViewClient` |
| [#126](https://github.com/mallison031/admit/issues/126) | 1 | A-7.3 | XS | core: add guarantee call builders to `calls` |
| [#127](https://github.com/mallison031/admit/issues/127) | 1 | A-7.3 | XS | core: add hospital call builders to `calls` |
| [#128](https://github.com/mallison031/admit/issues/128) | 1 | A-7.3 | XS | core: add member call builders to `calls` |
| [#129](https://github.com/mallison031/admit/issues/129) | 1 | A-7.3 | XS | core: add council call builders to `calls` |
| [#130](https://github.com/mallison031/admit/issues/130) | 1 | A-7.4 | XS | code.ts: implement `generateCode` |
| [#131](https://github.com/mallison031/admit/issues/131) | 1 | A-7.4 | XS | code.ts: implement `codeHash` |
| [#132](https://github.com/mallison031/admit/issues/132) | 1 | A-7.5 | M | core: implement `signDelegate` (NEP-366) · **maintainer** |
| [#133](https://github.com/mallison031/admit/issues/133) | 1 | A-7.6 | XS | format.ts: implement `formatAmount` |
| [#134](https://github.com/mallison031/admit/issues/134) | 1 | A-7.6 | XS | format.ts: implement `parseAmount` |
| [#135](https://github.com/mallison031/admit/issues/135) | 1 | A-7.6 | XS | config.ts: implement `explorerTxUrl` |
| [#136](https://github.com/mallison031/admit/issues/136) | 1 | A-7.6 | XS | config.ts: implement `explorerAccountUrl` |
| [#137](https://github.com/mallison031/admit/issues/137) | 2 | A-7.3 | XS | contract.ts: implement `getPoolStats` |
| [#138](https://github.com/mallison031/admit/issues/138) | 2 | A-7.3 | XS | contract.ts: implement `getMember` |
| [#139](https://github.com/mallison031/admit/issues/139) | 2 | A-7.3 | XS | contract.ts: implement `getLimit` |
| [#140](https://github.com/mallison031/admit/issues/140) | 2 | A-7.3 | XS | contract.ts: implement `getGuarantee` |
| [#141](https://github.com/mallison031/admit/issues/141) | 2 | A-7.3 | XS | contract.ts: implement `listGuarantees` |

## P8 — Relayer & API (8 issues)

| # | Wave | Roadmap | Size | Issue |
|---|---|---|---|---|
| [#142](https://github.com/mallison031/admit/issues/142) | 1 | A-8.1 | XS | api: load env with `loadEnv` and use the configured port |
| [#143](https://github.com/mallison031/admit/issues/143) | 1 | A-8.2 | XS | api: test the relayer allow-list |
| [#144](https://github.com/mallison031/admit/issues/144) | 1 | A-8.2 | M | api: implement `verifyDelegate` |
| [#145](https://github.com/mallison031/admit/issues/145) | 1 | A-8.3 | XS | ratelimit.ts: implement `allow` |
| [#146](https://github.com/mallison031/admit/issues/146) | 1 | A-8.4 | M | api: implement `submitDelegate` and `POST /relay` · **maintainer** |
| [#147](https://github.com/mallison031/admit/issues/147) | 1 | A-8.5 | S | api: implement `POST /onboard/device` |
| [#148](https://github.com/mallison031/admit/issues/148) | 1 | A-8.6 | XS | api: test that logs never contain secrets |
| [#149](https://github.com/mallison031/admit/issues/149) | 1 | A-8.7 | S | api: implement `POST /quote` (1Click dry-run) |

## P9 — Web app (18 issues)

| # | Wave | Roadmap | Size | Issue |
|---|---|---|---|---|
| [#150](https://github.com/mallison031/admit/issues/150) | 1 | A-9.1 | S | web: write the landing page |
| [#151](https://github.com/mallison031/admit/issues/151) | 1 | A-9.1 | XS | web: add a DEMO MODE banner component |
| [#152](https://github.com/mallison031/admit/issues/152) | 1 | A-9.2 | S | device-key.ts: implement `getOrCreateDeviceKey` |
| [#153](https://github.com/mallison031/admit/issues/153) | 1 | A-9.2 | XS | relay.ts: implement `relay` |
| [#154](https://github.com/mallison031/admit/issues/154) | 1 | A-9.3 | S | web: build the `AmountInput` component |
| [#155](https://github.com/mallison031/admit/issues/155) | 1 | A-9.3 | S | web: build the `GuaranteeQr` component |
| [#156](https://github.com/mallison031/admit/issues/156) | 1 | A-9.4 | S | web: build the `StatusBanner` component |
| [#157](https://github.com/mallison031/admit/issues/157) | 1 | A-9.4 | S | web: build the `CodeCheck` component |
| [#158](https://github.com/mallison031/admit/issues/158) | 1 | A-9.4 | S | web: build the `ExplorerLink` component |
| [#159](https://github.com/mallison031/admit/issues/159) | 1 | A-9.4 | S | web: build the `Countdown` component |
| [#160](https://github.com/mallison031/admit/issues/160) | 1 | A-9.9 | S | web: configure Vitest for React components |
| [#161](https://github.com/mallison031/admit/issues/161) | 2 | A-9.3 | M | web: build the `/request` page |
| [#162](https://github.com/mallison031/admit/issues/162) | 2 | A-9.4 | M | web: build the `/g/[id]` page |
| [#163](https://github.com/mallison031/admit/issues/163) | 2 | A-9.5 | M | web: build the `/hospital` page |
| [#164](https://github.com/mallison031/admit/issues/164) | 2 | A-9.6 | M | web: build the `/member` page |
| [#165](https://github.com/mallison031/admit/issues/165) | 2 | A-9.7 | M | web: build the `/council` page |
| [#166](https://github.com/mallison031/admit/issues/166) | 2 | A-9.8 | M | web: build the `/pool/[id]` page |
| [#167](https://github.com/mallison031/admit/issues/167) | 3 | A-9.10 | S | web: accessibility and mobile pass |

## P10 — Solvency simulator (7 issues)

| # | Wave | Roadmap | Size | Issue |
|---|---|---|---|---|
| [#168](https://github.com/mallison031/admit/issues/168) | 1 | A-10.1 | XS | simulator: implement `sampleBill` |
| [#169](https://github.com/mallison031/admit/issues/169) | 1 | A-10.1 | XS | simulator: implement `sampleEmergency` |
| [#170](https://github.com/mallison031/admit/issues/170) | 1 | A-10.2 | XS | simulator: implement `writeCsv` |
| [#171](https://github.com/mallison031/admit/issues/171) | 1 | A-10.2 | XS | simulator: implement `writeSummary` |
| [#172](https://github.com/mallison031/admit/issues/172) | 1 | A-10.2 | S | simulator: render the chart |
| [#173](https://github.com/mallison031/admit/issues/173) | 1 | A-10.3 | S | Tune default pool parameters · **maintainer** |
| [#174](https://github.com/mallison031/admit/issues/174) | 2 | A-10.1 | M | simulator: implement the run loop and 3 scenarios |

## P11 — Demo script (8 issues)

| # | Wave | Roadmap | Size | Issue |
|---|---|---|---|---|
| [#175](https://github.com/mallison031/admit/issues/175) | 1 | A-11.1 | S | demo: write step 1 as `scripts/demo/step1.ts` |
| [#176](https://github.com/mallison031/admit/issues/176) | 1 | A-11.2 | S | demo: write step 2 as `scripts/demo/step2.ts` |
| [#177](https://github.com/mallison031/admit/issues/177) | 1 | A-11.3 | S | demo: write step 3 as `scripts/demo/step3.ts` |
| [#178](https://github.com/mallison031/admit/issues/178) | 1 | A-11.4 | S | demo: write step 4 as `scripts/demo/step4.ts` |
| [#179](https://github.com/mallison031/admit/issues/179) | 1 | A-11.5 | S | demo: write step 5 as `scripts/demo/step5.ts` |
| [#180](https://github.com/mallison031/admit/issues/180) | 1 | A-11.6 | S | demo: write step 6 as `scripts/demo/step6.ts` |
| [#181](https://github.com/mallison031/admit/issues/181) | 1 | A-11.7 | S | demo: write step 7 as `scripts/demo/step7.ts` |
| [#182](https://github.com/mallison031/admit/issues/182) | 2 | A-11.8 | XS | demo: wire steps into `scripts/demo.ts` |

## P12 — Optional (Could) (3 issues)

| # | Wave | Roadmap | Size | Issue |
|---|---|---|---|---|
| [#183](https://github.com/mallison031/admit/issues/183) | 1 | A-12.1 | M | AI bill check: NEAR AI Cloud attestation verification script |
| [#184](https://github.com/mallison031/admit/issues/184) | 1 | A-12.2 | S | web: 1Click any-chain top-up quote on /member |
| [#185](https://github.com/mallison031/admit/issues/185) | 2 | A-12.1 | M | AI bill check: `/ai/review` route and `post_ai_review` |

## P13 — Documentation, deployment, submission (11 issues)

| # | Wave | Roadmap | Size | Issue |
|---|---|---|---|---|
| [#186](https://github.com/mallison031/admit/issues/186) | 1 | A-13.1 | S | README: problem and sources |
| [#187](https://github.com/mallison031/admit/issues/187) | 1 | A-13.1 | S | README: how it works + architecture diagram |
| [#188](https://github.com/mallison031/admit/issues/188) | 1 | A-13.11 | S | Submit the hackathon form · **maintainer** |
| [#189](https://github.com/mallison031/admit/issues/189) | 1 | A-13.3 | S | README: limitations and threat-model summary |
| [#190](https://github.com/mallison031/admit/issues/190) | 1 | A-13.4 | S | README: libraries and AI disclosure |
| [#191](https://github.com/mallison031/admit/issues/191) | 1 | A-13.5 | S | Decide the second project and name it in the README · **maintainer** |
| [#192](https://github.com/mallison031/admit/issues/192) | 1 | A-13.6 | S | Deploy the web app to Vercel (testnet) · **maintainer** |
| [#193](https://github.com/mallison031/admit/issues/193) | 1 | A-13.8 | S | Record the demo video (≤ 2 min) · **maintainer** |
| [#194](https://github.com/mallison031/admit/issues/194) | 1 | A-13.9 | S | Draft the X post · **maintainer** |
| [#195](https://github.com/mallison031/admit/issues/195) | 2 | A-13.2 | S | README: 'do X, see Y' quickstart |
| [#196](https://github.com/mallison031/admit/issues/196) | 2 | A-13.7 | S | README: screenshots and simulation chart |

## P14 — Final QA (6 issues)

| # | Wave | Roadmap | Size | Issue |
|---|---|---|---|---|
| [#197](https://github.com/mallison031/admit/issues/197) | 1 | A-14.1 | XS | Full lint + test run |
| [#198](https://github.com/mallison031/admit/issues/198) | 1 | A-14.2 | XS | Fresh-clone test using only the README |
| [#199](https://github.com/mallison031/admit/issues/199) | 1 | A-14.3 | XS | AI-judge dry run |
| [#200](https://github.com/mallison031/admit/issues/200) | 1 | A-14.4 | XS | Secrets audit of git history |
| [#201](https://github.com/mallison031/admit/issues/201) | 1 | A-14.5 | XS | Docs consistency check |
| [#202](https://github.com/mallison031/admit/issues/202) | 1 | A-14.6 | S | Commit history check · **maintainer** |
