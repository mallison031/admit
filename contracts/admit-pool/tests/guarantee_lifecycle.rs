//! Integration tests — see ROADMAP A-5.3. Names state the rule they check.
mod common;

use near_workspaces::types::NearToken;
use serde_json::json;

#[tokio::test]
async fn issue_accept_claim_settle_happy_path() {
    let env = common::setup().await;
    let dao = env.user("dao").await;
    let alice = env.user("alice").await;
    let council = env.user("council").await;
    let hospital = env.user("hospital").await;

    let pool_id = env.create_pool(&dao, common::Env::default_params()).await;
    env.set_council(&dao, pool_id, &[&council]).await;
    env.add_hospital(&dao, pool_id, &hospital, "General Hospital")
        .await;
    env.topup(&dao, pool_id, 1_000 * common::TUSDC).await;

    env.join(&alice, pool_id).await;
    env.contribute(&alice, pool_id, 10 * common::TUSDC).await;

    // 1. Issue guarantee
    let code_hash = [0u8; 32];
    let r = alice
        .call(env.pool.id(), "request_guarantee")
        .args_json(json!({
            "pool_id": pool_id,
            "member": alice.id(),
            "hospital": hospital.id(),
            "amount": (50 * common::TUSDC).to_string(),
            "code_hash": code_hash,
            "patient_initials": "JD",
            "local": null,
        }))
        .transact()
        .await
        .expect("request_guarantee");
    assert!(r.is_success());
    let guarantee_id: u64 = r.json().expect("guarantee_id");

    // 2. Hospital accepts
    let r = hospital
        .call(env.pool.id(), "hospital_accept")
        .args_json(json!({ "guarantee_id": guarantee_id }))
        .transact()
        .await
        .expect("hospital_accept");
    assert!(r.is_success());

    let g: serde_json::Value = env
        .pool
        .view("get_guarantee")
        .args_json(json!({ "guarantee_id": guarantee_id }))
        .await
        .expect("get_guarantee")
        .json()
        .expect("json");
    assert_eq!(g["status"], "Accepted");

    // 3. Hospital claims 40 tUSDC
    let r = hospital
        .call(env.pool.id(), "hospital_claim")
        .args_json(json!({
            "guarantee_id": guarantee_id,
            "amount": (40 * common::TUSDC).to_string(),
            "file_hash": vec![1u8; 32],
        }))
        .transact()
        .await
        .expect("hospital_claim");
    assert!(r.is_success());

    let g: serde_json::Value = env
        .pool
        .view("get_guarantee")
        .args_json(json!({ "guarantee_id": guarantee_id }))
        .await
        .expect("get_guarantee")
        .json()
        .expect("json");
    assert_eq!(g["status"], "Claimed");

    // 4. Council settles early with no adjustment
    let r = council
        .call(env.pool.id(), "settle")
        .args_json(json!({
            "guarantee_id": guarantee_id,
            "adjustment": null,
            "adjustment_reason": null,
        }))
        .max_gas()
        .transact()
        .await
        .expect("settle");
    assert!(r.is_success());

    let g: serde_json::Value = env
        .pool
        .view("get_guarantee")
        .args_json(json!({ "guarantee_id": guarantee_id }))
        .await
        .expect("get_guarantee")
        .json()
        .expect("json");
    assert_eq!(g["status"], "Settled");

    // Hospital received 40 tUSDC
    assert_eq!(env.balance(&hospital).await, 40 * common::TUSDC);
}

#[tokio::test]
async fn issued_guarantee_expires_after_ttl() {
    let env = common::setup().await;
    let dao = env.user("dao").await;
    let alice = env.user("alice").await;
    let hospital = env.user("hospital").await;

    let mut params = common::Env::default_params();
    params["guarantee_ttl"] = json!("1"); // 1 ns TTL

    let pool_id = env.create_pool(&dao, params).await;
    env.add_hospital(&dao, pool_id, &hospital, "General Hospital")
        .await;
    env.topup(&dao, pool_id, 1_000 * common::TUSDC).await;

    env.join(&alice, pool_id).await;
    env.contribute(&alice, pool_id, 10 * common::TUSDC).await;

    let code_hash = [0u8; 32];
    let r = alice
        .call(env.pool.id(), "request_guarantee")
        .args_json(json!({
            "pool_id": pool_id,
            "member": alice.id(),
            "hospital": hospital.id(),
            "amount": (50 * common::TUSDC).to_string(),
            "code_hash": code_hash,
            "patient_initials": "JD",
            "local": null,
        }))
        .transact()
        .await
        .expect("request_guarantee");
    assert!(r.is_success());
    let guarantee_id: u64 = r.json().expect("guarantee_id");

    // Advance 1 block with dummy tx
    let dummy = env.user("dummy").await;
    let _ = dummy
        .transfer_near(alice.id(), NearToken::from_yoctonear(1))
        .await;

    // Call expire
    let r = alice
        .call(env.pool.id(), "expire")
        .args_json(json!({ "guarantee_id": guarantee_id }))
        .transact()
        .await
        .expect("expire");
    assert!(r.is_success());

    let g: serde_json::Value = env
        .pool
        .view("get_guarantee")
        .args_json(json!({ "guarantee_id": guarantee_id }))
        .await
        .expect("get_guarantee")
        .json()
        .expect("json");
    assert_eq!(g["status"], "Expired");
}

