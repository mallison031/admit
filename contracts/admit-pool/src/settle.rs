//! Disputes, settlement, debt, death write-off, AI review. (A-4.1, A-4.2, A-4.5, A-12.1)

use near_sdk::json_types::U128;
use near_sdk::{env, near, require, Promise};

use crate::access;
use crate::errors::{
    E01_POOL_NOT_FOUND, E03_NOT_COUNCIL, E14_INVALID_STATUS, E15_CLAIM_EXCEEDS_GUARANTEE,
    E16_DISPUTE_WINDOW_OPEN, E17_DISPUTE_WINDOW_CLOSED, E23_GUARANTEE_NOT_FOUND,
    E24_MEMBER_NOT_FOUND,
};
use crate::events::{self, AdmitEvent};
use crate::time;
use crate::types::{AiReview, GStatus, GuaranteeId, Standing};
use crate::{Contract, ContractExt};

/// Paid = claim − adjustment, debt = paid × (10_000 − bps) / 10_000. (A-4.2)
pub fn settlement_split(claim: u128, adjustment: u128, pool_covered_bps: u16) -> (u128, u128) {
    assert!(adjustment <= claim, "adjustment cannot exceed claim");
    let paid = claim - adjustment;
    let pool_cov = (pool_covered_bps as u128).min(10_000);
    let debt = paid
        .saturating_mul(10_000 - pool_cov)
        .checked_div(10_000)
        .unwrap_or(0);
    (paid, debt)
}

#[near]
impl Contract {
    /// Member (or delegate), within the dispute window (E17) → Disputed.
    pub fn member_dispute(&mut self, guarantee_id: GuaranteeId, reason: String) {
        let mut guarantee = self
            .guarantees
            .get(&guarantee_id)
            .cloned()
            .unwrap_or_else(|| env::panic_str(E23_GUARANTEE_NOT_FOUND));

        let pool = self
            .pools
            .get(&guarantee.pool_id)
            .cloned()
            .unwrap_or_else(|| env::panic_str(E01_POOL_NOT_FOUND));

        let member_key = (guarantee.pool_id, guarantee.member.clone());
        let member = self
            .members
            .get(&member_key)
            .cloned()
            .unwrap_or_else(|| env::panic_str(E24_MEMBER_NOT_FOUND));

        access::assert_member_or_delegate(&member);

        require!(guarantee.status == GStatus::Claimed, E14_INVALID_STATUS);

        let claim = guarantee
            .claim
            .as_mut()
            .unwrap_or_else(|| env::panic_str(E14_INVALID_STATUS));
        let window = time::scaled(pool.params.dispute_window.0, pool.params.time_scale);
        let deadline = claim.claimed_at.0.saturating_add(window);
        require!(
            env::block_timestamp() <= deadline,
            E17_DISPUTE_WINDOW_CLOSED
        );

        claim.dispute = Some(reason);
        guarantee.status = GStatus::Disputed;
        self.guarantees.insert(guarantee_id, guarantee);

        events::emit(AdmitEvent::GuaranteeDisputed { guarantee_id });
    }

