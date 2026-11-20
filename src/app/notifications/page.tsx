import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
export const metadata = { title: "Notifications", robots: { index: false } };

async function markAllRead() {
  "use server";
  const user = await requireRole(["customer", "affiliate", "seller", "support", "admin"]);
  await (await supabaseServer()).from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
  revalidatePath("/notifications");
}

export default async function Notifications() {
  const user = await requireRole(["customer", "affiliate", "seller", "support", "admin"]);
  const { data } = await (await supabaseServer()).from("notifications").select("id,title,body,is_read,created_at").eq("user_id", user.id).order("id", { ascending: false }).limit(50);
  return (<><h1>Notifications</h1>
    <form action={markAllRead}><button className="btn secondary">Mark all read</button></form>
    {data?.length ? <ul>{data.map((n) => <li key={n.id} style={{ fontWeight: n.is_read ? 400 : 700 }}>{n.title}: {n.body} <span className="muted">{new Date(n.created_at).toLocaleString("en-GB")}</span></li>)}</ul> : <p className="muted">Nothing yet.</p>}</>);
}
