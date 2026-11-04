//! NEP-297 events, standard `admit`, version `1.0.0` (ARCHITECTURE §7).
//! Every state change emits exactly one event through `emit`.

use near_sdk::json_types::U128;
use near_sdk::{near, AccountId};

use crate::types::{GuaranteeId, PoolId, Standing};

pub const STANDARD: &str = "admit";
pub const VERSION: &str = "1.0.0";

#[near(serializers = [json])]
#[derive(Clone, Debug)]
#[serde(tag = "event", content = "data", rename_all = "snake_case")]
pub enum AdmitEvent {
    PoolCreated { pool_id: PoolId, dao: AccountId, token: AccountId },
    MemberJoined { pool_id: PoolId, member: AccountId },
    Contribution { pool_id: PoolId, member: AccountId, amount: U128 },
    Topup { pool_id: PoolId, from: AccountId, amount: U128 },
    Repayment { pool_id: PoolId, member: AccountId, amount: U128 },
    GuaranteeRequested { guarantee_id: GuaranteeId, pool_id: PoolId, amount: U128 },
    GuaranteeIssued { guarantee_id: GuaranteeId, hospital: AccountId, amount: U128 },
    GuaranteeToppedUp { guarantee_id: GuaranteeId, amount: U128 },
    GuaranteeAccepted { guarantee_id: GuaranteeId },
    GuaranteeClaimed { guarantee_id: GuaranteeId, amount: U128 },
    GuaranteeDisputed { guarantee_id: GuaranteeId },
    GuaranteeSettled { guarantee_id: GuaranteeId, paid: U128, debt_added: U128 },
    GuaranteeReleased { guarantee_id: GuaranteeId },
    GuaranteeExpired { guarantee_id: GuaranteeId },
    GuaranteeRejected { guarantee_id: GuaranteeId },
    GuaranteeTransferred { from_id: GuaranteeId, to_id: GuaranteeId, to_hospital: AccountId },
    DebtWrittenOff { guarantee_id: GuaranteeId, amount: U128, reason: String },
    StandingChanged { pool_id: PoolId, member: AccountId, standing: Standing },
    HospitalAdded { pool_id: PoolId, hospital: AccountId },
    HospitalRemoved { pool_id: PoolId, hospital: AccountId },
    CouncilSet { pool_id: PoolId },
    ParamsChanged { pool_id: PoolId },
    ExitRequested { pool_id: PoolId, member: AccountId },
    ExitExecuted { pool_id: PoolId, member: AccountId, refund: U128 },
    AiReviewPosted { guarantee_id: GuaranteeId },
}

/// Logs `EVENT_JSON:{"standard":"admit","version":"1.0.0","event":…,"data":[…]}`. (A-2.2)
pub fn emit(event: AdmitEvent) {
    let _ = event;
    todo!("A-2.2: serialize and env::log_str in NEP-297 format")
}
