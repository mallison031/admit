//! NEP-297 events, standard `admit`, version `1.0.0` (ARCHITECTURE §7).
//! Every state change emits exactly one event through `emit`.

use near_sdk::env;
use near_sdk::json_types::U128;
use near_sdk::serde_json;
use near_sdk::{near, AccountId};

use crate::types::{GuaranteeId, PoolId, Standing};

pub const STANDARD: &str = "admit";
pub const VERSION: &str = "1.0.0";

#[near(serializers = [json])]
#[derive(Clone, Debug, PartialEq)]
#[serde(tag = "event", content = "data", rename_all = "snake_case")]
pub enum AdmitEvent {
    PoolCreated {
        pool_id: PoolId,
        dao: AccountId,
        token: AccountId,
    },
    MemberJoined {
        pool_id: PoolId,
        member: AccountId,
    },
    Contribution {
        pool_id: PoolId,
        member: AccountId,
        amount: U128,
    },
    Topup {
        pool_id: PoolId,
        from: AccountId,
        amount: U128,
    },
    Repayment {
        pool_id: PoolId,
        member: AccountId,
        amount: U128,
    },
    GuaranteeRequested {
        guarantee_id: GuaranteeId,
        pool_id: PoolId,
        amount: U128,
    },
    GuaranteeIssued {
        guarantee_id: GuaranteeId,
        hospital: AccountId,
        amount: U128,
    },
    GuaranteeToppedUp {
        guarantee_id: GuaranteeId,
        amount: U128,
    },
    GuaranteeAccepted {
        guarantee_id: GuaranteeId,
    },
    GuaranteeClaimed {
        guarantee_id: GuaranteeId,
        amount: U128,
    },
    GuaranteeDisputed {
        guarantee_id: GuaranteeId,
    },
    GuaranteeSettled {
        guarantee_id: GuaranteeId,
        paid: U128,
        debt_added: U128,
    },
    GuaranteeReleased {
        guarantee_id: GuaranteeId,
    },
    GuaranteeExpired {
        guarantee_id: GuaranteeId,
    },
    GuaranteeRejected {
        guarantee_id: GuaranteeId,
    },
    GuaranteeTransferred {
        from_id: GuaranteeId,
        to_id: GuaranteeId,
        to_hospital: AccountId,
    },
    DebtWrittenOff {
        guarantee_id: GuaranteeId,
        amount: U128,
        reason: String,
    },
    StandingChanged {
        pool_id: PoolId,
        member: AccountId,
        standing: Standing,
    },
    HospitalAdded {
        pool_id: PoolId,
        hospital: AccountId,
    },
    HospitalRemoved {
        pool_id: PoolId,
        hospital: AccountId,
    },
    CouncilSet {
        pool_id: PoolId,
    },
    ParamsChanged {
        pool_id: PoolId,
    },
    ExitRequested {
        pool_id: PoolId,
        member: AccountId,
    },
    ExitExecuted {
        pool_id: PoolId,
        member: AccountId,
        refund: U128,
    },
    AiReviewPosted {
        guarantee_id: GuaranteeId,
    },
}

/// Logs `EVENT_JSON:{"standard":"admit","version":"1.0.0","event":…,"data":[…]}`. (A-2.2)
pub fn emit(event: AdmitEvent) {
    let val = serde_json::to_value(&event).expect("serialize event");
    let event_name = val.get("event").expect("event tag");
    let event_data = val.get("data").expect("event data");
    let entry = serde_json::json!({
        "standard": STANDARD,
        "version": VERSION,
        "event": event_name,
        "data": [event_data]
    });
    env::log_str(&format!("EVENT_JSON:{}", entry));
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::{get_logs, VMContextBuilder};
    use near_sdk::testing_env;

    #[test]
    fn emit_writes_nep297_json() {
        let context = VMContextBuilder::new().build();
        testing_env!(context);

        let event = AdmitEvent::PoolCreated {
            pool_id: 0,
            dao: "dao.near".parse().unwrap(),
            token: "usdc.near".parse().unwrap(),
        };
        emit(event);

        let logs = get_logs();
        assert_eq!(logs.len(), 1);
        let log = &logs[0];
        assert!(log.starts_with("EVENT_JSON:"));
        let json_str = &log["EVENT_JSON:".len()..];
        let val: serde_json::Value = serde_json::from_str(json_str).unwrap();
        assert_eq!(val["standard"], STANDARD);
        assert_eq!(val["version"], VERSION);
        assert_eq!(val["event"], "pool_created");
        assert_eq!(val["data"][0]["pool_id"], 0);
        assert_eq!(val["data"][0]["dao"], "dao.near");
        assert_eq!(val["data"][0]["token"], "usdc.near");
    }
}
