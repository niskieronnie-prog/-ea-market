import Link from "next/link";
import { signIn } from "@/app/auth/actions";
export const metadata = { title: "Log in" };

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const { error, message } = await searchParams;
  return (
    <div className="card" style={{ maxWidth: 420, margin: "0 auto" }}>
      <h1>Log in</h1>
      {message && <p role="status">{message}</p>}
      {error && <p role="alert" className="error">{error}</p>}
      <form action={signIn}>
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
        <p><button className="btn">Log in</button></p>
      </form>
      <p>No account? <Link href="/register">Sign up</Link></p>
    </div>
  );
}
