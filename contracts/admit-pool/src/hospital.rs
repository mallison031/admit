//! Hospital actions (function-call key via relayer). (A-3.6–A-3.8, A-3.10)

use near_sdk::json_types::{U128, U64};
use near_sdk::{env, near, AccountId};

use crate::errors::{
    E01_POOL_NOT_FOUND, E06_HOSPITAL_NOT_REGISTERED, E14_INVALID_STATUS,
    E15_CLAIM_EXCEEDS_GUARANTEE, E23_GUARANTEE_NOT_FOUND,
};
use crate::types::{Claim, CryptoHash, GStatus, Guarantee, GuaranteeId};
use crate::{Contract, ContractExt};

#[near]
impl Contract {
    /// Issued → Accepted; expiry no longer applies.
    pub fn hospital_accept(&mut self, guarantee_id: GuaranteeId) {
        let mut g = self
            .guarantees
            .get(&guarantee_id)
            .cloned()
            .unwrap_or_else(|| env::panic_str(E23_GUARANTEE_NOT_FOUND));

        crate::access::assert_hospital(&g);

        if g.status != GStatus::Issued {
            env::panic_str(E14_INVALID_STATUS);
        }

        let now_ns = env::block_timestamp();
        g.status = GStatus::Accepted;
        g.accepted_at = Some(U64(now_ns));

        self.guarantees.insert(guarantee_id, g);

        crate::events::emit(crate::events::AdmitEvent::GuaranteeAccepted { guarantee_id });
    }

    /// Accepted → Claimed; amount ≤ guarantee (E15); starts the dispute window.
    pub fn hospital_claim(
        &mut self,
        guarantee_id: GuaranteeId,
        amount: U128,
        file_hash: CryptoHash,
    ) {
        let mut g = self
            .guarantees
            .get(&guarantee_id)
            .cloned()
            .unwrap_or_else(|| env::panic_str(E23_GUARANTEE_NOT_FOUND));

        crate::access::assert_hospital(&g);

        if g.status != GStatus::Accepted {
            env::panic_str(E14_INVALID_STATUS);
        }

        if amount.0 > g.amount.0 {
            env::panic_str(E15_CLAIM_EXCEEDS_GUARANTEE);
        }

        let now_ns = env::block_timestamp();
        g.status = GStatus::Claimed;
        g.claim = Some(Claim {
            amount,
            file_hash,
            claimed_at: U64(now_ns),
            dispute: None,
            adjustment: U128(0),
            adjustment_reason: None,
            paid: U128(0),
            ai_review: None,
        });

        self.guarantees.insert(guarantee_id, g);

        crate::events::emit(crate::events::AdmitEvent::GuaranteeClaimed {
            guarantee_id,
            amount,
        });
    }

    /// → Released; frees the reservation.
    pub fn hospital_release(&mut self, guarantee_id: GuaranteeId) {
        let mut g = self
            .guarantees
            .get(&guarantee_id)
            .cloned()
            .unwrap_or_else(|| env::panic_str(E23_GUARANTEE_NOT_FOUND));

        crate::access::assert_hospital(&g);

        if g.status != GStatus::Issued && g.status != GStatus::Accepted {
            env::panic_str(E14_INVALID_STATUS);
        }

        let mut pool = self
            .pools
            .get(&g.pool_id)
            .cloned()
            .unwrap_or_else(|| env::panic_str(E01_POOL_NOT_FOUND));

        pool.reserved.0 = pool.reserved.0.saturating_sub(g.amount.0);
        g.status = GStatus::Released;

        let member_key = (g.pool_id, g.member.clone());
        if let Some(mut m) = self.members.get(&member_key).cloned() {
            m.active_guarantees = m.active_guarantees.saturating_sub(1);
            self.members.insert(member_key, m);
        }

        self.guarantees.insert(guarantee_id, g);
        self.pools.insert(pool.id, pool);

        crate::events::emit(crate::events::AdmitEvent::GuaranteeReleased { guarantee_id });
    }

