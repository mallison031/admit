//! Members: join, delegates, contributions, repayment, exits. (A-2.7, A-2.8, A-4.3, A-4.6)

use near_sdk::json_types::U128;
use near_sdk::{near, AccountId};

use crate::types::PoolId;
use crate::{Contract, ContractExt};

#[near]
impl Contract {
    #[payable]
    pub fn join(&mut self, pool_id: PoolId) {
        let _ = pool_id;
        todo!("A-2.7")
    }

    /// Adds a device implicit account that may request guarantees for this member.
    pub fn add_delegate(&mut self, pool_id: PoolId, delegate: AccountId) {
        let _ = (pool_id, delegate);
        todo!("A-2.7")
    }

    pub fn remove_delegate(&mut self, pool_id: PoolId, delegate: AccountId) {
        let _ = (pool_id, delegate);
        todo!("A-2.7")
    }

    /// Allowed after `exit_lock_months` (E18).
    pub fn request_exit(&mut self, pool_id: PoolId) {
        let _ = pool_id;
        todo!("A-4.6")
    }

    /// Anyone, after `exit_notice` (E19). Refund = contributed − outstanding, subject to exposure cap.
    pub fn execute_exit(&mut self, pool_id: PoolId, member: AccountId) {
        let _ = (pool_id, member);
        todo!("A-4.6")
    }
}

impl Contract {
    pub(crate) fn internal_contribute(&mut self, pool_id: PoolId, member: AccountId, amount: U128) -> U128 {
        let _ = (pool_id, member, amount);
        todo!("A-2.8: returns unused amount")
    }

    pub(crate) fn internal_repay(&mut self, pool_id: PoolId, member: AccountId, amount: U128) -> U128 {
        let _ = (pool_id, member, amount);
        todo!("A-4.3: reduces outstanding; refunds any excess")
    }

    pub(crate) fn internal_topup(&mut self, pool_id: PoolId, from: AccountId, amount: U128) -> U128 {
        let _ = (pool_id, from, amount);
        todo!("A-2.8: donation to pool balance")
    }
}