    /// Anyone after the window if undisputed; a council member earlier or with an adjustment.
    /// Pays hospital (amount − adjustment), frees reservation, adds debt paid × (1 − pool_covered_bps).
    pub fn settle(
        &mut self,
        guarantee_id: GuaranteeId,
        adjustment: Option<U128>,
        adjustment_reason: Option<String>,
    ) -> Promise {
        let mut guarantee = self
            .guarantees
            .get(&guarantee_id)
            .cloned()
            .unwrap_or_else(|| env::panic_str(E23_GUARANTEE_NOT_FOUND));

        let mut pool = self
            .pools
            .get(&guarantee.pool_id)
            .cloned()
            .unwrap_or_else(|| env::panic_str(E01_POOL_NOT_FOUND));

        let member_key = (guarantee.pool_id, guarantee.member.clone());
        let mut member = self
            .members
            .get(&member_key)
            .cloned()
            .unwrap_or_else(|| env::panic_str(E24_MEMBER_NOT_FOUND));

        let caller = env::predecessor_account_id();
        let is_council = pool.council.contains(&caller);

        require!(
            guarantee.status == GStatus::Claimed || guarantee.status == GStatus::Disputed,
            E14_INVALID_STATUS
        );

        let claim = guarantee
            .claim
            .as_mut()
            .unwrap_or_else(|| env::panic_str(E14_INVALID_STATUS));

        if !is_council {
            require!(guarantee.status != GStatus::Disputed, E14_INVALID_STATUS);
            require!(adjustment.is_none(), E03_NOT_COUNCIL);

            let window = time::scaled(pool.params.dispute_window.0, pool.params.time_scale);
            let deadline = claim.claimed_at.0.saturating_add(window);
            require!(env::block_timestamp() > deadline, E16_DISPUTE_WINDOW_OPEN);
        }

        let adj_val = adjustment.map(|a| a.0).unwrap_or(0);
        require!(adj_val <= claim.amount.0, E15_CLAIM_EXCEEDS_GUARANTEE);

        let (paid, debt_added) =
            settlement_split(claim.amount.0, adj_val, pool.params.pool_covered_bps);

        claim.adjustment = U128(adj_val);
        claim.adjustment_reason = adjustment_reason;
        claim.paid = U128(paid);

        guarantee.status = GStatus::Settled;
        pool.reserved.0 = pool.reserved.0.saturating_sub(guarantee.amount.0);
        pool.balance.0 = pool.balance.0.saturating_sub(paid);
        member.outstanding.0 = member.outstanding.0.saturating_add(debt_added);
        member.active_guarantees = member.active_guarantees.saturating_sub(1);

        self.guarantees.insert(guarantee_id, guarantee.clone());
        self.pools.insert(pool.id, pool.clone());
        self.members.insert(member_key, member);

        events::emit(AdmitEvent::GuaranteeSettled {
            guarantee_id,
            paid: U128(paid),
            debt_added: U128(debt_added),
        });

        self.ft_transfer(pool.token, guarantee.hospital, U128(paid))
            .then(Self::ext(env::current_account_id()).on_hospital_paid(guarantee_id, U128(paid)))
    }

    /// Council member. If `cover_on_death`, writes off this guarantee's debt.
    pub fn report_death(&mut self, guarantee_id: GuaranteeId) {
        let mut guarantee = self
            .guarantees
            .get(&guarantee_id)
            .cloned()
            .unwrap_or_else(|| env::panic_str(E23_GUARANTEE_NOT_FOUND));

        let mut pool = self
            .pools
            .get(&guarantee.pool_id)
            .cloned()
            .unwrap_or_else(|| env::panic_str(E01_POOL_NOT_FOUND));

        access::assert_council(&pool);

        if pool.params.cover_on_death {
            let member_key = (guarantee.pool_id, guarantee.member.clone());
            let mut member = self
                .members
                .get(&member_key)
                .cloned()
                .unwrap_or_else(|| env::panic_str(E24_MEMBER_NOT_FOUND));

            let guarantee_debt = if let Some(claim) = &guarantee.claim {
                let base = if claim.paid.0 > 0 {
                    claim.paid.0
                } else {
                    claim.amount.0
                };
                base.saturating_mul(10_000 - pool.params.pool_covered_bps as u128) / 10_000
            } else {
                guarantee
                    .amount
                    .0
                    .saturating_mul(10_000 - pool.params.pool_covered_bps as u128)
                    / 10_000
            };

            let to_write_off = guarantee_debt.min(member.outstanding.0);
            member.outstanding.0 = member.outstanding.0.saturating_sub(to_write_off);
            pool.written_off.0 = pool.written_off.0.saturating_add(to_write_off);

            if member.outstanding.0 == 0 && member.standing == Standing::Late {
                member.standing = Standing::Good;
                events::emit(AdmitEvent::StandingChanged {
                    pool_id: pool.id,
                    member: member.account.clone(),
                    standing: Standing::Good,
                });
            }

            guarantee.status = GStatus::WrittenOff;
            self.guarantees.insert(guarantee_id, guarantee);
            self.members.insert(member_key, member);
            self.pools.insert(pool.id, pool);

            events::emit(AdmitEvent::DebtWrittenOff {
                guarantee_id,
                amount: U128(to_write_off),
                reason: "death".to_string(),
            });
        }
    }