#[tokio::test]
async fn accepted_guarantee_never_expires() {
    let env = common::setup().await;
    let dao = env.user("dao").await;
    let alice = env.user("alice").await;
    let hospital = env.user("hospital").await;

    let mut params = common::Env::default_params();
    params["guarantee_ttl"] = json!("1"); // 1 ns TTL

    let pool_id = env.create_pool(&dao, params).await;
    env.add_hospital(&dao, pool_id, &hospital, "General Hospital")
        .await;
    env.topup(&dao, pool_id, 1_000 * common::TUSDC).await;

    env.join(&alice, pool_id).await;
    env.contribute(&alice, pool_id, 10 * common::TUSDC).await;

    let code_hash = [0u8; 32];
    let r = alice
        .call(env.pool.id(), "request_guarantee")
        .args_json(json!({
            "pool_id": pool_id,
            "member": alice.id(),
            "hospital": hospital.id(),
            "amount": (50 * common::TUSDC).to_string(),
            "code_hash": code_hash,
            "patient_initials": "JD",
            "local": null,
        }))
        .transact()
        .await
        .expect("request_guarantee");
    assert!(r.is_success());
    let guarantee_id: u64 = r.json().expect("guarantee_id");

    // Hospital accepts immediately
    let r = hospital
        .call(env.pool.id(), "hospital_accept")
        .args_json(json!({ "guarantee_id": guarantee_id }))
        .transact()
        .await
        .expect("hospital_accept");
    assert!(r.is_success());

    // Call expire should now fail because it is Accepted
    let r = alice
        .call(env.pool.id(), "expire")
        .args_json(json!({ "guarantee_id": guarantee_id }))
        .transact()
        .await
        .expect("expire");
    assert!(r.is_failure());
    let err = format!("{:?}", r.failures());
    assert!(
        err.contains("E14_INVALID_STATUS"),
        "Expected E14_INVALID_STATUS, got: {}",
        err
    );
}

#[tokio::test]
async fn release_frees_reservation() {
    let env = common::setup().await;
    let dao = env.user("dao").await;
    let alice = env.user("alice").await;
    let hospital = env.user("hospital").await;

    let pool_id = env.create_pool(&dao, common::Env::default_params()).await;
    env.add_hospital(&dao, pool_id, &hospital, "General Hospital")
        .await;
    env.topup(&dao, pool_id, 1_000 * common::TUSDC).await;

    env.join(&alice, pool_id).await;
    env.contribute(&alice, pool_id, 10 * common::TUSDC).await;

    let code_hash = [0u8; 32];
    let r = alice
        .call(env.pool.id(), "request_guarantee")
        .args_json(json!({
            "pool_id": pool_id,
            "member": alice.id(),
            "hospital": hospital.id(),
            "amount": (50 * common::TUSDC).to_string(),
            "code_hash": code_hash,
            "patient_initials": "JD",
            "local": null,
        }))
        .transact()
        .await
        .expect("request_guarantee");
    assert!(r.is_success());
    let guarantee_id: u64 = r.json().expect("guarantee_id");

    // Check reserved
    let p: serde_json::Value = env
        .pool
        .view("get_pool")
        .args_json(json!({ "pool_id": pool_id }))
        .await
        .expect("get_pool")
        .json()
        .expect("json");
    assert_eq!(p["reserved"], (50 * common::TUSDC).to_string());

    // Hospital releases
    let r = hospital
        .call(env.pool.id(), "hospital_release")
        .args_json(json!({ "guarantee_id": guarantee_id }))
        .transact()
        .await
        .expect("hospital_release");
    assert!(r.is_success());

    // Reservation freed
    let p: serde_json::Value = env
        .pool
        .view("get_pool")
        .args_json(json!({ "pool_id": pool_id }))
        .await
        .expect("get_pool")
        .json()
        .expect("json");
    assert_eq!(p["reserved"], "0");
}

