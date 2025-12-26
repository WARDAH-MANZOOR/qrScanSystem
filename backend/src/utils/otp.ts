import crypto from "crypto";

export function makeSalt(): string {
  return crypto.randomBytes(16).toString("hex");
}

export function hashOtp(code: string, salt: string): string {
  return crypto.createHash("sha256").update(`${code}:${salt}`).digest("hex");
}

export function constantTimeEqual(a: string, b: string): boolean {
  const A = Buffer.from(a), B = Buffer.from(b);
  if (A.length !== B.length) return false;
  return crypto.timingSafeEqual(A, B);
}