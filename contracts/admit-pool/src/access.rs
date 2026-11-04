//! Role guards: one helper per role, called first in every mutating method. (A-2.5)

use near_sdk::AccountId;

use crate::types::{Guarantee, Member, Pool};

pub fn assert_dao(pool: &Pool) {
    let _ = pool;
    todo!("A-2.5: predecessor == pool.dao else E02")
}

pub fn assert_council(pool: &Pool) {
    let _ = pool;
    todo!("A-2.5: predecessor ∈ pool.council else E03")
}

pub fn assert_hospital(guarantee: &Guarantee) {
    let _ = guarantee;
    todo!("A-2.5: predecessor == guarantee.hospital else E04")
}

pub fn assert_member_or_delegate(member: &Member) -> AccountId {
    let _ = member;
    todo!("A-2.5: predecessor == member.account or ∈ delegates else E05; returns caller")
}
