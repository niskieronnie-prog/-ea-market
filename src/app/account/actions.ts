"use server";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";

export async function requestDeletion() {
  const user = await requireRole(["customer", "affiliate", "seller"]);
  const { error } = await (await supabaseServer()).from("data_requests").insert({ user_id: user.id, kind: "delete" });
  redirect("/account?" + (error ? "error=You+already+have+a+pending+request" : "message=Request+received.+We+will+verify+your+identity+by+email+before+deleting."));
}
