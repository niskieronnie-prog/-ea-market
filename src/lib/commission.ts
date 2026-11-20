export type CommissionStatus = "pending" | "approved" | "rejected" | "reversed" | "paid";

const TRANSITIONS: Record<CommissionStatus, CommissionStatus[]> = {
  pending: ["approved", "rejected"],
  approved: ["paid", "reversed"],
  paid: ["reversed"],
  rejected: [],
  reversed: [],
};

export function canTransition(from: CommissionStatus, to: CommissionStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Integer minor units + basis points. No floating point money. Rounds down. */
export function calcCommission(saleMinor: number, rateBps: number): number {
  if (!Number.isInteger(saleMinor) || saleMinor < 0) throw new Error("invalid sale amount");
  if (!Number.isInteger(rateBps) || rateBps < 0 || rateBps > 10000) throw new Error("invalid rate");
  return Math.floor((saleMinor * rateBps) / 10000);
}
