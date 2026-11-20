import { requireRole } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { processDeletion } from "./actions";
export const metadata = { title: "Privacy requests", robots: { index: false } };

export default async function Privacy({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireRole(["admin"]);
  const { error } = await searchParams;
  const { data } = await (await supabaseServer()).from("data_requests").select("id,created_at,profiles(email)").eq("status", "pending");
  return (<>
    <h1>Deletion requests</h1>
    <p className="notice">Verify the requester&apos;s identity (e.g. reply from their registered email) BEFORE approving. Approval deletes their login and anonymises their enquiries. Financial and audit records are retained without personal links. Backups are purged on the provider&apos;s schedule.</p>
    {error && <p role="alert" className="error">{error}</p>}
    {data?.length ? data.map((r) => (
      <form key={r.id} action={processDeletion} className="card" style={{ marginBottom: 8 }}>
        <input type="hidden" name="id" value={r.id} />
        {(r.profiles as unknown as { email?: string } | null)?.email} ({new Date(r.created_at).toLocaleDateString("en-GB")}){" "}
        <button className="btn secondary" name="approve" value="true">Approve & delete</button> <button className="btn secondary" name="approve" value="false">Reject</button>
      </form>)) : <p className="muted">No pending requests.</p>}
  </>);
}
