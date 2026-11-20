import { notFound } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { replyTicket, setTicketStatus } from "../actions";
export const metadata = { title: "Ticket", robots: { index: false } };

export default async function Ticket({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(["customer", "affiliate", "seller", "support", "admin"]);
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const supabase = await supabaseServer();
  const { data: t } = await supabase.from("support_tickets").select("id,subject,status,user_id").eq("id", id).single();  // RLS: owner or staff
  if (!t) notFound();
  const staff = user.role === "support" || user.role === "admin";
  if (staff && t.user_id !== user.id) await supabase.rpc("log_sensitive_access", { p_entity: "support_ticket", p_id: id });
  const { data: msgs } = await supabase.from("ticket_messages").select("id,body,is_staff,created_at").eq("ticket_id", id).order("id");
  return (<><h1>{t.subject} <span className="badge">{t.status}</span></h1>
    {msgs?.map((m) => <div key={m.id} className="card" style={{ marginBottom: 8 }}><strong>{m.is_staff ? "Support" : "Customer"}</strong> <span className="muted">{new Date(m.created_at).toLocaleString("en-GB")}</span><p style={{ whiteSpace: "pre-wrap" }}>{m.body}</p></div>)}
    {t.status !== "closed" && <form action={replyTicket} className="card"><input type="hidden" name="ticket_id" value={id} />
      <label htmlFor="r">Reply</label><textarea id="r" name="body" rows={3} required maxLength={4000} /><p><button className="btn">Send</button></p></form>}
    {staff && <form action={setTicketStatus}><input type="hidden" name="id" value={id} />
      <button className="btn secondary" name="status" value="closed">Close</button> <button className="btn secondary" name="status" value="open">Reopen</button></form>}</>);
}
