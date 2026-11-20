"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

export async function processDeletion(formData: FormData) {
  await requireRole(["admin"]);
  const id = z.string().uuid().parse(formData.get("id"));
  const approve = formData.get("approve") === "true";
  const { error } = await (await supabaseServer()).rpc("process_deletion", { req_id: id, approve });
  if (error) redirect("/admin/privacy?error=" + encodeURIComponent(error.message.slice(0, 120)));
  revalidatePath("/admin/privacy");
}
