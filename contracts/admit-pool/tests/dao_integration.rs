//! Integration tests — see ROADMAP A-5.8. Names state the rule they check.
mod common;

use near_sdk::NearToken;
use serde_json::json;

#[tokio::test]
async fn sputnik_proposal_adds_hospital() {
    let env = common::setup().await;
    let dao_admin = env.user("admin").await;
    let hospital = env.user("hospital").await;

    // 1. Deploy real Sputnik DAO v2 contract in sandbox
    let sputnik_wasm = std::fs::read(common::SPUTNIK_WASM).expect("read sputnik wasm");
    let sputnik = env
        .worker
        .dev_deploy(&sputnik_wasm)
        .await
        .expect("deploy sputnik");

    // Initialize Sputnik DAO with dao_admin as council
    let r = sputnik
        .call("new")
        .args_json(json!({
            "config": {
                "name": "AdmitDAO",
                "purpose": "Governance of Admit Pools",
                "metadata": ""
            },
            "policy": [dao_admin.id()]
        }))
        .transact()
        .await
        .expect("sputnik new");
    assert!(r.is_success(), "sputnik new failed: {:?}", r.failures());

    // 2. Create pool where the DAO is the Sputnik DAO contract
    let params = common::Env::default_params();
    let r = sputnik
        .as_account()
        .call(env.pool.id(), "create_pool")
        .args_json(json!({
            "name": "Health Pool",
            "dao": sputnik.id(),
            "token": env.token.id(),
            "params": params,
        }))
        .deposit(NearToken::from_millinear(200))
        .transact()
        .await
        .expect("create_pool");
    assert!(r.is_success(), "create_pool failed: {:?}", r.failures());
    let pool_id: u64 = r.json().expect("pool_id");

    // Check hospital not in pool yet
    let pool: serde_json::Value = env
        .pool
        .view("get_pool")
        .args_json(json!({ "pool_id": pool_id }))
        .await
        .expect("get_pool")
        .json()
        .expect("json");
    assert!(pool["hospitals"].as_array().unwrap().is_empty());

    // 3. Prepare FunctionCall proposal args
    let action_args = json!({
        "pool_id": pool_id,
        "hospital": {
            "account": hospital.id(),
            "name": "Sputnik General Hospital",
            "fc_public_key": "ed25519:6E8sCci9badyRkXb3JoRpAxTMwx2gnNFkUM95Sdy7qEP"
        }
    });
    let action_args_bytes = serde_json::to_vec(&action_args).unwrap();
    use near_sdk::base64::Engine;
    let action_args_b64 =
        near_sdk::base64::engine::general_purpose::STANDARD.encode(&action_args_bytes);

    let proposal = json!({
        "proposal": {
            "description": "Add Sputnik General Hospital to pool",
            "kind": {
                "FunctionCall": {
                    "receiver_id": env.pool.id(),
                    "actions": [
                        {
                            "method_name": "council_add_hospital",
                            "args": action_args_b64,
                            "deposit": NearToken::from_millinear(2).as_yoctonear().to_string(),
                            "gas": "50000000000000"
                        }
                    ]
                }
            }
        }
    });

    // 4. dao_admin proposes via Sputnik DAO
    let r = dao_admin
        .call(sputnik.id(), "add_proposal")
        .args_json(proposal)
        .deposit(NearToken::from_near(1))
        .transact()
        .await
        .expect("add_proposal");
    assert!(r.is_success(), "add_proposal failed: {:?}", r.failures());
    let proposal_id: u64 = r.json().expect("proposal_id");

    // 5. dao_admin votes VoteApprove on the proposal
    let r = dao_admin
        .call(sputnik.id(), "act_proposal")
        .args_json(json!({
            "id": proposal_id,
            "action": "VoteApprove"
        }))
        .max_gas()
        .transact()
        .await
        .expect("act_proposal");
    assert!(r.is_success(), "act_proposal failed: {:?}", r.failures());

    // 6. Verify hospital is now added to the pool
    let pool: serde_json::Value = env
        .pool
        .view("get_pool")
        .args_json(json!({ "pool_id": pool_id }))
        .await
        .expect("get_pool")
        .json()
        .expect("json");
    let hospitals = pool["hospitals"].as_array().unwrap();
    assert_eq!(hospitals.len(), 1);
    assert_eq!(hospitals[0]["account"], hospital.id().to_string());
    assert_eq!(hospitals[0]["name"], "Sputnik General Hospital");

    // 7. Verify hospital storage was registered on the token
    let storage: Option<serde_json::Value> = env
        .token
        .view("storage_balance_of")
        .args_json(json!({ "account_id": hospital.id() }))
        .await
        .expect("storage_balance_of")
        .json()
        .expect("json");
    assert!(storage.is_some());
}
