import { describe, it, expect } from "vitest";
import { calcCommission, canTransition } from "@/lib/commission";
import { hasRole } from "@/lib/roles";
import { answer } from "@/lib/chatbot";
import { rateLimit } from "@/lib/rateLimit";

describe("commission", () => {
  it("calculates in integer minor units", () => { expect(calcCommission(100000, 250)).toBe(2500); });
  it("rounds down", () => { expect(calcCommission(999, 150)).toBe(14); });
  it("rejects bad input", () => {
    expect(() => calcCommission(-1, 100)).toThrow();
    expect(() => calcCommission(100, 10001)).toThrow();
    expect(() => calcCommission(1.5, 100)).toThrow();
  });
  it("blocks illegal transitions", () => {
    expect(canTransition("pending", "paid")).toBe(false);
    expect(canTransition("rejected", "approved")).toBe(false);
    expect(canTransition("approved", "paid")).toBe(true);
  });
});
describe("roles", () => {
  it("denies by default", () => {
    expect(hasRole(null, ["admin"])).toBe(false);
    expect(hasRole("customer", ["admin"])).toBe(false);
    expect(hasRole("admin", ["admin"])).toBe(true);
  });
});
describe("chatbot", () => {
  it("escalates to a human", () => { expect(answer("I want a human").escalate).toBe(true); });
  it("does not invent products", () => { expect(answer("hello?").reply).toContain("not sure"); });
  it("extracts a search term", () => { expect(answer("find solar lantern").searchTerm).toBe("solar lantern"); });
});
describe("rateLimit", () => {
  it("blocks after max", () => {
    expect(rateLimit("t", 2, 1000)).toBe(true);
    expect(rateLimit("t", 2, 1000)).toBe(true);
    expect(rateLimit("t", 2, 1000)).toBe(false);
  });
});
