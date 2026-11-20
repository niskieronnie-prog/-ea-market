import { requireRole } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { allIntegrationStatuses } from "@/lib/providers";
import Link from "next/link";
import VerificationDocs from "@/components/VerificationDocs";
import { decideRole, moderateProduct, verifyBusiness } from "./actions";
import { sendQueuedEmails, refreshRates } from "./ops-actions";
import { emailConfigured } from "@/lib/email";
export const metadata = { title: "Admin", robots: { index: false } };

export default async function Admin() {
  await requireRole(["admin"]);
  const supabase = await supabaseServer();
  const [{ data: reqs }, { data: prods }, { data: biz }, users, prodCount, clicks] = await Promise.all([
    supabase.from("role_requests").select("id,requested_role,status,profiles(email)").eq("status", "pending"),
    supabase.from("products").select("id,title,price_minor,currency").eq("status", "pending"),
    supabase.from("businesses").select("id,name,owner_id,verification_status").neq("verification_status", "verified"),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("click_events").select("id", { count: "exact", head: true }),
  ]);
  const Btn = ({ name, value, label }: { name: string; value: string; label: string }) => (
    <button className="btn secondary" name={name} value={value}>{label}</button>
  );
  return (
    <>
      <h1>Administration</h1>
      <p><Link href="/admin/finance">Finance</Link> · <Link href="/admin/import">Import products</Link> · <Link href="/admin/privacy">Privacy requests</Link> · <Link href="/support">Support queue</Link></p>
      <div className="grid">
        <div className="card"><strong>{users.count ?? 0}</strong><br />Registered users</div>
        <div className="card"><strong>{prodCount.count ?? 0}</strong><br />Published products</div>
        <div className="card"><strong>{clicks.count ?? 0}</strong><br />Recorded clicks</div>
      </div>
      <p className="muted">Counts come from the live database and include any test data.</p>

      <h2>Role requests</h2>
      {reqs?.length ? reqs.map((r) => (
        <form key={r.id} action={decideRole} className="card" style={{ marginBottom: 8 }}>
          <input type="hidden" name="id" value={r.id} />
          {(r.profiles as unknown as { email?: string } | null)?.email} wants <strong>{r.requested_role}</strong>{" "}
          <Btn name="approve" value="true" label="Approve" /> <Btn name="approve" value="false" label="Reject" />
        </form>
      )) : <p className="muted">None pending.</p>}

      <h2>Businesses awaiting verification</h2>
      {biz?.length ? biz.map((b) => (
        <form key={b.id} action={verifyBusiness} className="card" style={{ marginBottom: 8 }}>
          <input type="hidden" name="id" value={b.id} />{b.name} <span className="badge">{b.verification_status}</span>{" "}
          <Btn name="status" value="verified" label="Verify" /> <Btn name="status" value="rejected" label="Reject" />
          <VerificationDocs ownerId={b.owner_id} businessId={b.id} />
        </form>
      )) : <p className="muted">None.</p>}

      <h2>Products awaiting moderation</h2>
      {prods?.length ? prods.map((p) => (
        <form key={p.id} action={moderateProduct} className="card" style={{ marginBottom: 8 }}>
          <input type="hidden" name="id" value={p.id} />{p.title}{" "}
          <Btn name="publish" value="true" label="Publish" /> <Btn name="publish" value="false" label="Reject" />
        </form>
      )) : <p className="muted">None.</p>}

      <h2>Operations</h2>
      <form action={refreshRates} style={{ display: "inline" }}><button className="btn secondary">Refresh exchange rates</button></form>{" "}
      <form action={sendQueuedEmails} style={{ display: "inline" }}><button className="btn secondary" disabled={!emailConfigured()}>Send queued emails</button></form>
      {!emailConfigured() && <p className="muted">Email not configured (RESEND_API_KEY, EMAIL_FROM).</p>}

      <h2>Integration status</h2>
      <div className="grid">
        {allIntegrationStatuses().map((s) => (
          <div className="card" key={s.id}><strong>{s.name}</strong> <span className="badge">{s.state.replace("_", " ")}</span><p className="muted">{s.note}</p></div>
        ))}
      </div>
    </>
  );
}
