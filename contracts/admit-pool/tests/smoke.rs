//! Smoke tests for the sandbox harness (A-1.6).
mod common;

use near_workspaces::ContractState;

#[tokio::test]
async fn contract_initialises() {
    let env = common::setup().await;
    let account = env
        .worker
        .view_account(env.pool.id())
        .await
        .expect("view account");
    assert!(
        matches!(account.contract_state, ContractState::LocalHash(_)),
        "admit-pool code not deployed: {:?}",
        account.contract_state
    );
}

#[tokio::test]
async fn token_deploys_and_mints() {
    let env = common::setup().await;
    let alice = env.user("alice").await;
    env.register_storage(&alice).await;
    env.mint(&alice, 250 * common::TUSDC).await;
    assert_eq!(env.balance(&alice).await, 250 * common::TUSDC);
}
