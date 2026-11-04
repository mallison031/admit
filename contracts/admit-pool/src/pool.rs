//! Pool creation. (A-2.6)

use near_sdk::{near, require, AccountId};

use crate::errors::E22_INVALID_PARAMS;
use crate::types::{PoolId, PoolParams};
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
        let _ = (name, dao, token);
        todo!("A-2.6")
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
}
