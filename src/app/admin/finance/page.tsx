import { requireRole } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/money";
import { setCommission, decidePayout } from "./actions";
export const metadata = { title: "Finance", robots: { index: false } };

export default async function Finance() {
  await requireRole(["admin"]);
  const supabase = await supabaseServer();
  const [{ data: pending }, { data: payouts }, { data: audit }] = await Promise.all([
    supabase.from("commissions").select("id,amount_minor,currency,status,rate_bps,payout_id").in("status", ["pending", "approved"]).order("updated_at"),
    supabase.from("payouts").select("id,amount_minor,currency,method,destination,status").eq("status", "requested"),
    supabase.from("audit_log").select("id,action,entity,created_at").order("id", { ascending: false }).limit(15),
  ]);
  return (<>
    <h1>Finance</h1>
    <h2>Commissions awaiting action</h2>
    {pending?.length ? pending.map((c) => (
      <form key={c.id} action={setCommission} className="card" style={{ marginBottom: 8 }}>
        <input type="hidden" name="id" value={c.id} />
        {formatMoney(c.amount_minor, c.currency)} at {c.rate_bps / 100}% <span className="badge">{c.status}</span>{" "}
        {c.status === "pending" && <><button className="btn secondary" name="status" value="approved">Approve</button> <button className="btn secondary" name="status" value="rejected">Reject</button></>}
        {c.status === "approved" && <button className="btn secondary" name="status" value="reversed">Reverse</button>}
      </form>)) : <p className="muted">Nothing pending.</p>}
    <h2>Payout requests (manual workflow)</h2>
    <p className="muted">Pay the person outside this app (e.g. mobile money), then enter the payment reference and mark as paid. The app never moves money.</p>
    {payouts?.length ? payouts.map((p) => (
      <form key={p.id} action={decidePayout} className="card" style={{ marginBottom: 8 }}>
        <input type="hidden" name="id" value={p.id} />
        <strong>{formatMoney(p.amount_minor, p.currency)}</strong> via {p.method.replace("_", " ")} to <code>{p.destination}</code>
        <label htmlFor={`r${p.id}`}>Payment reference</label><input id={`r${p.id}`} name="reference" maxLength={100} />
        <p><button className="btn secondary" name="status" value="paid">Mark paid</button> <button className="btn secondary" name="status" value="rejected">Reject</button></p>
      </form>)) : <p className="muted">No requests.</p>}
    <h2>Recent audit log</h2>
    <ul>{audit?.map((a) => <li key={a.id}>{new Date(a.created_at).toLocaleString("en-GB")}: {a.action} ({a.entity})</li>)}</ul>
  </>);
}
