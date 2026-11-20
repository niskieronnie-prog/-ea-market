import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
export const metadata = { title: "Support", robots: { index: false } };

export default async function Support() {
  const user = await requireRole(["customer", "affiliate", "seller", "support", "admin"]);
  const staff = user.role === "support" || user.role === "admin";
  const { data } = await (await supabaseServer()).from("support_tickets").select("id,subject,status,created_at").order("created_at", { ascending: false }).limit(50);
  return (<><h1>{staff ? "Support queue" : "Your support tickets"}</h1>
    <p><Link className="btn" href="/support/new">New ticket</Link></p>
    {data?.length ? <ul>{data.map((t) => <li key={t.id}><Link href={`/support/${t.id}`}>{t.subject}</Link> <span className="badge">{t.status}</span></li>)}</ul> : <p className="muted">No tickets.</p>}</>);
}
