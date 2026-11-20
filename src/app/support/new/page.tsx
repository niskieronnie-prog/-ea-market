import { requireRole } from "@/lib/auth";
import { createTicket } from "../actions";
export const metadata = { title: "New ticket", robots: { index: false } };

export default async function NewTicket({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireRole(["customer", "affiliate", "seller", "support", "admin"]);
  const { error } = await searchParams;
  return (<div className="card" style={{ maxWidth: 560 }}><h1>New support ticket</h1>
    {error && <p role="alert" className="error">{error}</p>}
    <p className="muted">Don&apos;t include passwords or card numbers.</p>
    <form action={createTicket}>
      <label htmlFor="s">Subject</label><input id="s" name="subject" required minLength={3} maxLength={150} />
      <label htmlFor="b">Message</label><textarea id="b" name="body" rows={5} required maxLength={4000} />
      <p><button className="btn">Submit</button></p></form></div>);
}
