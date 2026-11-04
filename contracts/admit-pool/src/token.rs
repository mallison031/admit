//! NEP-141 / NEP-145 promises and #[private] callbacks that restore state on failure. (A-2.10)
//! Rule: update state BEFORE the promise; the callback undoes it if the transfer failed.

use near_sdk::json_types::U128;
use near_sdk::{near, AccountId, Promise, PromiseError};

use crate::types::{GuaranteeId, PoolId};
use crate::{Contract, ContractExt};

// Used by settle and exits (A-2.10, A-4.2, A-4.6). Remove the allow once wired.
#[allow(dead_code)]
impl Contract {
    pub(crate) fn ft_transfer(
        &self,
        token: AccountId,
        receiver: AccountId,
        amount: U128,
    ) -> Promise {
        let _ = (token, receiver, amount);
        todo!("A-2.10: ft_transfer with 1 yoctoNEAR")
    }

    pub(crate) fn storage_deposit(&self, token: AccountId, account: AccountId) -> Promise {
        let _ = (token, account);
        todo!("A-2.10: storage_deposit(account_id, registration_only: true)")
    }
}

#[near]
impl Contract {
    #[private]
    pub fn on_hospital_paid(
        &mut self,
        #[callback_result] result: Result<(), PromiseError>,
        guarantee_id: GuaranteeId,
        amount: U128,
    ) {
        let _ = (result, guarantee_id, amount);
        todo!("A-2.10: on failure restore status + reservation")
    }

    #[private]
    pub fn on_exit_refunded(
        &mut self,
        #[callback_result] result: Result<(), PromiseError>,
        pool_id: PoolId,
        member: AccountId,
        amount: U128,
    ) {
        let _ = (result, pool_id, member, amount);
        todo!("A-2.10: on failure restore member + balance")
    }

    #[private]
    pub fn on_storage_registered(
        &mut self,
        #[callback_result] result: Result<(), PromiseError>,
        pool_id: PoolId,
        account: AccountId,
    ) {
        let _ = (result, pool_id, account);
        todo!("A-2.10: on failure remove the hospital again")
    }
}
