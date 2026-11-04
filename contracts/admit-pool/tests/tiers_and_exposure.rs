//! Integration tests — see ROADMAP A-5.1. Names state the rule they check.
mod common;

use serde_json::json;

#[tokio::test]
async fn instant_guarantee_issued_within_limit() {
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
            "amount": (30 * common::TUSDC).to_string(),
            "code_hash": code_hash,
            "patient_initials": "JD",
            "local": null,
        }))
        .transact()
        .await
        .expect("request_guarantee");
    assert!(
        r.is_success(),
        "request_guarantee failed: {:?}",
        r.failures()
    );

    let guarantee_id: u64 = r.json().expect("guarantee_id");
    assert_eq!(guarantee_id, 0);

    let g: serde_json::Value = env
        .pool
        .view("get_guarantee")
        .args_json(json!({ "guarantee_id": guarantee_id }))
        .await
        .expect("get_guarantee")
        .json()
        .expect("guarantee json");

    assert_eq!(g["status"], "Issued");
    assert_eq!(g["amount"], (30 * common::TUSDC).to_string());
}

#[tokio::test]
async fn council_tier_requires_one_council_approval() {
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

    // Limit is 50. Council tier multiplier is 3, so council max is 150.
    // Request 100 -> PendingCouncil.
    let code_hash = [0u8; 32];
    let r = alice
        .call(env.pool.id(), "request_guarantee")
        .args_json(json!({
            "pool_id": pool_id,
            "member": alice.id(),
            "hospital": hospital.id(),
            "amount": (100 * common::TUSDC).to_string(),
            "code_hash": code_hash,
            "patient_initials": "JD",
            "local": null,
        }))
        .transact()
        .await
        .expect("request_guarantee");
    assert!(
        r.is_success(),
        "request_guarantee failed: {:?}",
        r.failures()
    );

    let guarantee_id: u64 = r.json().expect("guarantee_id");
    let g: serde_json::Value = env
        .pool
        .view("get_guarantee")
        .args_json(json!({ "guarantee_id": guarantee_id }))
        .await
        .expect("get_guarantee")
        .json()
        .expect("guarantee json");
    assert_eq!(g["status"], "PendingCouncil");

    // Council approves
    let r = council
        .call(env.pool.id(), "council_approve")
        .args_json(json!({ "guarantee_id": guarantee_id }))
        .transact()
        .await
        .expect("council_approve");
    assert!(r.is_success(), "council_approve failed: {:?}", r.failures());

    let g: serde_json::Value = env
        .pool
        .view("get_guarantee")
        .args_json(json!({ "guarantee_id": guarantee_id }))
        .await
        .expect("get_guarantee")
        .json()
        .expect("guarantee json");
    assert_eq!(g["status"], "Issued");
}

#[tokio::test]
async fn request_above_council_tier_is_rejected() {
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

    // Limit is 50. Council max is 150. Request 200 -> E12_OVER_TIER.
    let code_hash = [0u8; 32];
    let r = alice
        .call(env.pool.id(), "request_guarantee")
        .args_json(json!({
            "pool_id": pool_id,
            "member": alice.id(),
            "hospital": hospital.id(),
            "amount": (200 * common::TUSDC).to_string(),
            "code_hash": code_hash,
            "patient_initials": "JD",
            "local": null,
        }))
        .transact()
        .await
        .expect("request_guarantee");
    assert!(r.is_failure());
    let err = format!("{:?}", r.failures());
    assert!(
        err.contains("E12_OVER_TIER"),
        "Expected E12_OVER_TIER, got: {}",
        err
    );
}

#[tokio::test]
async fn exposure_cap_blocks_issue() {
    let env = common::setup().await;
    let dao = env.user("dao").await;
    let alice = env.user("alice").await;
    let hospital = env.user("hospital").await;

    // Pool balance 50 tUSDC, max_exposure_bps = 8000 (80% = 40 tUSDC cap).
    let pool_id = env.create_pool(&dao, common::Env::default_params()).await;
    env.add_hospital(&dao, pool_id, &hospital, "General Hospital")
        .await;
    env.topup(&dao, pool_id, 50 * common::TUSDC).await;

    env.join(&alice, pool_id).await;
    env.contribute(&alice, pool_id, 10 * common::TUSDC).await;

    // Limit is 50, but pool exposure cap is 80% of 60 total = 48 tUSDC.
    // If alice requests 50 tUSDC, 50 > 48 -> E13_EXPOSURE_CAP.
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
    assert!(r.is_failure());
    let err = format!("{:?}", r.failures());
    assert!(
        err.contains("E13_EXPOSURE_CAP"),
        "Expected E13_EXPOSURE_CAP, got: {}",
        err
    );
}

#[tokio::test]
async fn topup_rechecks_tier_and_exposure() {
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

    let code_hash = [0u8; 32];
    let r = alice
        .call(env.pool.id(), "request_guarantee")
        .args_json(json!({
            "pool_id": pool_id,
            "member": alice.id(),
            "hospital": hospital.id(),
            "amount": (30 * common::TUSDC).to_string(),
            "code_hash": code_hash,
            "patient_initials": "JD",
            "local": null,
        }))
        .transact()
        .await
        .expect("request_guarantee");
    assert!(r.is_success());
    let guarantee_id: u64 = r.json().expect("guarantee_id");

    // Top up beyond council multiplier (limit 50, council max 150. New total 30 + 150 = 180 > 150) -> E12_OVER_TIER
    let r = alice
        .call(env.pool.id(), "request_topup")
        .args_json(json!({
            "guarantee_id": guarantee_id,
            "extra": (150 * common::TUSDC).to_string(),
        }))
        .transact()
        .await
        .expect("request_topup");
    assert!(r.is_failure());
    let err = format!("{:?}", r.failures());
    assert!(
        err.contains("E12_OVER_TIER"),
        "Expected E12_OVER_TIER, got: {}",
        err
    );

    // Valid top-up increases amount and pool reservation
    let r = alice
        .call(env.pool.id(), "request_topup")
        .args_json(json!({
            "guarantee_id": guarantee_id,
            "extra": (10 * common::TUSDC).to_string(),
        }))
        .transact()
        .await
        .expect("request_topup");
    assert!(r.is_success());

    let g: serde_json::Value = env
        .pool
        .view("get_guarantee")
        .args_json(json!({ "guarantee_id": guarantee_id }))
        .await
        .expect("get_guarantee")
        .json()
        .expect("guarantee json");
    assert_eq!(g["amount"], (40 * common::TUSDC).to_string());

    let p: serde_json::Value = env
        .pool
        .view("get_pool")
        .args_json(json!({ "pool_id": pool_id }))
        .await
        .expect("get_pool")
        .json()
        .expect("pool json");
    assert_eq!(p["reserved"], (40 * common::TUSDC).to_string());
}
