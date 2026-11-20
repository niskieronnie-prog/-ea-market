import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/money";
import { setCampaignStatus } from "../campaign-actions";
export const metadata = { title: "Campaigns", robots: { index: false } };

export default async function Campaigns({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const user = await requireRole(["seller"]);
  const { error, message } = await searchParams;
  const supabase = await supabaseServer();
  const { data } = await supabase.from("campaigns").select("id,name,status,objective,commission_bps,budget_minor,spent_minor,currency,businesses!inner(owner_id)").eq("businesses.owner_id", user.id).order("created_at", { ascending: false });
  return (<>
    <h1>Campaigns</h1>
    {message && <p role="status">{message}</p>}{error && <p role="alert" className="error">{error}</p>}
    <p><Link className="btn" href="/dashboard/campaigns/new">New campaign</Link></p>
    {data?.length ? data.map((c) => (
      <div className="card" key={c.id} style={{ marginBottom: 8 }}>
        <strong>{c.name}</strong> <span className="badge">{c.status}</span>
        <p className="muted">{c.objective}, {c.commission_bps / 100}% commission, spent {formatMoney(c.spent_minor, c.currency)} of {formatMoney(c.budget_minor, c.currency)}</p>
        <form action={setCampaignStatus} style={{ display: "flex", gap: 8 }}>
          <input type="hidden" name="id" value={c.id} />
          {c.status !== "active" && c.status !== "ended" && <button className="btn secondary" name="status" value="active">Activate</button>}
          {c.status === "active" && <button className="btn secondary" name="status" value="paused">Pause</button>}
          {c.status !== "ended" && <button className="btn secondary" name="status" value="ended">End</button>}
        </form>
      </div>)) : <p className="muted">No campaigns yet.</p>}
  </>);
}
