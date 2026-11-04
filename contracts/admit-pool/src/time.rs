//! The ONLY place durations are computed. Applies `PoolParams::time_scale`. (A-2.3)

pub const NS_PER_SECOND: u64 = 1_000_000_000;
pub const NS_PER_DAY: u64 = 86_400 * NS_PER_SECOND;
/// A "month" is 30 days.
pub const NS_PER_MONTH: u64 = 30 * NS_PER_DAY;

/// Real-time duration → on-chain duration under `time_scale` (duration / time_scale).
pub fn scaled(duration_ns: u64, time_scale: u32) -> u64 {
    let scale = u64::from(time_scale.max(1));
    duration_ns.checked_div(scale).unwrap_or(0)
}

/// Whole scaled months between two timestamps.
pub fn months_between(from_ns: u64, to_ns: u64, time_scale: u32) -> u64 {
    if to_ns <= from_ns {
        return 0;
    }
    let diff = to_ns.saturating_sub(from_ns);
    let scale = u64::from(time_scale.max(1));
    let product = (diff as u128).saturating_mul(scale as u128);
    (product / (NS_PER_MONTH as u128)) as u64
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn scaled_identity_at_scale_1() {
        let dur = 5 * NS_PER_DAY;
        assert_eq!(scaled(dur, 1), dur);
    }

    #[test]
    fn scaled_divides_by_scale() {
        let dur = 10 * NS_PER_DAY;
        assert_eq!(scaled(dur, 5), 2 * NS_PER_DAY);
    }

    #[test]
    fn months_between_counts_whole_months() {
        let from = 1_000_000;
        let to = from + 2 * NS_PER_MONTH + 5 * NS_PER_DAY;
        assert_eq!(months_between(from, to, 1), 2);

        // Under 2x timescale, 1 real month contains 2 scaled months
        let to_scaled = from + NS_PER_MONTH;
        assert_eq!(months_between(from, to_scaled, 2), 2);
    }

    #[test]
    fn months_between_is_zero_when_reversed() {
        assert_eq!(months_between(100, 50, 1), 0);
        assert_eq!(months_between(100, 100, 1), 0);
    }
}
