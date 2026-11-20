import { amazon } from "./amazon";
import { jumia } from "./jumia";
import { isSupabaseConfigured } from "../supabase/server";
import type { IntegrationStatus } from "./types";
import { aiEnabled } from "../ai";
import { emailConfigured } from "../email";
import { serverRpcKey } from "../serverRpc";

export function allIntegrationStatuses(): IntegrationStatus[] {
  return [
    {
      id: "supabase", name: "Supabase (DB + Auth)",
      state: isSupabaseConfigured() ? "configured" : "setup_required",
      note: isSupabaseConfigured() ? "Environment variables present." : "Set NEXT_PUBLIC_SUPABASE_URL and ANON key.",
    },
    amazon.status(),
    jumia.status(),
    {
      id: "ai", name: "AI chatbot provider (Anthropic)",
      state: process.env.AI_KILL_SWITCH === "true" ? "disabled" : aiEnabled() ? "configured" : "setup_required",
      note: aiEnabled() ? "Enabled with daily spend cap. Rules-based fallback if over budget or on error." : "Rules-based fallback active. Needs AI_PROVIDER_API_KEY, SERVER_RPC_KEY and both token cost rates.",
    },
    { id: "email", name: "Transactional email (Resend)", state: emailConfigured() ? "configured" : "setup_required", note: "Queued emails are sent from the admin page." },
    {
      id: "webhooks", name: "Partner conversion webhooks",
      state: serverRpcKey() && Object.keys(process.env).some((k) => k.startsWith("WEBHOOK_SECRET_")) ? "configured" : "setup_required",
      note: "Needs SERVER_RPC_KEY and a WEBHOOK_SECRET_<PARTNER>. Amazon conversions are not auto-ingested (no webhook found); use Associates reports.",
    },
  ];
}
