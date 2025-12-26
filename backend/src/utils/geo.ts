export function validateLocation(lat?: number, lng?: number) {
    if (typeof lat !== "number" || typeof lng !== "number") return false;
    if (lat < -90 || lat > 90) return false;
    if (lng < -180 || lng > 180) return false;
    return true;
}