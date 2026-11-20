import Link from "next/link";

export default function Home() {
  return (
    <>
      <section className="hero">
        <h1>Find products. Reach customers. Earn transparently.</h1>
        <p>A marketplace for East Africa where shoppers discover products, businesses publish listings and receive consent-based enquiries, and approved marketers promote with trackable links.</p>
        <p><Link className="btn" href="/products">Browse products</Link>{" "}<Link className="btn secondary" href="/register">Create an account</Link></p>
      </section>
      <section className="grid" aria-label="How it works">
        <div className="card"><h2>Shoppers</h2><p>Search listings, see the source and last-checked time of each price, and contact businesses directly.</p></div>
        <div className="card"><h2>Businesses</h2><p>Register, get verified, list products and receive enquiries from people who agreed to be contacted.</p></div>
        <div className="card"><h2>Marketers</h2><p>Apply for access, get unique links, and track clicks. Commissions come only from verified conversions.</p></div>
      </section>
      <p className="muted">No income or sales are guaranteed. Clicks are not sales.</p>
    </>
  );
}
