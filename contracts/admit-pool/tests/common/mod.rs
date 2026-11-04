//! Sandbox harness (A-1.6): a near-workspaces sandbox with admit-pool and the tUSDC mock token
//! deployed and initialised, plus helpers for accounts, minting and token storage.
//! Build the wasm first: `pnpm build:contract`.
#![allow(dead_code)]

use near_workspaces::network::Sandbox;
use near_workspaces::types::NearToken;
use near_workspaces::{Account, Contract, Worker};
use serde_json::json;

pub const POOL_WASM: &str = concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../../target/near/admit_pool/admit_pool.wasm"
);
pub const FT_WASM: &str = concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../../target/near/mock_ft/mock_ft.wasm"
);
pub const SPUTNIK_WASM: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/res/sputnikdao2.wasm");

/// 1 tUSDC in raw units (6 decimals).
pub const TUSDC: u128 = 1_000_000;
pub const NS_PER_SECOND: u64 = 1_000_000_000;
pub const NS_PER_DAY: u64 = 86_400 * NS_PER_SECOND;

pub struct Env {
    pub worker: Worker<Sandbox>,
    pub pool: Contract,
    pub token: Contract,
}

fn read(path: &str) -> Vec<u8> {
    std::fs::read(path)
        .unwrap_or_else(|_| panic!("{path} missing: run `pnpm build:contract` first"))
}

/// Starts a sandbox, deploys admit-pool (`new({ai_reviewer: null})`) and mock-ft (`new()`),
/// and registers the pool with the token so it can receive transfers.
pub async fn setup() -> Env {
    let worker = near_workspaces::sandbox().await.expect("start sandbox");
    let pool = worker
        .dev_deploy(&read(POOL_WASM))
        .await
        .expect("deploy admit-pool");
    let r = pool
        .call("new")
        .args_json(json!({ "ai_reviewer": null }))
        .transact()
        .await
        .expect("pool new");
    assert!(
        r.is_success(),
        "admit-pool new() failed: {:?}",
        r.failures()
    );
    let token = worker
        .dev_deploy(&read(FT_WASM))
        .await
        .expect("deploy mock-ft");
    let r = token.call("new").transact().await.expect("token new");
    assert!(r.is_success(), "mock-ft new() failed: {:?}", r.failures());
    let env = Env {
        worker,
        pool,
        token,
    };
    env.register_storage(env.pool.as_account()).await;
    env
}

impl Env {
    /// Creates a funded sandbox account (10 NEAR) under the root account.
    pub async fn user(&self, name: &str) -> Account {
        self.worker
            .root_account()
            .expect("root account")
            .create_subaccount(name)
            .initial_balance(NearToken::from_near(10))
            .transact()
            .await
            .expect("create subaccount")
            .into_result()
            .expect("subaccount created")
    }

    /// Registers `account` with the token (NEP-145), paying the minimum storage deposit.
    pub async fn register_storage(&self, account: &Account) {
        let r = account
            .call(self.token.id(), "storage_deposit")
            .args_json(json!({ "account_id": account.id(), "registration_only": true }))
            .deposit(NearToken::from_millinear(125))
            .transact()
            .await
            .expect("storage_deposit");
        assert!(r.is_success(), "storage_deposit failed: {:?}", r.failures());
    }

    /// Mints `amount` raw tUSDC to `account` (open mint on the mock token).
    pub async fn mint(&self, account: &Account, amount: u128) {
        let r = self
            .token
            .call("mint")
            .args_json(json!({ "account_id": account.id(), "amount": amount.to_string() }))
            .transact()
            .await
            .expect("mint");
        assert!(r.is_success(), "mint failed: {:?}", r.failures());
    }

    pub async fn balance(&self, account: &Account) -> u128 {
        let v: String = self
            .token
            .view("ft_balance_of")
            .args_json(json!({ "account_id": account.id() }))
            .await
            .expect("ft_balance_of")
            .json()
            .expect("balance json");
        v.parse().expect("u128 balance")
    }

    pub fn default_params() -> serde_json::Value {
        json!({
            "monthly_contribution": (10 * TUSDC).to_string(),
            "min_tenure_months": 0,
            "base_limit": (50 * TUSDC).to_string(),
            "limit_per_month": (25 * TUSDC).to_string(),
            "max_limit": (500 * TUSDC).to_string(),
            "late_limit_bps": 5000,
            "max_exposure_bps": 8000,
            "max_active_per_member": 2,
            "cooldown": "86400000000000",
            "guarantee_ttl": "86400000000000",
            "dispute_window": "172800000000000",
            "pool_covered_bps": 0,
            "cover_on_death": true,
            "council_tier_multiplier": 3,
            "exit_lock_months": 12,
            "exit_notice": "2592000000000000",
            "time_scale": 1
        })
    }

