//! DAO-only methods (called by Sputnik FunctionCall proposals). (A-2.9, A-4.4, A-4.5)
//! The DAO never issues guarantees (AGENTS invariant 1).

use near_sdk::json_types::U128;
use near_sdk::{near, AccountId, Promise};

use crate::types::{GuaranteeId, Hospital, PoolId, PoolParams};
use crate::{Contract, ContractExt};

#[near]
impl Contract {
    pub fn council_set_members(&mut self, pool_id: PoolId, council: Vec<AccountId>) {
        let _ = (pool_id, council);
        todo!("A-2.9")
    }

    /// Registers the hospital and calls `token.storage_deposit(hospital.account)`.
    #[payable]
    pub fn council_add_hospital(&mut self, pool_id: PoolId, hospital: Hospital) -> Promise {
        let _ = (pool_id, hospital);
        todo!("A-2.9")
    }

    pub fn council_remove_hospital(&mut self, pool_id: PoolId, account: AccountId) {
        let _ = (pool_id, account);
        todo!("A-2.9")
    }

    /// Cannot change `time_scale` (E21).
    pub fn council_set_params(&mut self, pool_id: PoolId, params: PoolParams) {
        let _ = (pool_id, params);
        todo!("A-2.9")
    }

    pub fn council_write_off(&mut self, guarantee_id: GuaranteeId, amount: U128, reason: String) {
        let _ = (guarantee_id, amount, reason);
        todo!("A-4.5")
    }

    pub fn council_mark_default(&mut self, pool_id: PoolId, member: AccountId) {
        let _ = (pool_id, member);
        todo!("A-4.4")
    }
}