#[tokio::test]
async fn transfer_splits_claim_and_creates_new_guarantee() {
    let env = common::setup().await;
    let dao = env.user("dao").await;
    let alice = env.user("alice").await;
    let hospital1 = env.user("hospital1").await;
    let hospital2 = env.user("hospital2").await;

    let pool_id = env.create_pool(&dao, common::Env::default_params()).await;
    env.add_hospital(&dao, pool_id, &hospital1, "General Hospital")
        .await;
    env.add_hospital(&dao, pool_id, &hospital2, "City Clinic")
        .await;
    env.topup(&dao, pool_id, 1_000 * common::TUSDC).await;

    env.join(&alice, pool_id).await;
    env.contribute(&alice, pool_id, 10 * common::TUSDC).await;

    let code_hash = [7u8; 32];
    let r = alice
        .call(env.pool.id(), "request_guarantee")
        .args_json(json!({
            "pool_id": pool_id,
            "member": alice.id(),
            "hospital": hospital1.id(),
            "amount": (50 * common::TUSDC).to_string(),
            "code_hash": code_hash,
            "patient_initials": "JD",
            "local": null,
        }))
        .transact()
        .await
        .expect("request_guarantee");
    assert!(r.is_success());
    let guarantee_id: u64 = r.json().expect("guarantee_id");

    // Hospital 1 accepts
    let r = hospital1
        .call(env.pool.id(), "hospital_accept")
        .args_json(json!({ "guarantee_id": guarantee_id }))
        .transact()
        .await
        .expect("hospital_accept");
    assert!(r.is_success());

    // Hospital 1 transfers with partial claim 20 tUSDC to Hospital 2
    let r = hospital1
        .call(env.pool.id(), "hospital_transfer")
        .args_json(json!({
            "guarantee_id": guarantee_id,
            "to_hospital": hospital2.id(),
            "partial_amount": (20 * common::TUSDC).to_string(),
        }))
        .transact()
        .await
        .expect("hospital_transfer");
    assert!(r.is_success());

    let new_id: u64 = r.json().expect("new guarantee id");
    assert_ne!(new_id, guarantee_id);

    // Old guarantee is Claimed for 20 tUSDC
    let g1: serde_json::Value = env
        .pool
        .view("get_guarantee")
        .args_json(json!({ "guarantee_id": guarantee_id }))
        .await
        .expect("get_guarantee")
        .json()
        .expect("json");
    assert_eq!(g1["status"], "Claimed");
    assert_eq!(g1["amount"], (20 * common::TUSDC).to_string());

    // New guarantee is Issued for 30 tUSDC at Hospital 2 with same code_hash
    let g2: serde_json::Value = env
        .pool
        .view("get_guarantee")
        .args_json(json!({ "guarantee_id": new_id }))
        .await
        .expect("get_guarantee")
        .json()
        .expect("json");
    assert_eq!(g2["status"], "Accepted");
    assert_eq!(g2["amount"], (30 * common::TUSDC).to_string());
    assert_eq!(g2["hospital"], hospital2.id().to_string());
    assert_eq!(g2["code_hash"], g1["code_hash"]);
}

#[tokio::test]
async fn claim_above_guarantee_fails() {
    let env = common::setup().await;
    let dao = env.user("dao").await;
    let alice = env.user("alice").await;
    let hospital = env.user("hospital").await;

    let pool_id = env.create_pool(&dao, common::Env::default_params()).await;
    env.add_hospital(&dao, pool_id, &hospital, "General Hospital")
        .await;
    env.topup(&dao, pool_id, 1_000 * common::TUSDC).await;

    env.join(&alice, pool_id).await;
    env.contribute(&alice, pool_id, 10 * common::TUSDC).await;

    let code_hash = [0u8; 32];
    let r = alice
        .call(env.pool.id(), "request_guarantee")
        .args_json(json!({
            "pool_id": pool_id,
            "member": alice.id(),
            "hospital": hospital.id(),
            "amount": (50 * common::TUSDC).to_string(),
            "code_hash": code_hash,
            "patient_initials": "JD",
            "local": null,
        }))
        .transact()
        .await
        .expect("request_guarantee");
    assert!(r.is_success());
    let guarantee_id: u64 = r.json().expect("guarantee_id");

    let _ = hospital
        .call(env.pool.id(), "hospital_accept")
        .args_json(json!({ "guarantee_id": guarantee_id }))
        .transact()
        .await;

    // Claim 60 tUSDC on a 50 tUSDC guarantee fails
    let r = hospital
        .call(env.pool.id(), "hospital_claim")
        .args_json(json!({
            "guarantee_id": guarantee_id,
            "amount": (60 * common::TUSDC).to_string(),
            "file_hash": vec![1u8; 32],
        }))
        .transact()
        .await
        .expect("hospital_claim");
    assert!(r.is_failure());
    let err = format!("{:?}", r.failures());
    assert!(
        err.contains("E15_CLAIM_EXCEEDS_GUARANTEE"),
        "Expected E15_CLAIM_EXCEEDS_GUARANTEE, got: {}",
        err
    );
}
