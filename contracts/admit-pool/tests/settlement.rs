//! Integration tests — see ROADMAP A-5.4. Names state the rule they check.
mod common;

use serde_json::json;

#[tokio::test]
async fn settle_before_dispute_window_closes_fails() {
    let env = common::setup().await;
    let dao = env.user("dao").await;
    let alice = env.user("alice").await;
    let hospital = env.user("hospital").await;

    let params = common::Env::default_params();
    let pool_id = env.create_pool(&dao, params).await;

    env.add_hospital(&dao, pool_id, &hospital, "City Hospital")
        .await;
    env.join(&alice, pool_id).await;
    env.contribute(&alice, pool_id, 50 * common::TUSDC).await;
    env.topup(&dao, pool_id, 1_000 * common::TUSDC).await;

    // Alice requests guarantee
    let r = alice
        .call(env.pool.id(), "request_guarantee")
        .args_json(json!({
            "pool_id": pool_id,
            "member": alice.id(),
            "patient_initials": "AB",
            "code_hash": vec![1u8; 32],
            "hospital": hospital.id(),
            "amount": (50 * common::TUSDC).to_string(),
        }))
        .transact()
        .await
        .expect("request_guarantee");
    assert!(r.is_success());
    let guarantee_id: u64 = r.json().expect("guarantee_id");

    // Hospital accepts
    let r = hospital
        .call(env.pool.id(), "hospital_accept")
        .args_json(json!({ "guarantee_id": guarantee_id }))
        .transact()
        .await
        .expect("hospital_accept");
    assert!(r.is_success());

    // Hospital claims
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

    // Alice (non-council) tries to settle immediately while dispute window is open
    let r = alice
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
    assert!(r.is_failure());
    let err = format!("{:?}", r.failures());
    assert!(
        err.contains("E16_DISPUTE_WINDOW_OPEN"),
        "unexpected error: {err}"
    );
}

#[tokio::test]
async fn dispute_within_window_blocks_auto_settle() {
    let env = common::setup().await;
    let dao = env.user("dao").await;
    let alice = env.user("alice").await;
    let hospital = env.user("hospital").await;
    let bob = env.user("bob").await;

    let params = common::Env::default_params();
    let pool_id = env.create_pool(&dao, params).await;

    env.add_hospital(&dao, pool_id, &hospital, "City Hospital")
        .await;
    env.join(&alice, pool_id).await;
    env.contribute(&alice, pool_id, 50 * common::TUSDC).await;
    env.topup(&dao, pool_id, 1_000 * common::TUSDC).await;

    let r = alice
        .call(env.pool.id(), "request_guarantee")
        .args_json(json!({
            "pool_id": pool_id,
            "member": alice.id(),
            "patient_initials": "AB",
            "code_hash": vec![1u8; 32],
            "hospital": hospital.id(),
            "amount": (50 * common::TUSDC).to_string(),
        }))
        .transact()
        .await
        .expect("request_guarantee");
    assert!(r.is_success());
    let guarantee_id: u64 = r.json().expect("guarantee_id");

    let r = hospital
        .call(env.pool.id(), "hospital_accept")
        .args_json(json!({ "guarantee_id": guarantee_id }))
        .transact()
        .await
        .expect("hospital_accept");
    assert!(r.is_success());

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

    // Alice files a dispute within the window
    let r = alice
        .call(env.pool.id(), "member_dispute")
        .args_json(json!({
            "guarantee_id": guarantee_id,
            "reason": "Overbilled for standard checkup",
        }))
        .transact()
        .await
        .expect("member_dispute");
    assert!(r.is_success());

    let g: serde_json::Value = env
        .pool
        .view("get_guarantee")
        .args_json(json!({ "guarantee_id": guarantee_id }))
        .await
        .expect("get_guarantee")
        .json()
        .expect("json");
    assert_eq!(g["status"], "Disputed");

    // Bob (non-council) tries to auto-settle the disputed guarantee
    let r = bob
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
    assert!(r.is_failure());
    let err = format!("{:?}", r.failures());
    assert!(
        err.contains("E14_INVALID_STATUS"),
        "unexpected error: {err}"
    );
}

