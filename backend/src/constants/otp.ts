export const OTP_TTL_MIN = 5;            // expire in 5 minutes
export const OTP_MAX_SEND_ATTEMPTS = 3;  // resend cap
export const OTP_VERIFY_MAX_ATTEMPTS = 3;
export const OTP_FIRST_TIME_PURPOSE = "first_txn_verification";
export const OTP_PROVIDER = "EASYPAISA" as const; // ProviderEnum