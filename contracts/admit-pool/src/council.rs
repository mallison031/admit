//! DAO-only methods (called by Sputnik FunctionCall proposals). (A-2.9, A-4.4, A-4.5)
//! The DAO never issues guarantees (AGENTS invariant 1).

use near_sdk::json_types::U128;
use near_sdk::{env, near, require, AccountId, Promise};

use crate::access::assert_dao;
use crate::errors::{
    E01_POOL_NOT_FOUND, E21_TIME_SCALE_IMMUTABLE, E23_GUARANTEE_NOT_FOUND, E24_MEMBER_NOT_FOUND,
};
use crate::pool::validate_params;
use crate::types::{GStatus, GuaranteeId, Hospital, PoolId, PoolParams, Standing};
use crate::{Contract, ContractExt};

#[near]
impl Contract {
    pub fn council_set_members(&mut self, pool_id: PoolId, council: Vec<AccountId>) {
        let mut pool = self
            .pools
            .get(&pool_id)
            .cloned()
            .unwrap_or_else(|| env::panic_str(E01_POOL_NOT_FOUND));
        assert_dao(&pool);
        pool.council = council;
        self.pools.insert(pool_id, pool);
        crate::events::emit(crate::events::AdmitEvent::CouncilSet { pool_id });
    }

    /// Registers the hospital and calls `token.storage_deposit(hospital.account)`.
    #[payable]
    pub fn council_add_hospital(&mut self, pool_id: PoolId, hospital: Hospital) -> Promise {
        let mut pool = self
            .pools
            .get(&pool_id)
            .cloned()
            .unwrap_or_else(|| env::panic_str(E01_POOL_NOT_FOUND));
        assert_dao(&pool);
        let hospital_acc = hospital.account.clone();
        if !pool.hospitals.iter().any(|h| h.account == hospital_acc) {
            pool.hospitals.push(hospital);
        }
        let token = pool.token.clone();
        self.pools.insert(pool_id, pool);

        crate::events::emit(crate::events::AdmitEvent::HospitalAdded {
            pool_id,
            hospital: hospital_acc.clone(),
        });

        self.storage_deposit(token, hospital_acc.clone())
            .then(Self::ext(env::current_account_id()).on_storage_registered(pool_id, hospital_acc))
    }

    pub fn council_remove_hospital(&mut self, pool_id: PoolId, account: AccountId) {
        let mut pool = self
            .pools
            .get(&pool_id)
            .cloned()
            .unwrap_or_else(|| env::panic_str(E01_POOL_NOT_FOUND));
        assert_dao(&pool);
        pool.hospitals.retain(|h| h.account != account);
        self.pools.insert(pool_id, pool);
        crate::events::emit(crate::events::AdmitEvent::HospitalRemoved {
            pool_id,
            hospital: account,
        });
    }

    /// Cannot change `time_scale` (E21).
    pub fn council_set_params(&mut self, pool_id: PoolId, params: PoolParams) {
        let mut pool = self
            .pools
            .get(&pool_id)
            .cloned()
            .unwrap_or_else(|| env::panic_str(E01_POOL_NOT_FOUND));
        assert_dao(&pool);
        require!(
            params.time_scale == pool.params.time_scale,
            E21_TIME_SCALE_IMMUTABLE
        );
        validate_params(&params);
        pool.params = params;
        self.pools.insert(pool_id, pool);
        crate::events::emit(crate::events::AdmitEvent::ParamsChanged { pool_id });
    }

    pub fn council_write_off(&mut self, guarantee_id: GuaranteeId, amount: U128, reason: String) {
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
        assert_dao(&pool);

        let key = (guarantee.pool_id, guarantee.member.clone());
        let mut member = self
            .members
            .get(&key)
            .cloned()
            .unwrap_or_else(|| env::panic_str(E24_MEMBER_NOT_FOUND));

        let to_write_off = amount.0.min(member.outstanding.0);
        member.outstanding.0 = member.outstanding.0.saturating_sub(to_write_off);
        pool.written_off.0 = pool.written_off.0.saturating_add(to_write_off);

        if member.outstanding.0 == 0 && member.standing == Standing::Late {
            member.standing = Standing::Good;
            crate::events::emit(crate::events::AdmitEvent::StandingChanged {
                pool_id: pool.id,
                member: member.account.clone(),
                standing: Standing::Good,
            });
        }

        guarantee.status = GStatus::WrittenOff;
        self.guarantees.insert(guarantee_id, guarantee);
        self.members.insert(key, member);
        self.pools.insert(pool.id, pool);

        crate::events::emit(crate::events::AdmitEvent::DebtWrittenOff {
            guarantee_id,
            amount: U128(to_write_off),
            reason,
        });
    }

