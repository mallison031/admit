//! Pool creation. (A-2.6)

use near_sdk::json_types::{U128, U64};
use near_sdk::{env, near, require, AccountId};

use crate::errors::{E22_INVALID_PARAMS, E30_INSUFFICIENT_DEPOSIT};
use crate::types::{Pool, PoolId, PoolParams};
use crate::{Contract, ContractExt};

pub(crate) fn validate_params(p: &PoolParams) {
    let valid = p.time_scale >= 1
        && p.late_limit_bps <= 10_000
        && p.max_exposure_bps <= 10_000
        && p.pool_covered_bps <= 10_000
        && p.max_limit.0 >= p.base_limit.0
        && p.council_tier_multiplier >= 1;
    require!(valid, E22_INVALID_PARAMS);
}

#[near]
impl Contract {
    /// Creates a pool. Validates params (E22); caller pays storage (E30); `dao` must exist.
    #[payable]
    pub fn create_pool(
        &mut self,
        name: String,
        dao: AccountId,
        token: AccountId,
        params: PoolParams,
    ) -> PoolId {
        validate_params(&params);
        let initial_storage = env::storage_usage();

        let id = self.next_pool_id;
        self.next_pool_id = self
            .next_pool_id
            .checked_add(1)
            .expect("overflow next_pool_id");

        let pool = Pool {
            id,
            name,
            dao: dao.clone(),
            token: token.clone(),
            params,
            council: vec![],
            hospitals: vec![],
            balance: U128(0),
            reserved: U128(0),
            written_off: U128(0),
            created_at: U64(env::block_timestamp()),
        };
        self.pools.insert(id, pool);

        let final_storage = env::storage_usage();
        let storage_used = final_storage.saturating_sub(initial_storage);
        let required_cost = env::storage_byte_cost().saturating_mul(storage_used as u128);
        require!(
            env::attached_deposit() >= required_cost,
            E30_INSUFFICIENT_DEPOSIT
        );

        crate::events::emit(crate::events::AdmitEvent::PoolCreated {
            pool_id: id,
            dao,
            token,
        });

        id
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::params;
    use near_sdk::json_types::U128;

    #[test]
    fn validate_params_passes_for_valid() {
        let p = params();
        validate_params(&p);
    }

    #[test]
    #[should_panic(expected = "E22_INVALID_PARAMS")]
    fn validate_params_rejects_zero_time_scale() {
        let mut p = params();
        p.time_scale = 0;
        validate_params(&p);
    }

    #[test]
    #[should_panic(expected = "E22_INVALID_PARAMS")]
    fn validate_params_rejects_excess_late_limit_bps() {
        let mut p = params();
        p.late_limit_bps = 10_001;
        validate_params(&p);
    }

    #[test]
    #[should_panic(expected = "E22_INVALID_PARAMS")]
    fn validate_params_rejects_excess_max_exposure_bps() {
        let mut p = params();
        p.max_exposure_bps = 10_001;
        validate_params(&p);
    }

    #[test]
    #[should_panic(expected = "E22_INVALID_PARAMS")]
    fn validate_params_rejects_excess_pool_covered_bps() {
        let mut p = params();
        p.pool_covered_bps = 10_001;
        validate_params(&p);
    }

    #[test]
    #[should_panic(expected = "E22_INVALID_PARAMS")]
    fn validate_params_rejects_max_limit_below_base() {
        let mut p = params();
        p.base_limit = U128(100);
        p.max_limit = U128(50);
        validate_params(&p);
    }

    #[test]
    #[should_panic(expected = "E22_INVALID_PARAMS")]
    fn validate_params_rejects_zero_council_tier_multiplier() {
        let mut p = params();
        p.council_tier_multiplier = 0;
        validate_params(&p);
    }

    #[test]
    fn create_pool_stores_pool_and_increments_id() {
        let mut contract = Contract::new(None);
        let p = params();
        let id0 = contract.create_pool(
            "Pool 0".to_string(),
            "dao.near".parse().unwrap(),
            "usdc.near".parse().unwrap(),
            p.clone(),
        );
        assert_eq!(id0, 0);
        assert_eq!(contract.next_pool_id, 1);
        let stored = contract.get_pool(0).expect("pool exists");
        assert_eq!(stored.name, "Pool 0");
        assert_eq!(stored.dao.as_str(), "dao.near");

        let id1 = contract.create_pool(
            "Pool 1".to_string(),
            "dao.near".parse().unwrap(),
            "usdc.near".parse().unwrap(),
            p,
        );
        assert_eq!(id1, 1);
        assert_eq!(contract.next_pool_id, 2);
    }
}