#[tokio::test]
async fn council_adjustment_pays_reduced_amount() {
    let env = common::setup().await;
    let dao = env.user("dao").await;
    let council = env.user("council").await;
    let alice = env.user("alice").await;
    let hospital = env.user("hospital").await;

    let params = common::Env::default_params();
    let pool_id = env.create_pool(&dao, params).await;
    env.set_council(&dao, pool_id, &[&council]).await;
    env.add_hospital(&dao, pool_id, &hospital, "City Hospital")
        .await;
    env.join(&alice, pool_id).await;
    env.contribute(&alice, pool_id, 50 * common::TUSDC).await;
    env.topup(&dao, pool_id, 1_000 * common::TUSDC).await;

    let r = alice
        .call(env.pool.id(), "request_guarantee")
        .args_json(json!({
            "pool_id": pool_id,
            "member": alice.id(),
            "patient_initials": "AB",
            "code_hash": vec![1u8; 32],
            "hospital": hospital.id(),
            "amount": (50 * common::TUSDC).to_string(),
        }))
        .transact()
        .await
        .expect("request_guarantee");
    assert!(r.is_success());
    let guarantee_id: u64 = r.json().expect("guarantee_id");

    let r = hospital
        .call(env.pool.id(), "hospital_accept")
        .args_json(json!({ "guarantee_id": guarantee_id }))
        .transact()
        .await
        .expect("hospital_accept");
    assert!(r.is_success());

    // Claim 50 tUSDC
    let r = hospital
        .call(env.pool.id(), "hospital_claim")
        .args_json(json!({
            "guarantee_id": guarantee_id,
            "amount": (50 * common::TUSDC).to_string(),
            "file_hash": vec![1u8; 32],
        }))
        .transact()
        .await
        .expect("hospital_claim");
    assert!(r.is_success());

    // Council settles with 10 tUSDC adjustment (pays 40 tUSDC)
    let r = council
        .call(env.pool.id(), "settle")
        .args_json(json!({
            "guarantee_id": guarantee_id,
            "adjustment": (10 * common::TUSDC).to_string(),
            "adjustment_reason": "Duplicate procedure fee removed",
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
    assert_eq!(g["claim"]["adjustment"], (10 * common::TUSDC).to_string());
    assert_eq!(g["claim"]["paid"], (40 * common::TUSDC).to_string());

    // Hospital received exactly 40 tUSDC
    assert_eq!(env.balance(&hospital).await, 40 * common::TUSDC);
}

#[tokio::test]
async fn settlement_adds_member_debt() {
    let env = common::setup().await;
    let dao = env.user("dao").await;
    let council = env.user("council").await;
    let alice = env.user("alice").await;
    let hospital = env.user("hospital").await;

    let params = common::Env::default_params();
    let pool_id = env.create_pool(&dao, params).await;
    env.set_council(&dao, pool_id, &[&council]).await;
    env.add_hospital(&dao, pool_id, &hospital, "City Hospital")
        .await;
    env.join(&alice, pool_id).await;
    env.contribute(&alice, pool_id, 50 * common::TUSDC).await;
    env.topup(&dao, pool_id, 1_000 * common::TUSDC).await;

    let m: serde_json::Value = env
        .pool
        .view("get_member")
        .args_json(json!({ "pool_id": pool_id, "account": alice.id() }))
        .await
        .expect("get_member")
        .json()
        .expect("json");
    assert_eq!(m["outstanding"], "0");

    let r = alice
        .call(env.pool.id(), "request_guarantee")
        .args_json(json!({
            "pool_id": pool_id,
            "member": alice.id(),
            "patient_initials": "AB",
            "code_hash": vec![1u8; 32],
            "hospital": hospital.id(),
            "amount": (50 * common::TUSDC).to_string(),
        }))
        .transact()
        .await
        .expect("request_guarantee");
    let guarantee_id: u64 = r.json().expect("guarantee_id");

    let _ = hospital
        .call(env.pool.id(), "hospital_accept")
        .args_json(json!({ "guarantee_id": guarantee_id }))
        .transact()
        .await
        .expect("hospital_accept");

    let _ = hospital
        .call(env.pool.id(), "hospital_claim")
        .args_json(json!({
            "guarantee_id": guarantee_id,
            "amount": (30 * common::TUSDC).to_string(),
            "file_hash": vec![1u8; 32],
        }))
        .transact()
        .await
        .expect("hospital_claim");

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

    let m: serde_json::Value = env
        .pool
        .view("get_member")
        .args_json(json!({ "pool_id": pool_id, "account": alice.id() }))
        .await
        .expect("get_member")
        .json()
        .expect("json");
    assert_eq!(m["outstanding"], (30 * common::TUSDC).to_string());
}

#[tokio::test]
async fn repay_reduces_debt_and_restores_limit() {
    let env = common::setup().await;
    let dao = env.user("dao").await;
    let council = env.user("council").await;
    let alice = env.user("alice").await;
    let hospital = env.user("hospital").await;

    let params = common::Env::default_params();
    let pool_id = env.create_pool(&dao, params).await;
    env.set_council(&dao, pool_id, &[&council]).await;
    env.add_hospital(&dao, pool_id, &hospital, "City Hospital")
        .await;
    env.join(&alice, pool_id).await;
    env.contribute(&alice, pool_id, 50 * common::TUSDC).await;
    env.topup(&dao, pool_id, 1_000 * common::TUSDC).await;

    let r = alice
        .call(env.pool.id(), "request_guarantee")
        .args_json(json!({
            "pool_id": pool_id,
            "member": alice.id(),
            "patient_initials": "AB",
            "code_hash": vec![1u8; 32],
            "hospital": hospital.id(),
            "amount": (50 * common::TUSDC).to_string(),
        }))
        .transact()
        .await
        .expect("request_guarantee");
    let guarantee_id: u64 = r.json().expect("guarantee_id");

    let _ = hospital
        .call(env.pool.id(), "hospital_accept")
        .args_json(json!({ "guarantee_id": guarantee_id }))
        .transact()
        .await
        .expect("hospital_accept");

    let _ = hospital
        .call(env.pool.id(), "hospital_claim")
        .args_json(json!({
            "guarantee_id": guarantee_id,
            "amount": (40 * common::TUSDC).to_string(),
            "file_hash": vec![1u8; 32],
        }))
        .transact()
        .await
        .expect("hospital_claim");

    let _ = council
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

    // Alice now has 40 tUSDC outstanding debt
    let m: serde_json::Value = env
        .pool
        .view("get_member")
        .args_json(json!({ "pool_id": pool_id, "account": alice.id() }))
        .await
        .expect("get_member")
        .json()
        .expect("json");
    assert_eq!(m["outstanding"], (40 * common::TUSDC).to_string());

    let limit_before: serde_json::Value = env
        .pool
        .view("get_limit")
        .args_json(json!({ "pool_id": pool_id, "account": alice.id() }))
        .await
        .expect("get_limit")
        .json()
        .expect("json");
    let limit_before_val: u128 = limit_before["limit"].as_str().unwrap().parse().unwrap();

    // Repay 25 tUSDC
    env.repay(&alice, pool_id, 25 * common::TUSDC).await;

    let m: serde_json::Value = env
        .pool
        .view("get_member")
        .args_json(json!({ "pool_id": pool_id, "account": alice.id() }))
        .await
        .expect("get_member")
        .json()
        .expect("json");
    assert_eq!(m["outstanding"], (15 * common::TUSDC).to_string());

    let limit_after_partial: serde_json::Value = env
        .pool
        .view("get_limit")
        .args_json(json!({ "pool_id": pool_id, "account": alice.id() }))
        .await
        .expect("get_limit")
        .json()
        .expect("json");
    let limit_after_partial_val: u128 = limit_after_partial["limit"]
        .as_str()
        .unwrap()
        .parse()
        .unwrap();
    assert_eq!(
        limit_after_partial_val,
        limit_before_val + 25 * common::TUSDC
    );

    // Repay remaining 15 tUSDC
    env.repay(&alice, pool_id, 15 * common::TUSDC).await;

    let m: serde_json::Value = env
        .pool
        .view("get_member")
        .args_json(json!({ "pool_id": pool_id, "account": alice.id() }))
        .await
        .expect("get_member")
        .json()
        .expect("json");
    assert_eq!(m["outstanding"], "0");

    let limit_after_full: serde_json::Value = env
        .pool
        .view("get_limit")
        .args_json(json!({ "pool_id": pool_id, "account": alice.id() }))
        .await
        .expect("get_limit")
        .json()
        .expect("json");
    let limit_after_full_val: u128 = limit_after_full["limit"].as_str().unwrap().parse().unwrap();
    assert_eq!(
        limit_after_full_val,
        limit_after_partial_val + 15 * common::TUSDC
    );
}

#[tokio::test]
async fn report_death_writes_off_debt() {
    let env = common::setup().await;
    let dao = env.user("dao").await;
    let council = env.user("council").await;
    let alice = env.user("alice").await;
    let hospital = env.user("hospital").await;

    let params = common::Env::default_params();
    let pool_id = env.create_pool(&dao, params).await;
    env.set_council(&dao, pool_id, &[&council]).await;
    env.add_hospital(&dao, pool_id, &hospital, "City Hospital")
        .await;
    env.join(&alice, pool_id).await;
    env.contribute(&alice, pool_id, 50 * common::TUSDC).await;
    env.topup(&dao, pool_id, 1_000 * common::TUSDC).await;

    let r = alice
        .call(env.pool.id(), "request_guarantee")
        .args_json(json!({
            "pool_id": pool_id,
            "member": alice.id(),
            "patient_initials": "AB",
            "code_hash": vec![1u8; 32],
            "hospital": hospital.id(),
            "amount": (50 * common::TUSDC).to_string(),
        }))
        .transact()
        .await
        .expect("request_guarantee");
    let guarantee_id: u64 = r.json().expect("guarantee_id");

    let _ = hospital
        .call(env.pool.id(), "hospital_accept")
        .args_json(json!({ "guarantee_id": guarantee_id }))
        .transact()
        .await
        .expect("hospital_accept");

    let _ = hospital
        .call(env.pool.id(), "hospital_claim")
        .args_json(json!({
            "guarantee_id": guarantee_id,
            "amount": (40 * common::TUSDC).to_string(),
            "file_hash": vec![1u8; 32],
        }))
        .transact()
        .await
        .expect("hospital_claim");

    let _ = council
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

    let m: serde_json::Value = env
        .pool
        .view("get_member")
        .args_json(json!({ "pool_id": pool_id, "account": alice.id() }))
        .await
        .expect("get_member")
        .json()
        .expect("json");
    assert_eq!(m["outstanding"], (40 * common::TUSDC).to_string());

    // Council reports death
    let r = council
        .call(env.pool.id(), "report_death")
        .args_json(json!({ "guarantee_id": guarantee_id }))
        .transact()
        .await
        .expect("report_death");
    assert!(r.is_success());

    // Debt is written off
    let m: serde_json::Value = env
        .pool
        .view("get_member")
        .args_json(json!({ "pool_id": pool_id, "account": alice.id() }))
        .await
        .expect("get_member")
        .json()
        .expect("json");
    assert_eq!(m["outstanding"], "0");
}
