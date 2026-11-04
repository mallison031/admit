//! The ONLY place durations are computed. Applies `PoolParams::time_scale`. (A-2.3)

pub const NS_PER_SECOND: u64 = 1_000_000_000;
pub const NS_PER_DAY: u64 = 86_400 * NS_PER_SECOND;
/// A "month" is 30 days.
pub const NS_PER_MONTH: u64 = 30 * NS_PER_DAY;

/// Real-time duration → on-chain duration under `time_scale` (duration / time_scale).
pub fn scaled(duration_ns: u64, time_scale: u32) -> u64 {
    let _ = (duration_ns, time_scale);
    todo!("A-2.3")
}

/// Whole scaled months between two timestamps.
pub fn months_between(from_ns: u64, to_ns: u64, time_scale: u32) -> u64 {
    let _ = (from_ns, to_ns, time_scale);
    todo!("A-2.3")
}
