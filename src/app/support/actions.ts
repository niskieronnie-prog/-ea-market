"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";

export async function createTicket(formData: FormData) {
  const user = await requireRole(["customer", "affiliate", "seller", "support", "admin"]);
  if (!rateLimit(`ticket:${user.id}`, 5, 3600_000)) redirect("/support/new?error=Too+many+tickets.+Try+later");
  const p = z.object({ subject: z.string().trim().min(3).max(150), body: z.string().trim().min(1).max(4000) }).safeParse(Object.fromEntries(formData));
  if (!p.success) redirect("/support/new?error=Please+fill+in+subject+and+message");
  const supabase = await supabaseServer();
  const { data: t, error } = await supabase.from("support_tickets").insert({ user_id: user.id, subject: p.data!.subject }).select("id").single();
  if (error || !t) redirect("/support/new?error=Could+not+create+ticket");
  await supabase.from("ticket_messages").insert({ ticket_id: t!.id, author_id: user.id, is_staff: false, body: p.data!.body });
  redirect(`/support/${t!.id}`);
}

export async function replyTicket(formData: FormData) {
  const user = await requireRole(["customer", "affiliate", "seller", "support", "admin"]);
  const p = z.object({ ticket_id: z.string().uuid(), body: z.string().trim().min(1).max(4000) }).safeParse(Object.fromEntries(formData));
  if (!p.success) redirect("/support");
  const staff = user.role === "support" || user.role === "admin";
  const supabase = await supabaseServer();
  await supabase.from("ticket_messages").insert({ ticket_id: p.data!.ticket_id, author_id: user.id, is_staff: staff, body: p.data!.body });
  if (staff) await supabase.from("support_tickets").update({ status: "pending" }).eq("id", p.data!.ticket_id);
  redirect(`/support/${p.data!.ticket_id}`);
}

export async function setTicketStatus(formData: FormData) {
  await requireRole(["support", "admin"]);
  const id = z.string().uuid().parse(formData.get("id"));
  const status = z.enum(["open", "pending", "closed"]).parse(formData.get("status"));
  await (await supabaseServer()).from("support_tickets").update({ status }).eq("id", id);
  redirect(`/support/${id}`);
}