    pub async fn create_pool(&self, dao: &Account, params: serde_json::Value) -> u64 {
        let r = dao
            .call(self.pool.id(), "create_pool")
            .args_json(json!({
                "name": "Health Pool",
                "dao": dao.id(),
                "token": self.token.id(),
                "params": params,
            }))
            .deposit(NearToken::from_millinear(200))
            .transact()
            .await
            .expect("create_pool");
        assert!(r.is_success(), "create_pool failed: {:?}", r.failures());
        r.json().expect("pool_id")
    }

    pub async fn add_hospital(&self, dao: &Account, pool_id: u64, hospital: &Account, name: &str) {
        let pk = "ed25519:6E8sCci9badyRkXb3JoRpAx5bMrqZgqwq86gRVCm16yE";
        let r = dao
            .call(self.pool.id(), "council_add_hospital")
            .args_json(json!({
                "pool_id": pool_id,
                "hospital": {
                    "account": hospital.id(),
                    "name": name,
                    "fc_public_key": pk,
                }
            }))
            .max_gas()
            .transact()
            .await
            .expect("council_add_hospital");
        assert!(
            r.is_success(),
            "council_add_hospital failed: {:?}",
            r.failures()
        );
    }

    pub async fn set_council(&self, dao: &Account, pool_id: u64, council: &[&Account]) {
        let council_ids: Vec<_> = council.iter().map(|c| c.id()).collect();
        let r = dao
            .call(self.pool.id(), "council_set_members")
            .args_json(json!({
                "pool_id": pool_id,
                "council": council_ids,
            }))
            .transact()
            .await
            .expect("council_set_members");
        assert!(
            r.is_success(),
            "council_set_members failed: {:?}",
            r.failures()
        );
    }

    pub async fn join(&self, member: &Account, pool_id: u64) {
        let r = member
            .call(self.pool.id(), "join")
            .args_json(json!({ "pool_id": pool_id }))
            .deposit(NearToken::from_millinear(100))
            .transact()
            .await
            .expect("join");
        assert!(r.is_success(), "join failed: {:?}", r.failures());
    }

    pub async fn contribute(&self, member: &Account, pool_id: u64, amount: u128) {
        self.register_storage(member).await;
        self.mint(member, amount).await;
        let r = member
            .call(self.token.id(), "ft_transfer_call")
            .args_json(json!({
                "receiver_id": self.pool.id(),
                "amount": amount.to_string(),
                "msg": serde_json::to_string(&json!({ "contribute": pool_id })).unwrap(),
            }))
            .deposit(NearToken::from_yoctonear(1))
            .max_gas()
            .transact()
            .await
            .expect("ft_transfer_call contribute");
        assert!(r.is_success(), "contribute failed: {:?}", r.failures());
    }

    pub async fn topup(&self, funder: &Account, pool_id: u64, amount: u128) {
        self.register_storage(funder).await;
        self.mint(funder, amount).await;
        let r = funder
            .call(self.token.id(), "ft_transfer_call")
            .args_json(json!({
                "receiver_id": self.pool.id(),
                "amount": amount.to_string(),
                "msg": serde_json::to_string(&json!({ "topup": pool_id })).unwrap(),
            }))
            .deposit(NearToken::from_yoctonear(1))
            .max_gas()
            .transact()
            .await
            .expect("ft_transfer_call topup");
        assert!(r.is_success(), "topup failed: {:?}", r.failures());
    }

    pub async fn repay(&self, member: &Account, pool_id: u64, amount: u128) {
        self.register_storage(member).await;
        self.mint(member, amount).await;
        let r = member
            .call(self.token.id(), "ft_transfer_call")
            .args_json(json!({
                "receiver_id": self.pool.id(),
                "amount": amount.to_string(),
                "msg": serde_json::to_string(&json!({ "repay": pool_id })).unwrap(),
            }))
            .deposit(NearToken::from_yoctonear(1))
            .max_gas()
            .transact()
            .await
            .expect("ft_transfer_call repay");
        assert!(r.is_success(), "repay failed: {:?}", r.failures());
    }
}
