"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

// Every action re-checks admin server-side; the SQL functions check again inside Postgres.
const uuid = z.string().uuid();

export async function moderateProduct(formData: FormData) {
  await requireRole(["admin"]);
  const pid = uuid.parse(formData.get("id"));
  const publish = formData.get("publish") === "true";
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc("moderate_product", { pid, publish });
  if (error) throw new Error("Action failed");
  revalidatePath("/admin");
}

export async function verifyBusiness(formData: FormData) {
  await requireRole(["admin"]);
  const bid = uuid.parse(formData.get("id"));
  const new_status = z.enum(["verified", "rejected"]).parse(formData.get("status"));
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc("set_business_verification", { bid, new_status });
  if (error) throw new Error("Action failed");
  revalidatePath("/admin");
}
