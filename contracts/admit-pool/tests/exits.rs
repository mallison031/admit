//! Integration tests — see ROADMAP A-5.5. Names state the rule they check.
mod common;

use serde_json::json;

#[tokio::test]
async fn exit_before_lock_is_rejected() {
    let env = common::setup().await;
    let dao = env.user("dao").await;
    let alice = env.user("alice").await;

    let mut params = common::Env::default_params();
    params["exit_lock_months"] = json!(12);
    params["time_scale"] = json!(1);
    let pool_id = env.create_pool(&dao, params).await;

    env.join(&alice, pool_id).await;
    env.contribute(&alice, pool_id, 100 * common::TUSDC).await;

    // Alice requests exit immediately before 12 months tenure
    let r = alice
        .call(env.pool.id(), "request_exit")
        .args_json(json!({ "pool_id": pool_id }))
        .transact()
        .await
        .expect("request_exit");
    assert!(r.is_failure());
    let err = format!("{:?}", r.failures());
    assert!(err.contains("E18_EXIT_LOCKED"), "unexpected error: {err}");
}

#[tokio::test]
async fn exit_before_notice_is_rejected() {
    let env = common::setup().await;
    let dao = env.user("dao").await;
    let alice = env.user("alice").await;

    let mut params = common::Env::default_params();
    params["exit_lock_months"] = json!(0);
    params["exit_notice"] = json!((30 * common::NS_PER_DAY).to_string());
    params["time_scale"] = json!(1);
    let pool_id = env.create_pool(&dao, params).await;

    env.join(&alice, pool_id).await;
    env.contribute(&alice, pool_id, 100 * common::TUSDC).await;

    // Alice requests exit
    let r = alice
        .call(env.pool.id(), "request_exit")
        .args_json(json!({ "pool_id": pool_id }))
        .transact()
        .await
        .expect("request_exit");
    assert!(r.is_success());

    // Alice executes exit immediately before notice period expires
    let r = alice
        .call(env.pool.id(), "execute_exit")
        .args_json(json!({ "pool_id": pool_id, "member": alice.id() }))
        .max_gas()
        .transact()
        .await
        .expect("execute_exit");
    assert!(r.is_failure());
    let err = format!("{:?}", r.failures());
    assert!(err.contains("E19_EXIT_NOTICE"), "unexpected error: {err}");
}

#[tokio::test]
async fn exit_refund_is_reduced_by_debt() {
    let env = common::setup().await;
    let dao = env.user("dao").await;
    let council = env.user("council").await;
    let alice = env.user("alice").await;
    let hospital = env.user("hospital").await;

    let mut params = common::Env::default_params();
    params["exit_lock_months"] = json!(0);
    params["exit_notice"] = json!("0");
    params["time_scale"] = json!(1);
    let pool_id = env.create_pool(&dao, params).await;

    env.set_council(&dao, pool_id, &[&council]).await;
    env.add_hospital(&dao, pool_id, &hospital, "City Hospital")
        .await;
    env.topup(&dao, pool_id, 1_000 * common::TUSDC).await;

    env.join(&alice, pool_id).await;
    env.contribute(&alice, pool_id, 100 * common::TUSDC).await;

    // Request guarantee of 50 tUSDC, hospital accepts and claims 40 tUSDC
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

    // Settle claim, adding 40 tUSDC debt to Alice
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
    assert_eq!(m["contributed"], (100 * common::TUSDC).to_string());

    // Alice balance before exit
    let balance_before = env.balance(&alice).await;

    // Alice requests exit
    let r = alice
        .call(env.pool.id(), "request_exit")
        .args_json(json!({ "pool_id": pool_id }))
        .transact()
        .await
        .expect("request_exit");
    assert!(r.is_success());

    // Alice executes exit: refund should be 100 - 40 = 60 tUSDC
    let r = alice
        .call(env.pool.id(), "execute_exit")
        .args_json(json!({ "pool_id": pool_id, "member": alice.id() }))
        .max_gas()
        .transact()
        .await
        .expect("execute_exit");
    assert!(r.is_success());

    let balance_after = env.balance(&alice).await;
    assert_eq!(balance_after, balance_before + 60 * common::TUSDC);

    // Member record is removed
    let m: Option<serde_json::Value> = env
        .pool
        .view("get_member")
        .args_json(json!({ "pool_id": pool_id, "account": alice.id() }))
        .await
        .expect("get_member")
        .json()
        .expect("json");
    assert!(m.is_none());
}

#[tokio::test]
async fn exit_queued_when_exposure_cap_would_break() {
    let env = common::setup().await;
    let dao = env.user("dao").await;
    let alice = env.user("alice").await;
    let bob = env.user("bob").await;
    let hospital = env.user("hospital").await;

    let mut params = common::Env::default_params();
    params["exit_lock_months"] = json!(0);
    params["exit_notice"] = json!("0");
    params["max_exposure_bps"] = json!(5000); // 50%
    params["time_scale"] = json!(1);
    let pool_id = env.create_pool(&dao, params).await;

    env.add_hospital(&dao, pool_id, &hospital, "City Hospital")
        .await;

    // Alice joins and contributes 50 tUSDC
    env.join(&alice, pool_id).await;
    env.contribute(&alice, pool_id, 50 * common::TUSDC).await;

    // Bob joins and contributes 50 tUSDC
    env.join(&bob, pool_id).await;
    env.contribute(&bob, pool_id, 50 * common::TUSDC).await;

    // Total balance in pool = 100 tUSDC
    // Bob requests guarantee of 40 tUSDC (<= base_limit 50, Instant tier, <= 50% of 100 tUSDC)
    let r = bob
        .call(env.pool.id(), "request_guarantee")
        .args_json(json!({
            "pool_id": pool_id,
            "member": bob.id(),
            "patient_initials": "BB",
            "code_hash": vec![1u8; 32],
            "hospital": hospital.id(),
            "amount": (40 * common::TUSDC).to_string(),
        }))
        .transact()
        .await
        .expect("request_guarantee");
    assert!(r.is_success());

    // Alice requests exit
    let r = alice
        .call(env.pool.id(), "request_exit")
        .args_json(json!({ "pool_id": pool_id }))
        .transact()
        .await
        .expect("request_exit");
    assert!(r.is_success());

    // Alice executes exit:
    // If Alice exits, refund = 50 tUSDC.
    // New pool balance = 100 - 50 = 50 tUSDC.
    // Exposure cap = 50 * 50% = 25 tUSDC.
    // Reserved = 40 tUSDC > 25 tUSDC, so it must fail with E13_EXPOSURE_CAP.
    let r = alice
        .call(env.pool.id(), "execute_exit")
        .args_json(json!({ "pool_id": pool_id, "member": alice.id() }))
        .max_gas()
        .transact()
        .await
        .expect("execute_exit");
    assert!(r.is_failure());
    let err = format!("{:?}", r.failures());
    assert!(err.contains("E13_EXPOSURE_CAP"), "unexpected error: {err}");

    // Alice is still in the pool with exit_requested_at set
    let m: serde_json::Value = env
        .pool
        .view("get_member")
        .args_json(json!({ "pool_id": pool_id, "account": alice.id() }))
        .await
        .expect("get_member")
        .json()
        .expect("json");
    assert!(m["exit_requested_at"].is_number() || m["exit_requested_at"].is_string());
}