    /// Could (A-12.1). Only `ai_reviewer` (E27). Advisory only.
    pub fn post_ai_review(&mut self, guarantee_id: GuaranteeId, review: AiReview) {
        let _ = (guarantee_id, review);
        todo!("A-12.1")
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::{
        guarantee, insert_guarantee, insert_member, insert_pool, member, pool,
    };
    use crate::types::Claim;
    use near_sdk::json_types::U64;
    use near_sdk::test_utils::VMContextBuilder;
    use near_sdk::testing_env;

    #[test]
    fn settlement_split_normal() {
        let (paid, debt) = settlement_split(100, 0, 0);
        assert_eq!(paid, 100);
        assert_eq!(debt, 100);
    }

    #[test]
    fn settlement_split_with_adjustment() {
        let (paid, debt) = settlement_split(100, 30, 0);
        assert_eq!(paid, 70);
        assert_eq!(debt, 70);
    }

    #[test]
    fn settlement_split_with_pool_covered() {
        let (paid, debt) = settlement_split(100, 0, 2_000); // 20% covered by pool
        assert_eq!(paid, 100);
        assert_eq!(debt, 80);
    }

    #[test]
    #[should_panic(expected = "adjustment cannot exceed claim")]
    fn settlement_split_adjustment_exceeds_claim() {
        settlement_split(100, 150, 0);
    }

    #[test]
    fn dispute_within_window() {
        let mut contract = Contract::new(None);
        insert_pool(&mut contract, pool(0));
        let mut m = member(0, "alice.near".parse().unwrap());
        m.delegates.push("phone.near".parse().unwrap());
        insert_member(&mut contract, m);

        let mut g = guarantee(0, GStatus::Claimed);
        g.claim = Some(Claim {
            amount: U128(100_000_000),
            file_hash: [0u8; 32],
            claimed_at: U64(1_000),
            dispute: None,
            adjustment: U128(0),
            adjustment_reason: None,
            paid: U128(0),
            ai_review: None,
        });
        insert_guarantee(&mut contract, g);

        // Dispute window is 172_800_000_000_000 ns. Set block time to 1_000 + 10_000
        testing_env!(VMContextBuilder::new()
            .predecessor_account_id("phone.near".parse().unwrap())
            .block_timestamp(11_000)
            .build());

        contract.member_dispute(0, "Overcharged for meds".to_string());

        let updated = contract.get_guarantee(0).unwrap();
        assert_eq!(updated.status, GStatus::Disputed);
        assert_eq!(
            updated.claim.unwrap().dispute,
            Some("Overcharged for meds".to_string())
        );
    }

    #[test]
    #[should_panic(expected = "E17_DISPUTE_WINDOW_CLOSED")]
    fn dispute_after_window_fails() {
        let mut contract = Contract::new(None);
        let p = pool(0);
        let window = p.params.dispute_window.0;
        insert_pool(&mut contract, p);
        insert_member(&mut contract, member(0, "alice.near".parse().unwrap()));

        let mut g = guarantee(0, GStatus::Claimed);
        g.claim = Some(Claim {
            amount: U128(100_000_000),
            file_hash: [0u8; 32],
            claimed_at: U64(1_000),
            dispute: None,
            adjustment: U128(0),
            adjustment_reason: None,
            paid: U128(0),
            ai_review: None,
        });
        insert_guarantee(&mut contract, g);

        testing_env!(VMContextBuilder::new()
            .predecessor_account_id("alice.near".parse().unwrap())
            .block_timestamp(1_000 + window + 1)
            .build());

        contract.member_dispute(0, "Too late to dispute".to_string());
    }

    #[test]
    fn report_death_writes_off_debt() {
        let mut contract = Contract::new(None);
        let mut p = pool(0);
        p.params.cover_on_death = true;
        p.params.pool_covered_bps = 0;
        insert_pool(&mut contract, p);

        let mut m = member(0, "alice.near".parse().unwrap());
        m.outstanding = U128(80_000_000);
        m.standing = Standing::Late;
        insert_member(&mut contract, m);

        let mut g = guarantee(0, GStatus::Settled);
        g.claim = Some(Claim {
            amount: U128(100_000_000),
            file_hash: [0u8; 32],
            claimed_at: U64(1_000),
            dispute: None,
            adjustment: U128(20_000_000),
            adjustment_reason: None,
            paid: U128(80_000_000),
            ai_review: None,
        });
        insert_guarantee(&mut contract, g);

        testing_env!(VMContextBuilder::new()
            .predecessor_account_id("council1.near".parse().unwrap())
            .build());

        contract.report_death(0);

        let updated_m = contract
            .get_member(0, "alice.near".parse().unwrap())
            .unwrap();
        assert_eq!(updated_m.outstanding.0, 0);
        assert_eq!(updated_m.standing, Standing::Good);

        let updated_p = contract.get_pool(0).unwrap();
        assert_eq!(updated_p.written_off.0, 80_000_000);

        let updated_g = contract.get_guarantee(0).unwrap();
        assert_eq!(updated_g.status, GStatus::WrittenOff);
    }

    #[test]
    fn settle_after_window_undisputed_by_anyone() {
        let mut contract = Contract::new(None);
        let mut p = pool(0);
        let window = p.params.dispute_window.0;
        p.balance = U128(1_000_000_000);
        p.reserved = U128(100_000_000);
        insert_pool(&mut contract, p);

        let mut m = member(0, "alice.near".parse().unwrap());
        m.active_guarantees = 1;
        m.outstanding = U128(0);
        insert_member(&mut contract, m);

        let mut g = guarantee(0, GStatus::Claimed);
        g.amount = U128(100_000_000);
        g.claim = Some(Claim {
            amount: U128(100_000_000),
            file_hash: [0u8; 32],
            claimed_at: U64(1_000),
            dispute: None,
            adjustment: U128(0),
            adjustment_reason: None,
            paid: U128(0),
            ai_review: None,
        });
        insert_guarantee(&mut contract, g);

        // Call settle by stranger after dispute window
        testing_env!(VMContextBuilder::new()
            .current_account_id("pool.near".parse().unwrap())
            .predecessor_account_id("stranger.near".parse().unwrap())
            .block_timestamp(1_000 + window + 10)
            .build());

        let _promise = contract.settle(0, None, None);

        let updated_g = contract.get_guarantee(0).unwrap();
        assert_eq!(updated_g.status, GStatus::Settled);
        assert_eq!(updated_g.claim.unwrap().paid.0, 100_000_000);

        let updated_p = contract.get_pool(0).unwrap();
        assert_eq!(updated_p.balance.0, 900_000_000);
        assert_eq!(updated_p.reserved.0, 0);

        let updated_m = contract
            .get_member(0, "alice.near".parse().unwrap())
            .unwrap();
        assert_eq!(updated_m.outstanding.0, 100_000_000);
        assert_eq!(updated_m.active_guarantees, 0);
    }

    #[test]
    #[should_panic(expected = "E16_DISPUTE_WINDOW_OPEN")]
    fn settle_before_window_closes_fails_for_non_council() {
        let mut contract = Contract::new(None);
        insert_pool(&mut contract, pool(0));
        insert_member(&mut contract, member(0, "alice.near".parse().unwrap()));

        let mut g = guarantee(0, GStatus::Claimed);
        g.claim = Some(Claim {
            amount: U128(100_000_000),
            file_hash: [0u8; 32],
            claimed_at: U64(1_000),
            dispute: None,
            adjustment: U128(0),
            adjustment_reason: None,
            paid: U128(0),
            ai_review: None,
        });
        insert_guarantee(&mut contract, g);

        testing_env!(VMContextBuilder::new()
            .current_account_id("pool.near".parse().unwrap())
            .predecessor_account_id("stranger.near".parse().unwrap())
            .block_timestamp(1_000 + 100)
            .build());

        let _ = contract.settle(0, None, None);
    }

    #[test]
    #[should_panic(expected = "E14_INVALID_STATUS")]
    fn settle_disputed_fails_for_non_council() {
        let mut contract = Contract::new(None);
        let p = pool(0);
        let window = p.params.dispute_window.0;
        insert_pool(&mut contract, p);
        insert_member(&mut contract, member(0, "alice.near".parse().unwrap()));

        let mut g = guarantee(0, GStatus::Disputed);
        g.claim = Some(Claim {
            amount: U128(100_000_000),
            file_hash: [0u8; 32],
            claimed_at: U64(1_000),
            dispute: Some("Overcharged".to_string()),
            adjustment: U128(0),
            adjustment_reason: None,
            paid: U128(0),
            ai_review: None,
        });
        insert_guarantee(&mut contract, g);

        testing_env!(VMContextBuilder::new()
            .current_account_id("pool.near".parse().unwrap())
            .predecessor_account_id("stranger.near".parse().unwrap())
            .block_timestamp(1_000 + window + 10)
            .build());

        let _ = contract.settle(0, None, None);
    }

    #[test]
    fn settle_by_council_early_with_adjustment() {
        let mut contract = Contract::new(None);
        let mut p = pool(0);
        p.balance = U128(1_000_000_000);
        p.reserved = U128(100_000_000);
        insert_pool(&mut contract, p);

        let mut m = member(0, "alice.near".parse().unwrap());
        m.active_guarantees = 1;
        insert_member(&mut contract, m);

        let mut g = guarantee(0, GStatus::Claimed);
        g.amount = U128(100_000_000);
        g.claim = Some(Claim {
            amount: U128(100_000_000),
            file_hash: [0u8; 32],
            claimed_at: U64(1_000),
            dispute: None,
            adjustment: U128(0),
            adjustment_reason: None,
            paid: U128(0),
            ai_review: None,
        });
        insert_guarantee(&mut contract, g);

        testing_env!(VMContextBuilder::new()
            .current_account_id("pool.near".parse().unwrap())
            .predecessor_account_id("council1.near".parse().unwrap())
            .block_timestamp(1_050)
            .build());

        let _promise = contract.settle(
            0,
            Some(U128(30_000_000)),
            Some("Trimming excess line items".to_string()),
        );

        let updated_g = contract.get_guarantee(0).unwrap();
        assert_eq!(updated_g.status, GStatus::Settled);
        let cl = updated_g.claim.unwrap();
        assert_eq!(cl.paid.0, 70_000_000);
        assert_eq!(cl.adjustment.0, 30_000_000);
        assert_eq!(
            cl.adjustment_reason,
            Some("Trimming excess line items".to_string())
        );

        let updated_p = contract.get_pool(0).unwrap();
        assert_eq!(updated_p.balance.0, 930_000_000);
        assert_eq!(updated_p.reserved.0, 0);

        let updated_m = contract
            .get_member(0, "alice.near".parse().unwrap())
            .unwrap();
        assert_eq!(updated_m.outstanding.0, 70_000_000);
        assert_eq!(updated_m.active_guarantees, 0);
    }

    #[test]
    fn settle_by_council_when_disputed() {
        let mut contract = Contract::new(None);
        let mut p = pool(0);
        p.balance = U128(1_000_000_000);
        p.reserved = U128(100_000_000);
        insert_pool(&mut contract, p);

        let mut m = member(0, "alice.near".parse().unwrap());
        m.active_guarantees = 1;
        insert_member(&mut contract, m);

        let mut g = guarantee(0, GStatus::Disputed);
        g.amount = U128(100_000_000);
        g.claim = Some(Claim {
            amount: U128(100_000_000),
            file_hash: [0u8; 32],
            claimed_at: U64(1_000),
            dispute: Some("Member disputed cost".to_string()),
            adjustment: U128(0),
            adjustment_reason: None,
            paid: U128(0),
            ai_review: None,
        });
        insert_guarantee(&mut contract, g);

        testing_env!(VMContextBuilder::new()
            .current_account_id("pool.near".parse().unwrap())
            .predecessor_account_id("council2.near".parse().unwrap())
            .block_timestamp(2_000)
            .build());

        let _promise = contract.settle(0, Some(U128(20_000_000)), None);

        let updated_g = contract.get_guarantee(0).unwrap();
        assert_eq!(updated_g.status, GStatus::Settled);
        assert_eq!(updated_g.claim.unwrap().paid.0, 80_000_000);
    }
}
