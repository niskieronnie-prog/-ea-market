"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

export async function setCommission(formData: FormData) {
  await requireRole(["admin"]);
  const id = z.string().uuid().parse(formData.get("id"));
  const status = z.enum(["approved", "rejected", "reversed"]).parse(formData.get("status"));
  const { error } = await (await supabaseServer()).rpc("set_commission_status", { cid: id, new_status: status });
  if (error) throw new Error("Not allowed");
  revalidatePath("/admin/finance");
}
export async function decidePayout(formData: FormData) {
  await requireRole(["admin"]);
  const id = z.string().uuid().parse(formData.get("id"));
  const status = z.enum(["paid", "rejected"]).parse(formData.get("status"));
  const ref = z.string().trim().max(100).optional().parse(formData.get("reference") || undefined);
  const { error } = await (await supabaseServer()).rpc("decide_payout", { pid: id, new_status: status, ref: ref ?? null });
  if (error) throw new Error("Payout action failed (a payment reference is required to mark paid).");
  revalidatePath("/admin/finance");
}