    pub fn council_mark_default(&mut self, pool_id: PoolId, member: AccountId) {
        let pool = self
            .pools
            .get(&pool_id)
            .cloned()
            .unwrap_or_else(|| env::panic_str(E01_POOL_NOT_FOUND));
        assert_dao(&pool);

        let key = (pool_id, member.clone());
        let mut m = self
            .members
            .get(&key)
            .cloned()
            .unwrap_or_else(|| env::panic_str(E24_MEMBER_NOT_FOUND));
        m.standing = Standing::Default;
        self.members.insert(key, m);

        crate::events::emit(crate::events::AdmitEvent::StandingChanged {
            pool_id,
            member,
            standing: Standing::Default,
        });
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::{
        guarantee, insert_guarantee, insert_member, insert_pool, member, pool,
    };
    use near_sdk::test_utils::VMContextBuilder;
    use near_sdk::testing_env;

    fn set_predecessor(caller: &str) {
        let ctx = VMContextBuilder::new()
            .current_account_id("admit.near".parse().unwrap())
            .predecessor_account_id(caller.parse().unwrap())
            .build();
        testing_env!(ctx);
    }

    #[test]
    fn council_set_members_works_for_dao() {
        let mut contract = Contract::new(None);
        insert_pool(&mut contract, pool(0));

        set_predecessor("dao.near");
        contract.council_set_members(0, vec!["c1.near".parse().unwrap()]);

        let pl = contract.get_pool(0).unwrap();
        assert_eq!(pl.council, vec!["c1.near".parse::<AccountId>().unwrap()]);
    }

    #[test]
    #[should_panic(expected = "E02_NOT_DAO")]
    fn council_set_members_rejects_non_dao() {
        let mut contract = Contract::new(None);
        insert_pool(&mut contract, pool(0));

        set_predecessor("stranger.near");
        contract.council_set_members(0, vec!["c1.near".parse().unwrap()]);
    }

    #[test]
    fn council_remove_hospital_works_for_dao() {
        let mut contract = Contract::new(None);
        let mut pl = pool(0);
        let pk = "ed25519:6E8sCci9badyRkXb3JoRpAx5bMm6S3vWsc11z5qE3ZPd"
            .parse()
            .unwrap();
        pl.hospitals = vec![Hospital {
            account: "hospital.near".parse().unwrap(),
            name: "Hospital".to_string(),
            fc_public_key: pk,
        }];
        insert_pool(&mut contract, pl);

        set_predecessor("dao.near");
        contract.council_remove_hospital(0, "hospital.near".parse().unwrap());

        let pl = contract.get_pool(0).unwrap();
        assert!(pl.hospitals.is_empty());
    }

    #[test]
    #[should_panic(expected = "E02_NOT_DAO")]
    fn council_remove_hospital_rejects_non_dao() {
        let mut contract = Contract::new(None);
        insert_pool(&mut contract, pool(0));

        set_predecessor("stranger.near");
        contract.council_remove_hospital(0, "hospital.near".parse().unwrap());
    }

    #[test]
    fn council_set_params_works_for_dao() {
        let mut contract = Contract::new(None);
        insert_pool(&mut contract, pool(0));

        let mut new_params = contract.get_pool(0).unwrap().params;
        new_params.base_limit = U128(200_000_000);

        set_predecessor("dao.near");
        contract.council_set_params(0, new_params);

        let pl = contract.get_pool(0).unwrap();
        assert_eq!(pl.params.base_limit.0, 200_000_000);
    }

    #[test]
    #[should_panic(expected = "E21_TIME_SCALE_IMMUTABLE")]
    fn council_set_params_rejects_time_scale_change() {
        let mut contract = Contract::new(None);
        insert_pool(&mut contract, pool(0));

        let mut new_params = contract.get_pool(0).unwrap().params;
        new_params.time_scale = 10;

        set_predecessor("dao.near");
        contract.council_set_params(0, new_params);
    }

    #[test]
    fn council_mark_default_works_for_dao() {
        let mut contract = Contract::new(None);
        insert_pool(&mut contract, pool(0));
        insert_member(&mut contract, member(0, "alice.near".parse().unwrap()));

        set_predecessor("dao.near");
        contract.council_mark_default(0, "alice.near".parse().unwrap());

        let m = contract
            .get_member(0, "alice.near".parse().unwrap())
            .unwrap();
        assert_eq!(m.standing, Standing::Default);
    }

    #[test]
    #[should_panic(expected = "E02_NOT_DAO")]
    fn council_mark_default_rejects_non_dao() {
        let mut contract = Contract::new(None);
        insert_pool(&mut contract, pool(0));
        insert_member(&mut contract, member(0, "alice.near".parse().unwrap()));

        set_predecessor("stranger.near");
        contract.council_mark_default(0, "alice.near".parse().unwrap());
    }

    #[test]
    fn council_add_hospital_works_for_dao() {
        let mut contract = Contract::new(None);
        insert_pool(&mut contract, pool(0));

        set_predecessor("dao.near");
        let pk = "ed25519:6E8sCci9badyRkXb3JoRpAx5bMm6S3vWsc11z5qE3ZPd"
            .parse()
            .unwrap();
        let _promise = contract.council_add_hospital(
            0,
            Hospital {
                account: "hospital.near".parse().unwrap(),
                name: "Hospital".to_string(),
                fc_public_key: pk,
            },
        );

        let pl = contract.get_pool(0).unwrap();
        assert_eq!(pl.hospitals.len(), 1);
        assert_eq!(pl.hospitals[0].account.as_str(), "hospital.near");
    }

    #[test]
    #[should_panic(expected = "E02_NOT_DAO")]
    fn council_add_hospital_rejects_non_dao() {
        let mut contract = Contract::new(None);
        insert_pool(&mut contract, pool(0));

        set_predecessor("stranger.near");
        let pk = "ed25519:6E8sCci9badyRkXb3JoRpAx5bMm6S3vWsc11z5qE3ZPd"
            .parse()
            .unwrap();
        let _ = contract.council_add_hospital(
            0,
            Hospital {
                account: "hospital.near".parse().unwrap(),
                name: "Hospital".to_string(),
                fc_public_key: pk,
            },
        );
    }

    #[test]
    fn write_off_reduces_debt() {
        let mut contract = Contract::new(None);
        insert_pool(&mut contract, pool(0));

        let mut m = member(0, "alice.near".parse().unwrap());
        m.outstanding = U128(100_000_000);
        m.standing = Standing::Late;
        insert_member(&mut contract, m);

        let g = guarantee(0, GStatus::Settled);
        insert_guarantee(&mut contract, g);

        set_predecessor("dao.near");
        contract.council_write_off(0, U128(60_000_000), "hardship relief".to_string());

        let updated_m = contract
            .get_member(0, "alice.near".parse().unwrap())
            .unwrap();
        assert_eq!(updated_m.outstanding.0, 40_000_000);
        // Still late since outstanding > 0
        assert_eq!(updated_m.standing, Standing::Late);

        let updated_p = contract.get_pool(0).unwrap();
        assert_eq!(updated_p.written_off.0, 60_000_000);

        let updated_g = contract.get_guarantee(0).unwrap();
        assert_eq!(updated_g.status, GStatus::WrittenOff);
    }

    #[test]
    #[should_panic(expected = "E02_NOT_DAO")]
    fn write_off_rejects_non_dao() {
        let mut contract = Contract::new(None);
        insert_pool(&mut contract, pool(0));
        insert_member(&mut contract, member(0, "alice.near".parse().unwrap()));
        insert_guarantee(&mut contract, guarantee(0, GStatus::Settled));

        set_predecessor("stranger.near");
        contract.council_write_off(0, U128(50_000_000), "fraud".to_string());
    }
}
