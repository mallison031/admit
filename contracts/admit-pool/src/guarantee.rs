//! Guarantee requests, council tier, top-ups, expiry. (A-3.1–A-3.5, A-3.9)

use near_sdk::json_types::U128;
use near_sdk::{near, AccountId};

use crate::types::{CryptoHash, GuaranteeId, LocalAmount, PoolId};
use crate::{Contract, ContractExt};

#[near]
impl Contract {
    /// Caller ∈ {member, delegates}. Instant → Issued (reserves); Council tier → PendingCouncil;
    /// above tier → E12. Checks: hospital registered, tenure, contributions, active cap, cooldown, exposure.
    #[allow(clippy::too_many_arguments)]
    pub fn request_guarantee(
        &mut self,
        pool_id: PoolId,
        member: AccountId,
        hospital: AccountId,
        amount: U128,
        code_hash: CryptoHash,
        patient_initials: Option<String>,
        local: Option<LocalAmount>,
    ) -> GuaranteeId {
        let _ = (
            pool_id,
            member,
            hospital,
            amount,
            code_hash,
            patient_initials,
            local,
        );
        todo!("A-3.1")
    }

    /// Same tier + exposure checks on the new total.
    pub fn request_topup(&mut self, guarantee_id: GuaranteeId, extra: U128) {
        let _ = (guarantee_id, extra);
        todo!("A-3.9")
    }

    pub fn council_approve(&mut self, guarantee_id: GuaranteeId) {
        let _ = guarantee_id;
        todo!("A-3.2")
    }

    pub fn council_reject(&mut self, guarantee_id: GuaranteeId, reason: String) {
        let _ = (guarantee_id, reason);
        todo!("A-3.2")
    }

    /// Anyone. Only `Issued` past `expires_at` (E26); frees the reservation.
    pub fn expire(&mut self, guarantee_id: GuaranteeId) {
        let _ = guarantee_id;
        todo!("A-3.5")
    }
}
