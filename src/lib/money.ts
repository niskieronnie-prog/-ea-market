// Prices are stored as integer minor units. UGX/TZS/RWF have no minor unit in practice.
const ZERO_DECIMAL = ["UGX", "TZS", "RWF", "JPY"];
export const SUPPORTED_CURRENCIES = ["UGX", "KES", "TZS", "RWF", "USD"] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

export function currencyDecimals(currency: string): number {
  return ZERO_DECIMAL.includes(currency) ? 0 : 2;
}

export function formatMoney(minor: number | string, currency: string): string {
  const d = currencyDecimals(currency);
  const value = Number(minor) / 10 ** d;
  return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: d }).format(value);
}
