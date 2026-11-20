import { describe, it, expect } from "vitest";
import { verifySignature, signPayload } from "@/lib/webhook";
import { convertMinor } from "@/lib/fx";
import { validateMerchantUrl } from "@/lib/merchantUrl";
import { sniffImage, sniffPdf } from "@/lib/imageSniff";
import { parseSearchResponse } from "@/lib/amazon/creators";
import { formatMoney, currencyDecimals } from "@/lib/money";

const SECRET = "s".repeat(40);
const now = 1_800_000_000_000;
const ts = String(Math.floor(now / 1000));
const body = '{"type":"conversion"}';

describe("webhook signature", () => {
  it("accepts a valid signature", () => { expect(verifySignature(body, ts, signPayload(body, ts, SECRET), SECRET, now)).toBe(true); });
  it("rejects a tampered body", () => { expect(verifySignature(body + " ", ts, signPayload(body, ts, SECRET), SECRET, now)).toBe(false); });
  it("rejects a wrong secret", () => { expect(verifySignature(body, ts, signPayload(body, ts, "x".repeat(40)), SECRET, now)).toBe(false); });
  it("rejects replayed (stale) timestamps", () => { expect(verifySignature(body, ts, signPayload(body, ts, SECRET), SECRET, now + 10 * 60_000)).toBe(false); });
  it("rejects malformed input", () => {
    expect(verifySignature(body, "abc", "zz", SECRET, now)).toBe(false);
    expect(verifySignature(body, ts, "", SECRET, now)).toBe(false);
  });
});
describe("fx conversion", () => {
  const rates = { USD: 1, UGX: 3700, KES: 130 };
  it("converts zero-decimal to two-decimal currencies", () => { expect(convertMinor(370000, "UGX", "KES", rates)).toBe(1300000); });
  it("same currency is unchanged", () => { expect(convertMinor(500, "UGX", "UGX", rates)).toBe(500); });
  it("returns null instead of guessing a missing rate", () => { expect(convertMinor(500, "UGX", "RWF", rates)).toBeNull(); });
});
describe("merchant URL allow-list", () => {
  it("accepts real merchant hosts", () => {
    expect(validateMerchantUrl("jumia", "https://www.jumia.ug/some-item.html")).not.toBeNull();
    expect(validateMerchantUrl("amazon", "https://www.amazon.com/dp/B000000000?tag=x-20")).not.toBeNull();
  });
  it("rejects look-alikes, http and credentials", () => {
    expect(validateMerchantUrl("jumia", "https://jumia.evil.com/x")).toBeNull();
    expect(validateMerchantUrl("jumia", "https://notjumia.ug/x")).toBeNull();
    expect(validateMerchantUrl("amazon", "http://www.amazon.com/dp/x")).toBeNull();
    expect(validateMerchantUrl("amazon", "https://user:pw@www.amazon.com/")).toBeNull();
    expect(validateMerchantUrl("amazon", "javascript:alert(1)")).toBeNull();
  });
});
describe("file sniffing", () => {
  it("detects real images", () => {
    expect(sniffImage(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("jpeg");
    expect(sniffImage(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("png");
  });
  it("rejects scripts renamed to images", () => { expect(sniffImage(new TextEncoder().encode("<script>alert(1)</script>"))).toBeNull(); });
  it("detects pdf", () => { expect(sniffPdf(new TextEncoder().encode("%PDF-1.7"))).toBe(true); });
});
describe("amazon response parsing", () => {
  it("skips items missing required fields and never invents prices", () => {
    const out = parseSearchResponse({ searchResult: { items: [
      { asin: "A1", itemInfo: { title: { displayValue: "Thing" } }, detailPageURL: "https://www.amazon.com/dp/A1" },
      { asin: "A2", itemInfo: { title: { displayValue: "No url" } } },
      { asin: "A3", itemInfo: { title: { displayValue: "Bad url" } }, detailPageURL: "http://x" },
    ] } });
    expect(out).toHaveLength(1);
    expect(out[0].priceMinor).toBeUndefined();
  });
  it("handles garbage", () => { expect(parseSearchResponse(null)).toEqual([]); });
});
describe("money", () => {
  it("decimals", () => { expect(currencyDecimals("UGX")).toBe(0); expect(currencyDecimals("KES")).toBe(2); });
  it("formats", () => { expect(formatMoney(150000, "KES")).toContain("1,500"); });
});
