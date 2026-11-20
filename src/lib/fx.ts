import { currencyDecimals } from "./money";

export type Rates = Record<string, number>; // units of currency per 1 USD

/** Indicative conversion only. Returns null when a rate is missing (never guesses). */
export function convertMinor(amountMinor: number, from: string, to: string, rates: Rates): number | null {
  if (from === to) return amountMinor;
  const rf = rates[from], rt = rates[to];
  if (!rf || !rt) return null;
  const major = amountMinor / 10 ** currencyDecimals(from);
  return Math.round((major / rf) * rt * 10 ** currencyDecimals(to));
}

// ExchangeRate-API open access endpoint (no key, daily updates, attribution REQUIRED, throttled).
export async function fetchUsdRates(): Promise<Rates> {
  const res = await fetch("https://open.er-api.com/v6/latest/USD", { signal: AbortSignal.timeout(10_000), cache: "no-store" });
  if (!res.ok) throw new Error("rate provider error");
  const json = await res.json();
  const rates = json?.rates ?? json?.conversion_rates;
  if (json?.result !== "success" || !rates || typeof rates !== "object") throw new Error("unexpected rate response");
  return rates as Rates;
}
