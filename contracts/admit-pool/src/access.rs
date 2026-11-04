//! Role guards: one helper per role, called first in every mutating method. (A-2.5)

use near_sdk::{env, require, AccountId};

use crate::errors::{E02_NOT_DAO, E03_NOT_COUNCIL, E04_NOT_HOSPITAL, E05_NOT_MEMBER_OR_DELEGATE};
use crate::types::{Guarantee, Member, Pool};

pub fn assert_dao(pool: &Pool) {
    require!(env::predecessor_account_id() == pool.dao, E02_NOT_DAO);
}

pub fn assert_council(pool: &Pool) {
    let caller = env::predecessor_account_id();
    require!(pool.council.contains(&caller), E03_NOT_COUNCIL);
}

pub fn assert_hospital(guarantee: &Guarantee) {
    require!(
        env::predecessor_account_id() == guarantee.hospital,
        E04_NOT_HOSPITAL
    );
}

pub fn assert_member_or_delegate(member: &Member) -> AccountId {
    let caller = env::predecessor_account_id();
    let is_member = caller == member.account;
    let is_delegate = member.delegates.contains(&caller);
    require!(is_member || is_delegate, E05_NOT_MEMBER_OR_DELEGATE);
    caller
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::{guarantee, member, pool};
    use crate::types::GStatus;
    use near_sdk::test_utils::VMContextBuilder;
    use near_sdk::testing_env;

    fn set_predecessor(caller: &str) {
        let ctx = VMContextBuilder::new()
            .predecessor_account_id(caller.parse().unwrap())
            .build();
        testing_env!(ctx);
    }

    #[test]
    fn assert_dao_accepts_allowed_caller() {
        let pl = pool(0);
        set_predecessor(pl.dao.as_str());
        assert_dao(&pl);
    }

    #[test]
    #[should_panic(expected = "E02_NOT_DAO")]
    fn assert_dao_rejects_other_caller() {
        let pl = pool(0);
        set_predecessor("attacker.near");
        assert_dao(&pl);
    }

    #[test]
    fn assert_council_accepts_allowed_caller() {
        let pl = pool(0);
        set_predecessor(pl.council[0].as_str());
        assert_council(&pl);
    }

    #[test]
    #[should_panic(expected = "E03_NOT_COUNCIL")]
    fn assert_council_rejects_other_caller() {
        let pl = pool(0);
        set_predecessor("stranger.near");
        assert_council(&pl);
    }

    #[test]
    fn assert_hospital_accepts_allowed_caller() {
        let g = guarantee(0, GStatus::Issued);
        set_predecessor(g.hospital.as_str());
        assert_hospital(&g);
    }

    #[test]
    #[should_panic(expected = "E04_NOT_HOSPITAL")]
    fn assert_hospital_rejects_other_caller() {
        let g = guarantee(0, GStatus::Issued);
        set_predecessor("stranger.near");
        assert_hospital(&g);
    }

    #[test]
    fn assert_member_or_delegate_accepts_allowed_caller() {
        let mut m = member(0, "alice.near".parse().unwrap());
        m.delegates = vec!["delegate.near".parse().unwrap()];

        set_predecessor("alice.near");
        let caller = assert_member_or_delegate(&m);
        assert_eq!(caller.as_str(), "alice.near");

        set_predecessor("delegate.near");
        let caller = assert_member_or_delegate(&m);
        assert_eq!(caller.as_str(), "delegate.near");
    }

    #[test]
    #[should_panic(expected = "E05_NOT_MEMBER_OR_DELEGATE")]
    fn assert_member_or_delegate_rejects_other_caller() {
        let m = member(0, "alice.near".parse().unwrap());
        set_predecessor("stranger.near");
        assert_member_or_delegate(&m);
    }
}
