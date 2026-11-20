import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { signOut } from "@/app/auth/actions";
import CurrencySelect from "./CurrencySelect";
import { getDisplayCurrency } from "@/lib/currency";

export const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || "EA Market Hub";

export default async function Header() {
  const user = await getCurrentUser();
  const currency = await getDisplayCurrency();
  return (
    <header className="site">
      <div className="wrap">
        <Link href="/" className="brand">{BRAND}</Link>
        <nav aria-label="Main">
          <Link href="/products">Products</Link>
          <Link href="/chat">Help chat</Link>
          {user && <Link href="/dashboard">Dashboard</Link>}
          {user && <Link href="/support">Support</Link>}
          {user && <Link href="/notifications">Notifications</Link>}
          {user && <Link href="/account">My data</Link>}
          {user?.role === "admin" && <Link href="/admin">Admin</Link>}
        </nav>
        <CurrencySelect current={currency} />
        {user ? (
          <form action={signOut}><button className="btn secondary">Sign out</button></form>
        ) : (
          <><Link href="/login">Log in</Link><Link className="btn" href="/register">Sign up</Link></>
        )}
      </div>
    </header>
  );
}
