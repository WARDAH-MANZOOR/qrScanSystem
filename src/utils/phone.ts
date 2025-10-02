// minimal normalization; replace with libphonenumber if you already use it
export function normalizeE164(raw: string): string {
    const digits = raw?.replace(/[^\d+]/g, "");
    if (digits.startsWith("+")) return digits;
    // default to Pakistan if no +
    if (digits.startsWith("0")) return `+92${digits.slice(1)}`;
    if (digits.length === 10 || digits.length === 11) return `+92${digits.slice(-10)}`;
    return `+${digits}`;
}

export function maskPhone(e164: string): string {
    return e164.replace(/(\+\d{2})(\d+)(\d{4})/, (_, cc, mid, tail) => `${cc}${"*".repeat(mid.length)}${tail}`);
}