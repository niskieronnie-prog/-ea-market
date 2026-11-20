import { createClient } from "@supabase/supabase-js";

// SERVER_RPC_KEY lets trusted server code call a few narrowly-scoped SQL functions
// (webhook ingestion, FX update, AI usage). It is NOT a Supabase key and never reaches the browser.
export function serverRpcKey(): string | null {
  const k = process.env.SERVER_RPC_KEY;
  return k && k.length >= 32 ? k : null;
}

export function anonClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
