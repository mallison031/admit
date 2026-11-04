//! NEP-141 / NEP-145 promises and #[private] callbacks that restore state on failure. (A-2.10)
//! Rule: update state BEFORE the promise; the callback undoes it if the transfer failed.

use near_sdk::json_types::U128;
use near_sdk::{ext_contract, near, AccountId, Gas, NearToken, Promise, PromiseError};

use crate::types::{GuaranteeId, PoolId};
use crate::{Contract, ContractExt};

pub const FT_TRANSFER_GAS: Gas = Gas::from_tgas(10);
pub const STORAGE_DEPOSIT_NEAR: NearToken =
    NearToken::from_yoctonear(1_250_000_000_000_000_000_000); // 0.00125 NEAR

#[ext_contract(ext_ft)]
pub trait ExtFt {
    fn ft_transfer(&mut self, receiver_id: AccountId, amount: U128, memo: Option<String>);
}

#[ext_contract(ext_storage)]
pub trait ExtStorage {
    fn storage_deposit(&mut self, account_id: Option<AccountId>, registration_only: Option<bool>);
}

// Used by settle and exits (A-2.10, A-4.2, A-4.6). Remove the allow once wired.
#[allow(dead_code)]
impl Contract {
    pub(crate) fn ft_transfer(
        &self,
        token: AccountId,
        receiver: AccountId,
        amount: U128,
    ) -> Promise {
        ext_ft::ext(token)
            .with_attached_deposit(NearToken::from_yoctonear(1))
            .with_static_gas(FT_TRANSFER_GAS)
            .ft_transfer(receiver, amount, None)
    }

    pub(crate) fn storage_deposit(&self, token: AccountId, account: AccountId) -> Promise {
        ext_storage::ext(token)
            .with_attached_deposit(STORAGE_DEPOSIT_NEAR)
            .storage_deposit(Some(account), Some(true))
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
        if result.is_err() {
            if let Some(pool) = self.pools.get_mut(&pool_id) {
                pool.hospitals.retain(|h| h.account != account);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::VMContextBuilder;
    use near_sdk::testing_env;

    fn setup_context() {
        let context = VMContextBuilder::new()
            .current_account_id("admit.near".parse().unwrap())
            .signer_account_id("alice.near".parse().unwrap())
            .predecessor_account_id("alice.near".parse().unwrap())
            .build();
        testing_env!(context);
    }

    #[test]
    fn ft_transfer_builds_promise() {
        setup_context();
        let contract = Contract::new(None);
        let token: AccountId = "usdc.near".parse().unwrap();
        let receiver: AccountId = "hospital.near".parse().unwrap();
        let amount = U128(1_000_000);

        let _promise = contract.ft_transfer(token, receiver, amount);
    }

    #[test]
    fn storage_deposit_builds_promise() {
        setup_context();
        let contract = Contract::new(None);
        let token: AccountId = "usdc.near".parse().unwrap();
        let account: AccountId = "hospital.near".parse().unwrap();

        let _promise = contract.storage_deposit(token, account);
    }
}
