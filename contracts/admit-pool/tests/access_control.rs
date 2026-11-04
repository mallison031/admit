//! Integration tests — see ROADMAP A-5.6. Names state the rule they check.
mod common;

use serde_json::json;

#[tokio::test]
async fn dao_only_methods_reject_other_callers() {
    let env = common::setup().await;
    let dao = env.user("dao").await;
    let alice = env.user("alice").await;
    let council = env.user("council").await;

    let params = common::Env::default_params();
    let pool_id = env.create_pool(&dao, params).await;

    // Alice (non-DAO) tries to set council members
    let r = alice
        .call(env.pool.id(), "council_set_members")
        .args_json(json!({
            "pool_id": pool_id,
            "council": vec![council.id()],
        }))
        .transact()
        .await
        .expect("council_set_members");
    assert!(r.is_failure());
    let err = format!("{:?}", r.failures());
    assert!(err.contains("E02_NOT_DAO"), "unexpected error: {err}");

    // Alice (non-DAO) tries to remove hospital
    let r = alice
        .call(env.pool.id(), "council_remove_hospital")
        .args_json(json!({
            "pool_id": pool_id,
            "account": "hospital.near",
        }))
        .transact()
        .await
        .expect("council_remove_hospital");
    assert!(r.is_failure());
    let err = format!("{:?}", r.failures());
    assert!(err.contains("E02_NOT_DAO"), "unexpected error: {err}");
}

#[tokio::test]
async fn council_methods_reject_non_council() {
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
    env.contribute(&alice, pool_id, 100 * common::TUSDC).await;
    env.topup(&dao, pool_id, 1_000 * common::TUSDC).await;

    // Alice requests guarantee in Council tier (e.g. 100 tUSDC, where base_limit = 50)
    let r = alice
        .call(env.pool.id(), "request_guarantee")
        .args_json(json!({
            "pool_id": pool_id,
            "member": alice.id(),
            "patient_initials": "AB",
            "code_hash": vec![1u8; 32],
            "hospital": hospital.id(),
            "amount": (100 * common::TUSDC).to_string(),
        }))
        .transact()
        .await
        .expect("request_guarantee");
    assert!(r.is_success());
    let guarantee_id: u64 = r.json().expect("guarantee_id");

    // Alice (non-council) tries to approve guarantee
    let r = alice
        .call(env.pool.id(), "council_approve")
        .args_json(json!({ "guarantee_id": guarantee_id }))
        .transact()
        .await
        .expect("council_approve");
    assert!(r.is_failure());
    let err = format!("{:?}", r.failures());
    assert!(err.contains("E03_NOT_COUNCIL"), "unexpected error: {err}");

    // Alice (non-council) tries to report death
    let r = alice
        .call(env.pool.id(), "report_death")
        .args_json(json!({ "guarantee_id": guarantee_id }))
        .transact()
        .await
        .expect("report_death");
    assert!(r.is_failure());
    let err = format!("{:?}", r.failures());
    assert!(err.contains("E03_NOT_COUNCIL"), "unexpected error: {err}");
}

#[tokio::test]
async fn hospital_methods_reject_other_accounts() {
    let env = common::setup().await;
    let dao = env.user("dao").await;
    let alice = env.user("alice").await;
    let hospital = env.user("hospital").await;
    let mallory = env.user("mallory").await;

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

    // Mallory (not the designated hospital) tries to accept guarantee
    let r = mallory
        .call(env.pool.id(), "hospital_accept")
        .args_json(json!({ "guarantee_id": guarantee_id }))
        .transact()
        .await
        .expect("hospital_accept");
    assert!(r.is_failure());
    let err = format!("{:?}", r.failures());
    assert!(err.contains("E04_NOT_HOSPITAL"), "unexpected error: {err}");

    // Mallory tries to claim guarantee
    let r = mallory
        .call(env.pool.id(), "hospital_claim")
        .args_json(json!({
            "guarantee_id": guarantee_id,
            "amount": (40 * common::TUSDC).to_string(),
            "file_hash": vec![1u8; 32],
        }))
        .transact()
        .await
        .expect("hospital_claim");
    assert!(r.is_failure());
    let err = format!("{:?}", r.failures());
    assert!(err.contains("E04_NOT_HOSPITAL"), "unexpected error: {err}");
}

#[tokio::test]
async fn time_scale_cannot_change() {
    let env = common::setup().await;
    let dao = env.user("dao").await;

    let mut params = common::Env::default_params();
    params["time_scale"] = json!(1);
    let pool_id = env.create_pool(&dao, params).await;

    // DAO tries to update pool params with a modified time_scale
    let mut updated_params = common::Env::default_params();
    updated_params["time_scale"] = json!(10);

    let r = dao
        .call(env.pool.id(), "council_set_params")
        .args_json(json!({
            "pool_id": pool_id,
            "params": updated_params,
        }))
        .transact()
        .await
        .expect("council_set_params");
    assert!(r.is_failure());
    let err = format!("{:?}", r.failures());
    assert!(
        err.contains("E21_TIME_SCALE_IMMUTABLE"),
        "unexpected error: {err}"
    );
}
