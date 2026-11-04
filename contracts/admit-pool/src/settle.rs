//! Disputes, settlement, debt, death write-off, AI review. (A-4.1, A-4.2, A-4.5, A-12.1)

use near_sdk::json_types::U128;
use near_sdk::{near, Promise};

use crate::types::{AiReview, GuaranteeId};
use crate::{Contract, ContractExt};

#[near]
impl Contract {
    /// Member (or delegate), within the dispute window (E17) → Disputed.
    pub fn member_dispute(&mut self, guarantee_id: GuaranteeId, reason: String) {
        let _ = (guarantee_id, reason);
        todo!("A-4.1")
    }

    /// Anyone after the window if undisputed; a council member earlier or with an adjustment.
    /// Pays hospital (amount − adjustment), frees reservation, adds debt paid × (1 − pool_covered_bps).
    pub fn settle(
        &mut self,
        guarantee_id: GuaranteeId,
        adjustment: Option<U128>,
        adjustment_reason: Option<String>,
    ) -> Promise {
        let _ = (guarantee_id, adjustment, adjustment_reason);
        todo!("A-4.2")
    }

    /// Council member. If `cover_on_death`, writes off this guarantee's debt.
    pub fn report_death(&mut self, guarantee_id: GuaranteeId) {
        let _ = guarantee_id;
        todo!("A-4.5")
    }

    /// Could (A-12.1). Only `ai_reviewer` (E27). Advisory only.
    pub fn post_ai_review(&mut self, guarantee_id: GuaranteeId, review: AiReview) {
        let _ = (guarantee_id, review);
        todo!("A-12.1")
    }
}
