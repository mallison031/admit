//! Integration tests — see ROADMAP A-5.7. Names state the rule they check.
mod common;

use near_sdk::NearToken;
use serde_json::json;

#[tokio::test]
async fn failed_hospital_payment_rolls_back() {
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

    let pool_before: serde_json::Value = env
        .pool
        .view("get_pool")
        .args_json(json!({ "pool_id": pool_id }))
        .await
        .expect("get_pool")
        .json()
        .expect("json");
    let initial_balance = pool_before["balance"].as_str().unwrap();

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

    // Hospital unregisters storage from token contract so ft_transfer will fail
    let r = hospital
        .call(env.token.id(), "storage_unregister")
        .args_json(json!({ "force": true }))
        .deposit(NearToken::from_yoctonear(1))
        .transact()
        .await
        .expect("storage_unregister");
    assert!(r.is_success());

    // Council attempts to settle
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

    // Guarantee status rolls back to Claimed
    let g: serde_json::Value = env
        .pool
        .view("get_guarantee")
        .args_json(json!({ "guarantee_id": guarantee_id }))
        .await
        .expect("get_guarantee")
        .json()
        .expect("json");
    assert_eq!(g["status"], "Claimed");
    assert_eq!(g["claim"]["paid"], "0");

    // Pool balance is restored
    let pool_after: serde_json::Value = env
        .pool
        .view("get_pool")
        .args_json(json!({ "pool_id": pool_id }))
        .await
        .expect("get_pool")
        .json()
        .expect("json");
    assert_eq!(pool_after["balance"], initial_balance);
    assert_eq!(pool_after["reserved"], (50 * common::TUSDC).to_string());

    // Member debt is not added
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

#[tokio::test]
async fn failed_exit_refund_rolls_back() {
    let env = common::setup().await;
    let dao = env.user("dao").await;
    let alice = env.user("alice").await;

    let mut params = common::Env::default_params();
    params["exit_lock_months"] = json!(0);
    params["exit_notice"] = json!("0");
    params["time_scale"] = json!(1);
    let pool_id = env.create_pool(&dao, params).await;

    env.join(&alice, pool_id).await;
    env.contribute(&alice, pool_id, 100 * common::TUSDC).await;

    let pool_before: serde_json::Value = env
        .pool
        .view("get_pool")
        .args_json(json!({ "pool_id": pool_id }))
        .await
        .expect("get_pool")
        .json()
        .expect("json");
    let initial_balance = pool_before["balance"].as_str().unwrap();

    // Alice requests exit
    let r = alice
        .call(env.pool.id(), "request_exit")
        .args_json(json!({ "pool_id": pool_id }))
        .transact()
        .await
        .expect("request_exit");
    assert!(r.is_success());

    // Alice unregisters from token contract so refund ft_transfer fails
    let r = alice
        .call(env.token.id(), "storage_unregister")
        .args_json(json!({ "force": true }))
        .deposit(NearToken::from_yoctonear(1))
        .transact()
        .await
        .expect("storage_unregister");
    assert!(r.is_success());

    // Alice executes exit
    let _ = alice
        .call(env.pool.id(), "execute_exit")
        .args_json(json!({ "pool_id": pool_id, "member": alice.id() }))
        .max_gas()
        .transact()
        .await
        .expect("execute_exit");

    // Member record is restored
    let m: serde_json::Value = env
        .pool
        .view("get_member")
        .args_json(json!({ "pool_id": pool_id, "account": alice.id() }))
        .await
        .expect("get_member")
        .json()
        .expect("json");
    assert_eq!(m["contributed"], (100 * common::TUSDC).to_string());

    // Pool balance is restored
    let pool_after: serde_json::Value = env
        .pool
        .view("get_pool")
        .args_json(json!({ "pool_id": pool_id }))
        .await
        .expect("get_pool")
        .json()
        .expect("json");
    assert_eq!(pool_after["balance"], initial_balance);
}

#[tokio::test]
async fn hospital_registration_registers_token_storage() {
    let env = common::setup().await;
    let dao = env.user("dao").await;
    let hospital = env.user("hospital").await;

    let params = common::Env::default_params();
    let pool_id = env.create_pool(&dao, params).await;

    // Check hospital is NOT registered in token before
    let storage_before: Option<serde_json::Value> = env
        .token
        .view("storage_balance_of")
        .args_json(json!({ "account_id": hospital.id() }))
        .await
        .expect("storage_balance_of")
        .json()
        .expect("json");
    assert!(storage_before.is_none());

    // DAO registers hospital in pool
    env.add_hospital(&dao, pool_id, &hospital, "City Hospital")
        .await;

    // Hospital is now registered in token contract
    let storage_after: Option<serde_json::Value> = env
        .token
        .view("storage_balance_of")
        .args_json(json!({ "account_id": hospital.id() }))
        .await
        .expect("storage_balance_of")
        .json()
        .expect("json");
    assert!(storage_after.is_some());
}
