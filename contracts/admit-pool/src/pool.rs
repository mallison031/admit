//! Pool creation. (A-2.6)

use near_sdk::{near, AccountId};

use crate::types::{PoolId, PoolParams};
use crate::{Contract, ContractExt};

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
        let _ = (name, dao, token, params);
        todo!("A-2.6")
    }
}
