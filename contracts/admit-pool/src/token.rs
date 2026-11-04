//! NEP-141 / NEP-145 promises and #[private] callbacks that restore state on failure. (A-2.10)
//! Rule: update state BEFORE the promise; the callback undoes it if the transfer failed.

use near_sdk::json_types::U128;
use near_sdk::{ext_contract, near, AccountId, Gas, NearToken, Promise, PromiseError};

use crate::types::{GStatus, GuaranteeId, Member, PoolId};
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

// Used by settle and exits (A-2.10, A-4.2, A-4.6).
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
        if result.is_err() {
            if let Some(mut guarantee) = self.guarantees.get(&guarantee_id).cloned() {
                if let Some(mut pool) = self.pools.get(&guarantee.pool_id).cloned() {
                    pool.balance.0 = pool.balance.0.saturating_add(amount.0);
                    pool.reserved.0 = pool.reserved.0.saturating_add(guarantee.amount.0);

                    let member_key = (guarantee.pool_id, guarantee.member.clone());
                    if let Some(mut member) = self.members.get(&member_key).cloned() {
                        let debt_added = amount
                            .0
                            .saturating_mul(10_000 - pool.params.pool_covered_bps as u128)
                            / 10_000;
                        member.outstanding.0 = member.outstanding.0.saturating_sub(debt_added);
                        member.active_guarantees = member.active_guarantees.saturating_add(1);
                        self.members.insert(member_key, member);
                    }

                    let was_disputed = guarantee
                        .claim
                        .as_ref()
                        .map(|c| c.dispute.is_some())
                        .unwrap_or(false);
                    guarantee.status = if was_disputed {
                        GStatus::Disputed
                    } else {
                        GStatus::Claimed
                    };
                    if let Some(claim) = guarantee.claim.as_mut() {
                        claim.paid = U128(0);
                    }

                    self.guarantees.insert(guarantee_id, guarantee);
                    self.pools.insert(pool.id, pool);
                }
            }
        }
    }

    #[private]
    pub fn on_exit_refunded(
        &mut self,
        #[callback_result] result: Result<(), PromiseError>,
        pool_id: PoolId,
        member: Member,
        amount: U128,
    ) {
        if result.is_err() {
            if let Some(mut pool) = self.pools.get(&pool_id).cloned() {
                pool.balance.0 = pool.balance.0.saturating_add(amount.0);
                self.pools.insert(pool_id, pool);
            }
            let key = (pool_id, member.account.clone());
            self.members.insert(key, member);
        }
    }

    #[private]
    pub fn on_storage_registered(
        &mut self,
        #[callback_result] result: Result<near_sdk::serde_json::Value, PromiseError>,
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