    /// Keeps `partial_amount` as a claim here; the remainder becomes a new guarantee at `to_hospital`.
    pub fn hospital_transfer(
        &mut self,
        guarantee_id: GuaranteeId,
        to_hospital: AccountId,
        partial_amount: U128,
    ) -> GuaranteeId {
        let mut g = self
            .guarantees
            .get(&guarantee_id)
            .cloned()
            .unwrap_or_else(|| env::panic_str(E23_GUARANTEE_NOT_FOUND));

        crate::access::assert_hospital(&g);

        let pool = self
            .pools
            .get(&g.pool_id)
            .cloned()
            .unwrap_or_else(|| env::panic_str(E01_POOL_NOT_FOUND));

        if !pool.hospitals.iter().any(|h| h.account == to_hospital) {
            env::panic_str(E06_HOSPITAL_NOT_REGISTERED);
        }

        if g.status != GStatus::Accepted && g.status != GStatus::Issued {
            env::panic_str(E14_INVALID_STATUS);
        }

        if partial_amount.0 >= g.amount.0 {
            env::panic_str(E15_CLAIM_EXCEEDS_GUARANTEE);
        }

        let now_ns = env::block_timestamp();
        let remaining_amount = g.amount.0.saturating_sub(partial_amount.0);

        // Current guarantee keeps partial_amount as a claim
        g.status = GStatus::Claimed;
        g.amount = partial_amount;
        g.claim = Some(Claim {
            amount: partial_amount,
            file_hash: [0u8; 32],
            claimed_at: U64(now_ns),
            dispute: None,
            adjustment: U128(0),
            adjustment_reason: None,
            paid: U128(0),
            ai_review: None,
        });
        self.guarantees.insert(guarantee_id, g.clone());

        // New guarantee at to_hospital for the remainder
        let new_id = self.next_guarantee_id;
        self.next_guarantee_id = self
            .next_guarantee_id
            .checked_add(1)
            .expect("overflow guarantee id");

        let new_g = Guarantee {
            id: new_id,
            pool_id: g.pool_id,
            member: g.member.clone(),
            requested_by: g.requested_by.clone(),
            patient_initials: g.patient_initials.clone(),
            code_hash: g.code_hash,
            hospital: to_hospital.clone(),
            amount: U128(remaining_amount),
            local: g.local.clone(),
            status: GStatus::Accepted,
            issued_at: g.issued_at,
            expires_at: g.expires_at,
            accepted_at: Some(U64(now_ns)),
            claim: None,
            approved_by: g.approved_by.clone(),
            transferred_from: Some(guarantee_id),
        };
        self.guarantees.insert(new_id, new_g);

        crate::events::emit(crate::events::AdmitEvent::GuaranteeTransferred {
            from_id: guarantee_id,
            to_id: new_id,
            to_hospital,
        });

        new_id
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::{
        guarantee, hospital, insert_guarantee, insert_member, insert_pool, member, pool,
    };
    use near_sdk::test_utils::VMContextBuilder;
    use near_sdk::testing_env;

    #[test]
    fn hospital_accept_happy_path() {
        let mut contract = Contract::new(None);
        let mut g = guarantee(1, GStatus::Issued);
        g.hospital = "hospital.near".parse().unwrap();
        insert_guarantee(&mut contract, g);

        let ctx = VMContextBuilder::new()
            .predecessor_account_id("hospital.near".parse().unwrap())
            .block_timestamp(1_000_000)
            .build();
        testing_env!(ctx);

        contract.hospital_accept(1);

        let updated = contract.get_guarantee(1).unwrap();
        assert_eq!(updated.status, GStatus::Accepted);
        assert_eq!(updated.accepted_at, Some(U64(1_000_000)));
    }

    #[test]
    #[should_panic(expected = "E14_INVALID_STATUS")]
    fn hospital_accept_rejects_wrong_status() {
        let mut contract = Contract::new(None);
        let mut g = guarantee(1, GStatus::PendingCouncil); // not Issued
        g.hospital = "hospital.near".parse().unwrap();
        insert_guarantee(&mut contract, g);

        let ctx = VMContextBuilder::new()
            .predecessor_account_id("hospital.near".parse().unwrap())
            .build();
        testing_env!(ctx);

        contract.hospital_accept(1);
    }

    #[test]
    fn hospital_claim_happy_path() {
        let mut contract = Contract::new(None);
        let mut g = guarantee(1, GStatus::Accepted);
        g.hospital = "hospital.near".parse().unwrap();
        g.amount = U128(500);
        insert_guarantee(&mut contract, g);

        let ctx = VMContextBuilder::new()
            .predecessor_account_id("hospital.near".parse().unwrap())
            .block_timestamp(2_000_000)
            .build();
        testing_env!(ctx);

        contract.hospital_claim(1, U128(400), [0u8; 32]);

        let updated = contract.get_guarantee(1).unwrap();
        assert_eq!(updated.status, GStatus::Claimed);
        let claim = updated.claim.unwrap();
        assert_eq!(claim.amount.0, 400);
        assert_eq!(claim.claimed_at.0, 2_000_000);
    }

    #[test]
    #[should_panic(expected = "E15_CLAIM_EXCEEDS_GUARANTEE")]
    fn hospital_claim_rejects_excess_amount() {
        let mut contract = Contract::new(None);
        let mut g = guarantee(1, GStatus::Accepted);
        g.hospital = "hospital.near".parse().unwrap();
        g.amount = U128(500);
        insert_guarantee(&mut contract, g);

        let ctx = VMContextBuilder::new()
            .predecessor_account_id("hospital.near".parse().unwrap())
            .build();
        testing_env!(ctx);

        contract.hospital_claim(1, U128(501), [0u8; 32]);
    }

    #[test]
    fn hospital_release_happy_path() {
        let mut contract = Contract::new(None);
        let mut p = pool(0);
        p.reserved = U128(500);
        insert_pool(&mut contract, p);

        let mut m = member(0, "alice.near".parse().unwrap());
        m.active_guarantees = 1;
        insert_member(&mut contract, m);

        let mut g = guarantee(1, GStatus::Accepted);
        g.pool_id = 0;
        g.member = "alice.near".parse().unwrap();
        g.hospital = "hospital.near".parse().unwrap();
        g.amount = U128(500);
        insert_guarantee(&mut contract, g);

        let ctx = VMContextBuilder::new()
            .predecessor_account_id("hospital.near".parse().unwrap())
            .build();
        testing_env!(ctx);

        contract.hospital_release(1);

        let updated = contract.get_guarantee(1).unwrap();
        assert_eq!(updated.status, GStatus::Released);

        let pl = contract.get_pool(0).unwrap();
        assert_eq!(pl.reserved.0, 0);

        let mem = contract
            .get_member(0, "alice.near".parse().unwrap())
            .unwrap();
        assert_eq!(mem.active_guarantees, 0);
    }

    #[test]
    #[should_panic(expected = "E04_NOT_HOSPITAL")]
    fn hospital_release_rejects_non_hospital() {
        let mut contract = Contract::new(None);
        let mut g = guarantee(1, GStatus::Accepted);
        g.hospital = "hospital.near".parse().unwrap();
        insert_guarantee(&mut contract, g);

        let ctx = VMContextBuilder::new()
            .predecessor_account_id("stranger.near".parse().unwrap())
            .build();
        testing_env!(ctx);

        contract.hospital_release(1);
    }

    #[test]
    fn hospital_transfer_happy_path() {
        let mut contract = Contract::new(None);
        let mut p = pool(0);
        p.hospitals = vec![
            hospital("hosp1.near".parse().unwrap()),
            hospital("hosp2.near".parse().unwrap()),
        ];
        insert_pool(&mut contract, p);

        let mut g = guarantee(1, GStatus::Accepted);
        g.pool_id = 0;
        g.hospital = "hosp1.near".parse().unwrap();
        g.amount = U128(500);
        insert_guarantee(&mut contract, g);

        let ctx = VMContextBuilder::new()
            .predecessor_account_id("hosp1.near".parse().unwrap())
            .block_timestamp(3_000_000)
            .build();
        testing_env!(ctx);

        let new_id = contract.hospital_transfer(1, "hosp2.near".parse().unwrap(), U128(200));

        let orig = contract.get_guarantee(1).unwrap();
        assert_eq!(orig.status, GStatus::Claimed);
        assert_eq!(orig.amount.0, 200);

        let new_g = contract.get_guarantee(new_id).unwrap();
        assert_eq!(new_g.status, GStatus::Accepted);
        assert_eq!(new_g.hospital, "hosp2.near".parse::<AccountId>().unwrap());
        assert_eq!(new_g.amount.0, 300);
        assert_eq!(new_g.transferred_from, Some(1));
    }

    #[test]
    #[should_panic(expected = "E06_HOSPITAL_NOT_REGISTERED")]
    fn hospital_transfer_rejects_unregistered_hospital() {
        let mut contract = Contract::new(None);
        let mut p = pool(0);
        p.hospitals = vec![hospital("hosp1.near".parse().unwrap())];
        insert_pool(&mut contract, p);

        let mut g = guarantee(1, GStatus::Accepted);
        g.pool_id = 0;
        g.hospital = "hosp1.near".parse().unwrap();
        insert_guarantee(&mut contract, g);

        let ctx = VMContextBuilder::new()
            .predecessor_account_id("hosp1.near".parse().unwrap())
            .build();
        testing_env!(ctx);

        contract.hospital_transfer(1, "unregistered.near".parse().unwrap(), U128(100));
    }
}
