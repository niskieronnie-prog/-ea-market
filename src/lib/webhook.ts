import { createHmac, timingSafeEqual } from "crypto";

/** Signature = hex HMAC-SHA256 of `${timestamp}.${rawBody}` using the shared secret.
 *  Rejects stale timestamps (replay window) and compares in constant time. */
export function verifySignature(rawBody: string, timestamp: string, signature: string, secret: string,
  nowMs: number = Date.now(), toleranceSec = 300): boolean {
  if (!/^\d{9,12}$/.test(timestamp)) return false;
  if (Math.abs(nowMs / 1000 - Number(timestamp)) > toleranceSec) return false;
  if (!/^[a-f0-9]{64}$/.test(signature)) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest();
  return timingSafeEqual(expected, Buffer.from(signature, "hex"));
}

export function signPayload(rawBody: string, timestamp: string, secret: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
}
