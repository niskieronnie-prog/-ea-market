"use server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { sendEmail, emailConfigured } from "@/lib/email";
import { fetchUsdRates } from "@/lib/fx";
import { anonClient, serverRpcKey } from "@/lib/serverRpc";

export async function sendQueuedEmails() {
  await requireRole(["admin"]);
  if (!emailConfigured()) return;
  const supabase = await supabaseServer();
  const { data } = await supabase.rpc("admin_claim_outbox");
  for (const m of (data ?? []) as { id: number; to_email: string; subject: string; body: string }[]) {
    const ok = await sendEmail(m.to_email, m.subject, m.body);
    await supabase.rpc("admin_mark_outbox", { oid: m.id, new_status: ok ? "sent" : "failed" });
  }
  revalidatePath("/admin");
}

export async function refreshRates() {
  await requireRole(["admin"]);
  const key = serverRpcKey(); if (!key) return;
  try { await anonClient().rpc("fx_upsert", { p_key: key, p_rates: await fetchUsdRates(), p_source: "open.er-api.com" }); } catch { /* shown via stale timestamp */ }
  revalidatePath("/admin");
}
