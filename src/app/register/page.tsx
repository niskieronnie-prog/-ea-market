import Link from "next/link";
import { signUp } from "@/app/auth/actions";
export const metadata = { title: "Sign up" };

export default async function Register({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div className="card" style={{ maxWidth: 420, margin: "0 auto" }}>
      <h1>Create account</h1>
      <p className="muted">Everyone starts as a customer. Choose seller or affiliate marketer access from your dashboard to activate it immediately. Seller businesses and listings still require review before going public.</p>
      {error && <p role="alert" className="error">{error}</p>}
      <form action={signUp}>
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
        <label htmlFor="password">Password (10+ characters)</label>
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={10} required />
        <label style={{ fontWeight: 400 }}><input type="checkbox" name="terms" style={{ width: "auto" }} required /> I accept the <Link href="/legal/terms">Terms</Link> and <Link href="/legal/privacy">Privacy Policy</Link>.</label>
        <p><button className="btn">Sign up</button></p>
      </form>
      <p>Already registered? <Link href="/login">Log in</Link></p>
    </div>
  );
}
