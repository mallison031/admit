//! tUSDC mock token for testnet and sandbox only. NEVER deploy to mainnet.
//! NEP-141 (fungible token) + NEP-145 (storage management) via near-contract-standards,
//! plus an open `mint` so tests and demos can fund accounts.

use near_contract_standards::fungible_token::events::FtMint;
use near_contract_standards::fungible_token::metadata::{
    FungibleTokenMetadata, FungibleTokenMetadataProvider, FT_METADATA_SPEC,
};
use near_contract_standards::fungible_token::{
    FungibleToken, FungibleTokenCore, FungibleTokenResolver,
};
use near_contract_standards::storage_management::{
    StorageBalance, StorageBalanceBounds, StorageManagement,
};
use near_sdk::collections::LazyOption;
use near_sdk::json_types::U128;
use near_sdk::{near, AccountId, BorshStorageKey, NearToken, PanicOnDefault, PromiseOrValue};

pub const DECIMALS: u8 = 6;

#[near(serializers = [borsh])]
#[derive(BorshStorageKey)]
enum StorageKey {
    FungibleToken,
    Metadata,
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct MockFt {
    token: FungibleToken,
    metadata: LazyOption<FungibleTokenMetadata>,
}

#[near]
impl MockFt {
    #[init]
    pub fn new() -> Self {
        let metadata = FungibleTokenMetadata {
            spec: FT_METADATA_SPEC.to_string(),
            name: "Test USDC (mock)".to_string(),
            symbol: "tUSDC".to_string(),
            icon: None,
            reference: None,
            reference_hash: None,
            decimals: DECIMALS,
        };
        Self {
            token: FungibleToken::new(StorageKey::FungibleToken),
            metadata: LazyOption::new(StorageKey::Metadata, Some(&metadata)),
        }
    }

    /// Open mint — testnet/sandbox only. Registers the account (contract pays storage) if needed.
    pub fn mint(&mut self, account_id: AccountId, amount: U128) {
        if !self.token.accounts.contains_key(&account_id) {
            self.token.internal_register_account(&account_id);
        }
        self.token.internal_deposit(&account_id, amount.0);
        FtMint {
            owner_id: &account_id,
            amount,
            memo: Some("mint"),
        }
        .emit();
    }
}

#[near]
impl FungibleTokenCore for MockFt {
    #[payable]
    fn ft_transfer(&mut self, receiver_id: AccountId, amount: U128, memo: Option<String>) {
        self.token.ft_transfer(receiver_id, amount, memo)
    }

    #[payable]
    fn ft_transfer_call(
        &mut self,
        receiver_id: AccountId,
        amount: U128,
        memo: Option<String>,
        msg: String,
    ) -> PromiseOrValue<U128> {
        self.token.ft_transfer_call(receiver_id, amount, memo, msg)
    }

    fn ft_total_supply(&self) -> U128 {
        self.token.ft_total_supply()
    }

    fn ft_balance_of(&self, account_id: AccountId) -> U128 {
        self.token.ft_balance_of(account_id)
    }
}

#[near]
impl FungibleTokenResolver for MockFt {
    #[private]
    fn ft_resolve_transfer(
        &mut self,
        sender_id: AccountId,
        receiver_id: AccountId,
        amount: U128,
    ) -> U128 {
        let (used, _burned) =
            self.token
                .internal_ft_resolve_transfer(&sender_id, receiver_id, amount);
        used.into()
    }
}

#[near]
impl StorageManagement for MockFt {
    #[payable]
    fn storage_deposit(
        &mut self,
        account_id: Option<AccountId>,
        registration_only: Option<bool>,
    ) -> StorageBalance {
        self.token.storage_deposit(account_id, registration_only)
    }

    #[payable]
    fn storage_withdraw(&mut self, amount: Option<NearToken>) -> StorageBalance {
        self.token.storage_withdraw(amount)
    }

    #[payable]
    fn storage_unregister(&mut self, force: Option<bool>) -> bool {
        self.token.internal_storage_unregister(force).is_some()
    }

    fn storage_balance_bounds(&self) -> StorageBalanceBounds {
        self.token.storage_balance_bounds()
    }

    fn storage_balance_of(&self, account_id: AccountId) -> Option<StorageBalance> {
        self.token.storage_balance_of(account_id)
    }
}

#[near]
impl FungibleTokenMetadataProvider for MockFt {
    fn ft_metadata(&self) -> FungibleTokenMetadata {
        self.metadata.get().expect("metadata is set in new()")
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::{accounts, VMContextBuilder};
    use near_sdk::testing_env;

    fn ctx(predecessor: AccountId, deposit: NearToken) {
        testing_env!(VMContextBuilder::new()
            .predecessor_account_id(predecessor)
            .attached_deposit(deposit)
            .build());
    }

    #[test]
    fn metadata_is_tusdc_with_6_decimals() {
        ctx(accounts(0), NearToken::from_yoctonear(0));
        let c = MockFt::new();
        let m = c.ft_metadata();
        assert_eq!((m.symbol.as_str(), m.decimals), ("tUSDC", 6));
    }

    #[test]
    fn mint_increases_balance() {
        ctx(accounts(0), NearToken::from_yoctonear(0));
        let mut c = MockFt::new();
        c.mint(accounts(1), U128(1_000_000));
        c.mint(accounts(1), U128(500_000));
        assert_eq!(c.ft_balance_of(accounts(1)).0, 1_500_000);
        assert_eq!(c.ft_total_supply().0, 1_500_000);
    }

    #[test]
    fn transfer_moves_balance() {
        ctx(accounts(0), NearToken::from_yoctonear(0));
        let mut c = MockFt::new();
        c.mint(accounts(1), U128(1_000_000));
        c.mint(accounts(2), U128(0));
        ctx(accounts(1), NearToken::from_yoctonear(1));
        c.ft_transfer(accounts(2), U128(400_000), None);
        assert_eq!(c.ft_balance_of(accounts(1)).0, 600_000);
        assert_eq!(c.ft_balance_of(accounts(2)).0, 400_000);
    }
}
