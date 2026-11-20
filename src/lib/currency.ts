import { cookies } from "next/headers";
import { supabaseServer } from "./supabase/server";
import { convertMinor, type Rates } from "./fx";
import { formatMoney, SUPPORTED_CURRENCIES } from "./money";

export async function getDisplayCurrency(): Promise<string> {
  const c = (await cookies()).get("currency")?.value;
  return c && (SUPPORTED_CURRENCIES as readonly string[]).includes(c) ? c : "UGX";
}

export async function getRates(): Promise<{ rates: Rates; asOf: Date | null }> {
  const supabase = await supabaseServer();
  const { data } = await supabase.from("exchange_rates").select("quote,rate,fetched_at").eq("base", "USD");
  const rates: Rates = { USD: 1 };
  let asOf: Date | null = null;
  for (const r of data ?? []) {
    rates[r.quote] = Number(r.rate);
    const d = new Date(r.fetched_at);
    if (!asOf || d < asOf) asOf = d;
  }
  return { rates, asOf };
}

/** "≈ UGX 4,500" text, or null if no rate is stored. Always labelled indicative in the UI. */
export function indicative(minor: number | string, from: string, to: string, rates: Rates): string | null {
  if (from === to) return null;
  const v = convertMinor(Number(minor), from, to, rates);
  return v === null ? null : `≈ ${formatMoney(v, to)}`;
}
