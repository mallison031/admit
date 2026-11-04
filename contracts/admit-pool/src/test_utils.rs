//! State builders and insertion helpers for unit tests. (A-2.12)

use near_sdk::json_types::{U128, U64};
use near_sdk::AccountId;

use crate::types::{GStatus, Guarantee, GuaranteeId, Member, Pool, PoolId, PoolParams, Standing};
use crate::Contract;

pub fn params() -> PoolParams {
    PoolParams {
        monthly_contribution: U128(10_000_000), // 10 USDC (6 decimals)
        min_tenure_months: 1,
        base_limit: U128(50_000_000),      // 50 USDC
        limit_per_month: U128(25_000_000), // 25 USDC
        max_limit: U128(500_000_000),      // 500 USDC
        late_limit_bps: 5_000,             // 50%
        max_exposure_bps: 8_000,           // 80%
        max_active_per_member: 2,
        cooldown: U64(86_400_000_000_000),        // 1 day in ns
        guarantee_ttl: U64(86_400_000_000_000),   // 1 day in ns
        dispute_window: U64(172_800_000_000_000), // 2 days in ns
        pool_covered_bps: 0,
        cover_on_death: true,
        council_tier_multiplier: 3,
        exit_lock_months: 12,
        exit_notice: U64(2_592_000_000_000_000), // 30 days in ns
        time_scale: 1,
    }
}

pub fn pool(id: PoolId) -> Pool {
    Pool {
        id,
        name: format!("Pool {}", id),
        dao: "dao.near".parse().unwrap(),
        token: "usdc.near".parse().unwrap(),
        params: params(),
        council: vec![
            "council1.near".parse().unwrap(),
            "council2.near".parse().unwrap(),
        ],
        hospitals: vec![],
        balance: U128(100_000_000_000),
        reserved: U128(0),
        written_off: U128(0),
        created_at: U64(1_000_000_000),
    }
}

pub fn member(pool_id: PoolId, account: AccountId) -> Member {
    Member {
        account,
        pool_id,
        joined_at: U64(1_000_000_000),
        contributed: U128(60_000_000),
        outstanding: U128(0),
        standing: Standing::Good,
        active_guarantees: 0,
        last_guarantee_at: None,
        delegates: vec![],
        exit_requested_at: None,
    }
}

pub fn guarantee(id: GuaranteeId, status: GStatus) -> Guarantee {
    Guarantee {
        id,
        pool_id: 0,
        member: "alice.near".parse().unwrap(),
        requested_by: "alice.near".parse().unwrap(),
        patient_initials: Some("JD".to_string()),
        code_hash: [0u8; 32],
        hospital: "hospital.near".parse().unwrap(),
        amount: U128(100_000_000),
        local: None,
        status,
        issued_at: U64(1_000_000_000),
        expires_at: U64(1_000_000_000 + 86_400_000_000_000),
        accepted_at: None,
        claim: None,
        approved_by: None,
        transferred_from: None,
    }
}

pub fn insert_pool(contract: &mut Contract, pool: Pool) {
    contract.pools.insert(pool.id, pool);
}

pub fn insert_member(contract: &mut Contract, member: Member) {
    let key = (member.pool_id, member.account.clone());
    let pool_id = member.pool_id;
    let account = member.account.clone();
    contract.members.insert(key, member);
    let mut index = contract
        .member_index
        .get(&pool_id)
        .cloned()
        .unwrap_or_default();
    if !index.contains(&account) {
        index.push(account);
        contract.member_index.insert(pool_id, index);
    }
}

pub fn insert_guarantee(contract: &mut Contract, guarantee: Guarantee) {
    contract.guarantees.insert(guarantee.id, guarantee);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn builders_and_inserters_work() {
        let mut contract = Contract::new(None);
        let p = pool(0);
        insert_pool(&mut contract, p);

        let m = member(0, "alice.near".parse().unwrap());
        insert_member(&mut contract, m);

        let g = guarantee(0, GStatus::Issued);
        insert_guarantee(&mut contract, g);

        assert!(contract.pools.contains_key(&0));
        assert!(contract
            .members
            .contains_key(&(0, "alice.near".parse().unwrap())));
        assert!(contract.guarantees.contains_key(&0));
    }
}
