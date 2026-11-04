//! Hospital actions (function-call key via relayer). (A-3.6–A-3.8, A-3.10)

use near_sdk::json_types::U128;
use near_sdk::{near, AccountId};

use crate::types::{CryptoHash, GuaranteeId};
use crate::{Contract, ContractExt};

#[near]
impl Contract {
    /// Issued → Accepted; expiry no longer applies.
    pub fn hospital_accept(&mut self, guarantee_id: GuaranteeId) {
        let _ = guarantee_id;
        todo!("A-3.6")
    }

    /// Accepted → Claimed; amount ≤ guarantee (E15); starts the dispute window.
    pub fn hospital_claim(&mut self, guarantee_id: GuaranteeId, amount: U128, file_hash: CryptoHash) {
        let _ = (guarantee_id, amount, file_hash);
        todo!("A-3.7")
    }

    /// → Released; frees the reservation.
    pub fn hospital_release(&mut self, guarantee_id: GuaranteeId) {
        let _ = guarantee_id;
        todo!("A-3.8")
    }

    /// Keeps `partial_amount` as a claim here; the remainder becomes a new guarantee at `to_hospital`.
    pub fn hospital_transfer(
        &mut self,
        guarantee_id: GuaranteeId,
        to_hospital: AccountId,
        partial_amount: U128,
    ) -> GuaranteeId {
        let _ = (guarantee_id, to_hospital, partial_amount);
        todo!("A-3.10")
    }
}
