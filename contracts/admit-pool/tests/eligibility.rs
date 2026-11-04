//! Integration tests — see ROADMAP A-5.2. Names state the rule they check.
mod common;

use serde_json::json;

#[tokio::test]
async fn new_member_below_min_tenure_is_denied() {
    let env = common::setup().await;
    let dao = env.user("dao").await;
    let alice = env.user("alice").await;
    let hospital = env.user("hospital").await;

    let mut params = common::Env::default_params();
    params["min_tenure_months"] = json!(1);

    let pool_id = env.create_pool(&dao, params).await;
    env.add_hospital(&dao, pool_id, &hospital, "General Hospital")
        .await;
    env.topup(&dao, pool_id, 1_000 * common::TUSDC).await;

    env.join(&alice, pool_id).await;

    let code_hash = [0u8; 32];
    let r = alice
        .call(env.pool.id(), "request_guarantee")
        .args_json(json!({
            "pool_id": pool_id,
            "member": alice.id(),
            "hospital": hospital.id(),
            "amount": (20 * common::TUSDC).to_string(),
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
        err.contains("E07_TENURE_TOO_SHORT"),
        "Expected E07_TENURE_TOO_SHORT, got: {}",
        err
    );
}

#[tokio::test]
async fn unpaid_contributions_are_denied() {
    let env = common::setup().await;
    let dao = env.user("dao").await;
    let alice = env.user("alice").await;
    let hospital = env.user("hospital").await;

    let mut params = common::Env::default_params();
    params["min_tenure_months"] = json!(1);
    // 1_000_000_000 is u32: 10ms in sandbox = ~3.8 months scaled
    params["time_scale"] = json!(1_000_000_000);

    let pool_id = env.create_pool(&dao, params).await;
    env.add_hospital(&dao, pool_id, &hospital, "General Hospital")
        .await;
    env.topup(&dao, pool_id, 1_000 * common::TUSDC).await;

    env.join(&alice, pool_id).await;

    // Call add_delegate to advance at least one block timestamp
    let dummy = env.user("dummy").await;
    let r = alice
        .call(env.pool.id(), "add_delegate")
        .args_json(json!({ "pool_id": pool_id, "delegate": dummy.id() }))
        .transact()
        .await
        .expect("add_delegate");
    assert!(r.is_success(), "add_delegate failed: {:?}", r.failures());

    // Alice has tenure >= 1, but contributed 0 -> E08_CONTRIBUTIONS_UNPAID
    let code_hash = [0u8; 32];
    let r = alice
        .call(env.pool.id(), "request_guarantee")
        .args_json(json!({
            "pool_id": pool_id,
            "member": alice.id(),
            "hospital": hospital.id(),
            "amount": (20 * common::TUSDC).to_string(),
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
        err.contains("E08_CONTRIBUTIONS_UNPAID"),
        "Expected E08_CONTRIBUTIONS_UNPAID, got: {}",
        err
    );
}

#[tokio::test]
async fn third_concurrent_guarantee_is_denied() {
    let env = common::setup().await;
    let dao = env.user("dao").await;
    let alice = env.user("alice").await;
    let hospital = env.user("hospital").await;

    let mut params = common::Env::default_params();
    params["cooldown"] = json!("0");
    params["max_active_per_member"] = json!(2);

    let pool_id = env.create_pool(&dao, params).await;
    env.add_hospital(&dao, pool_id, &hospital, "General Hospital")
        .await;
    env.topup(&dao, pool_id, 1_000 * common::TUSDC).await;

    env.join(&alice, pool_id).await;
    env.contribute(&alice, pool_id, 10 * common::TUSDC).await;

    let code_hash = [0u8; 32];
    for _ in 0..2 {
        let r = alice
            .call(env.pool.id(), "request_guarantee")
            .args_json(json!({
                "pool_id": pool_id,
                "member": alice.id(),
                "hospital": hospital.id(),
                "amount": (10 * common::TUSDC).to_string(),
                "code_hash": code_hash,
                "patient_initials": "JD",
                "local": null,
            }))
            .transact()
            .await
            .expect("request_guarantee");
        assert!(r.is_success());
    }

    // Third concurrent guarantee is denied
    let r = alice
        .call(env.pool.id(), "request_guarantee")
        .args_json(json!({
            "pool_id": pool_id,
            "member": alice.id(),
            "hospital": hospital.id(),
            "amount": (10 * common::TUSDC).to_string(),
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
        err.contains("E09_TOO_MANY_ACTIVE"),
        "Expected E09_TOO_MANY_ACTIVE, got: {}",
        err
    );
}

#[tokio::test]
async fn cooldown_blocks_next_guarantee() {
    let env = common::setup().await;
    let dao = env.user("dao").await;
    let alice = env.user("alice").await;
    let hospital = env.user("hospital").await;

    let mut params = common::Env::default_params();
    params["cooldown"] = json!("86400000000000"); // 1 day cooldown
    params["max_active_per_member"] = json!(2);

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
            "amount": (10 * common::TUSDC).to_string(),
            "code_hash": code_hash,
            "patient_initials": "JD",
            "local": null,
        }))
        .transact()
        .await
        .expect("request_guarantee");
    assert!(r.is_success());

    // Second request immediately after is blocked by cooldown
    let r = alice
        .call(env.pool.id(), "request_guarantee")
        .args_json(json!({
            "pool_id": pool_id,
            "member": alice.id(),
            "hospital": hospital.id(),
            "amount": (10 * common::TUSDC).to_string(),
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
        err.contains("E10_COOLDOWN"),
        "Expected E10_COOLDOWN, got: {}",
        err
    );
}

#[tokio::test]
async fn default_member_is_denied() {
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

    // Mark default by DAO
    let r = dao
        .call(env.pool.id(), "council_mark_default")
        .args_json(json!({
            "pool_id": pool_id,
            "member": alice.id(),
        }))
        .transact()
        .await
        .expect("council_mark_default");
    assert!(r.is_success());

    let code_hash = [0u8; 32];
    let r = alice
        .call(env.pool.id(), "request_guarantee")
        .args_json(json!({
            "pool_id": pool_id,
            "member": alice.id(),
            "hospital": hospital.id(),
            "amount": (10 * common::TUSDC).to_string(),
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
        err.contains("E11_STANDING_DEFAULT"),
        "Expected E11_STANDING_DEFAULT, got: {}",
        err
    );
}

#[tokio::test]
async fn late_member_gets_reduced_limit() {
    let env = common::setup().await;
    let dao = env.user("dao").await;
    let alice = env.user("alice").await;
    let hospital = env.user("hospital").await;

    let mut params = common::Env::default_params();
    params["min_tenure_months"] = json!(1);
    params["late_limit_bps"] = json!(5000); // 50%
    params["base_limit"] = json!((50 * common::TUSDC).to_string());
    params["limit_per_month"] = json!("0");
    params["council_tier_multiplier"] = json!(1); // council max is equal to limit
    params["time_scale"] = json!(2_592_000); // 1 sec = 1 month

    let pool_id = env.create_pool(&dao, params).await;
    env.add_hospital(&dao, pool_id, &hospital, "General Hospital")
        .await;
    env.topup(&dao, pool_id, 1_000 * common::TUSDC).await;

    env.join(&alice, pool_id).await;
    // Alice contributes for 1 month
    env.contribute(&alice, pool_id, 10 * common::TUSDC).await;

    // Advance 2 blocks so tenure becomes ~2 months. Alice paid 1 month -> Late (1 period behind).
    let dummy = env.user("dummy").await;
    let r1 = alice
        .call(env.pool.id(), "add_delegate")
        .args_json(json!({ "pool_id": pool_id, "delegate": dummy.id() }))
        .transact()
        .await
        .expect("add_delegate");
    assert!(r1.is_success());
    let r2 = alice
        .call(env.pool.id(), "remove_delegate")
        .args_json(json!({ "pool_id": pool_id, "delegate": dummy.id() }))
        .transact()
        .await
        .expect("remove_delegate");
    assert!(r2.is_success());

    // Normal limit is 50. Late gets 50 * 50% = 25 tUSDC.
    // 30 tUSDC is above 25 tUSDC limit and council multiplier is 1 -> E12_OVER_TIER.
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
    assert!(r.is_failure());
    let err = format!("{:?}", r.failures());
    assert!(
        err.contains("E12_OVER_TIER"),
        "Expected E12_OVER_TIER, got: {}",
        err
    );
}

#[tokio::test]
async fn non_delegate_cannot_request() {
    let env = common::setup().await;
    let dao = env.user("dao").await;
    let alice = env.user("alice").await;
    let bob = env.user("bob").await;
    let hospital = env.user("hospital").await;

    let pool_id = env.create_pool(&dao, common::Env::default_params()).await;
    env.add_hospital(&dao, pool_id, &hospital, "General Hospital")
        .await;
    env.topup(&dao, pool_id, 1_000 * common::TUSDC).await;

    env.join(&alice, pool_id).await;
    env.contribute(&alice, pool_id, 10 * common::TUSDC).await;

    // Bob is NOT a delegate of Alice and tries to request a guarantee for Alice
    let code_hash = [0u8; 32];
    let r = bob
        .call(env.pool.id(), "request_guarantee")
        .args_json(json!({
            "pool_id": pool_id,
            "member": alice.id(),
            "hospital": hospital.id(),
            "amount": (10 * common::TUSDC).to_string(),
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
        err.contains("E05_NOT_MEMBER_OR_DELEGATE"),
        "Expected E05_NOT_MEMBER_OR_DELEGATE, got: {}",
        err
    );
}
