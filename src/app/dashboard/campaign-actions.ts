"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { currencyDecimals } from "@/lib/money";

const campaignSchema = z.object({
  business_id: z.string().uuid(), product_id: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  objective: z.enum(["awareness", "leads", "sales"]),
  target_country: z.enum(["UG", "KE", "TZ", "RW"]),
  audience_note: z.string().trim().max(500).optional(),
  commission_pct: z.coerce.number().min(0).max(100),
  budget: z.coerce.number().int().min(0).max(1_000_000_000),
  currency: z.enum(["UGX", "KES", "TZS", "RWF", "USD"]),
  attribution_days: z.coerce.number().int().min(1).max(90),
});

export async function createCampaign(formData: FormData) {
  await requireRole(["seller"]);
  const p = campaignSchema.safeParse(Object.fromEntries(formData));
  if (!p.success) redirect("/dashboard/campaigns?error=" + encodeURIComponent("Please check the campaign details."));
  const { commission_pct, budget, ...rest } = p.data!;
  const supabase = await supabaseServer();
  const { error } = await supabase.from("campaigns").insert({ ...rest, commission_bps: Math.round(commission_pct * 100), budget_minor: budget * 10 ** currencyDecimals(rest.currency) });
  if (error) redirect("/dashboard/campaigns?error=" + encodeURIComponent("Could not create campaign (is the product yours?)."));
  redirect("/dashboard/campaigns?message=" + encodeURIComponent("Campaign saved as draft. Activate it once your business is verified."));
}

export async function setCampaignStatus(formData: FormData) {
  await requireRole(["seller", "admin"]);
  const id = z.string().uuid().parse(formData.get("id"));
  const status = z.enum(["active", "paused", "ended"]).parse(formData.get("status"));
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc("set_campaign_status", { cid: id, new_status: status });
  if (error) redirect("/dashboard/campaigns?error=" + encodeURIComponent(error.message.includes("verified") ? "Your business must be verified first." : "Status change not allowed."));
  revalidatePath("/dashboard/campaigns");
}
