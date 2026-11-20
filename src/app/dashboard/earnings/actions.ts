"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

export async function requestPayout(formData: FormData) {
  await requireRole(["affiliate"]);
  const p = z.object({ currency: z.enum(["UGX", "KES", "TZS", "RWF", "USD"]), method: z.enum(["mobile_money", "bank_transfer", "manual"]),
    destination: z.string().trim().min(3).max(200) }).safeParse(Object.fromEntries(formData));
  if (!p.success) redirect("/dashboard/earnings?error=" + encodeURIComponent("Check the payout details."));
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc("request_payout", { p_currency: p.data!.currency, p_method: p.data!.method, p_destination: p.data!.destination });
  redirect("/dashboard/earnings?" + (error ? "error=" + encodeURIComponent(error.message.includes("threshold") ? "Approved balance is below the payout threshold." : "Could not request payout.") : "message=Payout+requested"));
}
