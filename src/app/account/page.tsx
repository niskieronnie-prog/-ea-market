import { requireRole } from "@/lib/auth";
import { requestDeletion } from "./actions";
export const metadata = { title: "My data", robots: { index: false } };

export default async function Account({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const user = await requireRole(["customer", "affiliate", "seller", "support", "admin"]);
  const { error, message } = await searchParams;
  return (<><h1>My data</h1>
    {message && <p role="status">{message}</p>}{error && <p role="alert" className="error">{error}</p>}
    <div className="card"><h2>Download my data</h2><p>A JSON file with your profile, enquiries, tickets, links and commissions.</p>
      <a className="btn secondary" href="/account/export">Download JSON</a></div>
    {user.role !== "support" && user.role !== "admin" && (
      <div className="card" style={{ marginTop: 16 }}><h2>Delete my account</h2>
        <p>An administrator verifies your identity first. If you own a business or have unpaid commissions, those must be settled first. Financial and audit records may be retained without personal links where the law requires, and backups are purged on the provider&apos;s schedule, so deletion isn&apos;t instant or absolute.</p>
        <form action={requestDeletion}><button className="btn secondary">Request deletion</button></form></div>)}</>);
}
