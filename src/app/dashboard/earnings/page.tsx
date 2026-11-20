import { requireRole } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/money";
import { requestPayout } from "./actions";
export const metadata = { title: "Earnings", robots: { index: false } };

export default async function Earnings({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const user = await requireRole(["affiliate"]);
  const { error, message } = await searchParams;
  const supabase = await supabaseServer();
  const [{ data: comms }, { data: pays }, { count: clicks }] = await Promise.all([
    supabase.from("commissions").select("id,amount_minor,currency,status,updated_at").eq("affiliate_id", user.id).order("updated_at", { ascending: false }).limit(50),
    supabase.from("payouts").select("id,amount_minor,currency,status,reference,created_at").eq("affiliate_id", user.id).order("created_at", { ascending: false }),
    supabase.from("click_events").select("id", { count: "exact", head: true }),
  ]);
  return (<>
    <h1>Earnings</h1>
    {message && <p role="status">{message}</p>}{error && <p role="alert" className="error">{error}</p>}
    <p className="muted">{clicks ?? 0} clicks on your links. Clicks are not sales: only verified conversions create commissions, and an administrator approves them.</p>
    <h2>Commissions</h2>
    {comms?.length ? <ul>{comms.map((c) => <li key={c.id}>{formatMoney(c.amount_minor, c.currency)} <span className="badge">{c.status}</span></li>)}</ul> : <p className="muted">None yet.</p>}
    <h2>Request payout</h2>
    <form action={requestPayout} className="card">
      <p className="muted">Pays out your <strong>approved</strong> balance in one currency. Never enter card details: use a phone number for mobile money or bank details your payer asked for.</p>
      <label htmlFor="cur">Currency</label><select id="cur" name="currency"><option>UGX</option><option>KES</option><option>TZS</option><option>RWF</option><option>USD</option></select>
      <label htmlFor="m">Method</label><select id="m" name="method"><option value="mobile_money">Mobile money</option><option value="bank_transfer">Bank transfer</option><option value="manual">Other (manual)</option></select>
      <label htmlFor="d">Destination</label><input id="d" name="destination" required minLength={3} maxLength={200} />
      <p><button className="btn">Request payout</button></p>
    </form>
    <h2>Payout history</h2>
    {pays?.length ? <ul>{pays.map((p) => <li key={p.id}>{formatMoney(p.amount_minor, p.currency)} <span className="badge">{p.status}</span> {p.reference && <>ref {p.reference}</>}</li>)}</ul> : <p className="muted">None yet.</p>}
  </>);
}
