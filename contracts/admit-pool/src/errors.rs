//! Every error code + message. Format: "E##_CODE: human message". Nothing else lives here.

pub const E01_POOL_NOT_FOUND: &str = "E01_POOL_NOT_FOUND: pool does not exist";
pub const E02_NOT_DAO: &str = "E02_NOT_DAO: only the pool DAO can call this";
pub const E03_NOT_COUNCIL: &str = "E03_NOT_COUNCIL: caller is not a council member";
pub const E04_NOT_HOSPITAL: &str = "E04_NOT_HOSPITAL: caller is not the guarantee's hospital";
pub const E05_NOT_MEMBER_OR_DELEGATE: &str =
    "E05_NOT_MEMBER_OR_DELEGATE: caller is not the member or a delegate";
pub const E06_HOSPITAL_NOT_REGISTERED: &str =
    "E06_HOSPITAL_NOT_REGISTERED: hospital is not registered in this pool";
pub const E07_TENURE_TOO_SHORT: &str = "E07_TENURE_TOO_SHORT: member tenure is below the minimum";
pub const E08_CONTRIBUTIONS_UNPAID: &str =
    "E08_CONTRIBUTIONS_UNPAID: contributions are behind schedule";
pub const E09_TOO_MANY_ACTIVE: &str =
    "E09_TOO_MANY_ACTIVE: member already has the maximum active guarantees";
pub const E10_COOLDOWN: &str = "E10_COOLDOWN: cooldown since the last guarantee has not passed";
pub const E11_STANDING_DEFAULT: &str = "E11_STANDING_DEFAULT: member is in default";
pub const E12_OVER_TIER: &str = "E12_OVER_TIER: amount is above the council tier";
pub const E13_EXPOSURE_CAP: &str = "E13_EXPOSURE_CAP: pool exposure cap would be exceeded";
pub const E14_INVALID_STATUS: &str =
    "E14_INVALID_STATUS: guarantee is not in a valid status for this action";
pub const E15_CLAIM_EXCEEDS_GUARANTEE: &str =
    "E15_CLAIM_EXCEEDS_GUARANTEE: claim is above the guaranteed amount";
pub const E16_DISPUTE_WINDOW_OPEN: &str = "E16_DISPUTE_WINDOW_OPEN: dispute window has not closed";
pub const E17_DISPUTE_WINDOW_CLOSED: &str = "E17_DISPUTE_WINDOW_CLOSED: dispute window has closed";
pub const E18_EXIT_LOCKED: &str = "E18_EXIT_LOCKED: contributions are still within the exit lock";
pub const E19_EXIT_NOTICE: &str = "E19_EXIT_NOTICE: exit notice period has not passed";
pub const E20_WRONG_TOKEN: &str = "E20_WRONG_TOKEN: token is not this pool's token";
pub const E21_TIME_SCALE_IMMUTABLE: &str = "E21_TIME_SCALE_IMMUTABLE: time_scale cannot be changed";
pub const E22_INVALID_PARAMS: &str = "E22_INVALID_PARAMS: pool parameters are invalid";
pub const E23_GUARANTEE_NOT_FOUND: &str = "E23_GUARANTEE_NOT_FOUND: guarantee does not exist";
pub const E24_MEMBER_NOT_FOUND: &str = "E24_MEMBER_NOT_FOUND: member does not exist";
pub const E25_INITIALS_TOO_LONG: &str =
    "E25_INITIALS_TOO_LONG: patient initials must be at most 4 characters";
pub const E26_NOT_EXPIRED: &str = "E26_NOT_EXPIRED: guarantee has not expired";
pub const E27_NOT_AI_REVIEWER: &str = "E27_NOT_AI_REVIEWER: caller is not the AI reviewer";
pub const E28_ALREADY_MEMBER: &str = "E28_ALREADY_MEMBER: account is already a member";
pub const E29_INVALID_MESSAGE: &str = "E29_INVALID_MESSAGE: ft_on_transfer message is invalid";
pub const E30_INSUFFICIENT_DEPOSIT: &str =
    "E30_INSUFFICIENT_DEPOSIT: attached deposit does not cover storage";
