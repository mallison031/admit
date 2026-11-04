//! Sandbox harness (A-1.6): a near-workspaces sandbox with admit-pool deployed and initialised.
//! Build the wasm first: `pnpm build:contract`.
#![allow(dead_code)]

use near_workspaces::network::Sandbox;
use near_workspaces::{Contract, Worker};
use serde_json::json;

pub const POOL_WASM: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/../../target/near/admit_pool/admit_pool.wasm");

pub struct Env {
    pub worker: Worker<Sandbox>,
    pub pool: Contract,
}

/// Starts a sandbox, deploys admit-pool and calls `new({ai_reviewer: null})`.
pub async fn setup() -> Env {
    let worker = near_workspaces::sandbox().await.expect("start sandbox");
    let wasm = std::fs::read(POOL_WASM).expect("admit_pool.wasm missing: run `pnpm build:contract` first");
    let pool = worker.dev_deploy(&wasm).await.expect("deploy admit-pool");
    let outcome = pool
        .call("new")
        .args_json(json!({ "ai_reviewer": null }))
        .transact()
        .await
        .expect("call new");
    assert!(outcome.is_success(), "new() failed: {:?}", outcome.failures());
    Env { worker, pool }
}
