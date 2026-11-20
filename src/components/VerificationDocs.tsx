import { supabaseServer } from "@/lib/supabase/server";

// Admin-only (storage RLS enforces it). Short-lived signed links; each view is written to the audit log.
export default async function VerificationDocs({ ownerId, businessId }: { ownerId: string; businessId: string }) {
  const supabase = await supabaseServer();
  const { data: files } = await supabase.storage.from("verification-docs").list(ownerId, { limit: 10 });
  if (!files?.length) return <p className="muted">No documents uploaded.</p>;
  await supabase.rpc("log_sensitive_access", { p_entity: "verification_docs", p_id: businessId });
  const links = await Promise.all(files.map(async (f) => ({ name: f.name, url: (await supabase.storage.from("verification-docs").createSignedUrl(`${ownerId}/${f.name}`, 300)).data?.signedUrl })));
  return <ul>{links.map((l) => l.url && <li key={l.name}><a href={l.url} target="_blank" rel="noopener noreferrer">Document {l.name.slice(0, 8)} (link expires in 5 min)</a></li>)}</ul>;
}
