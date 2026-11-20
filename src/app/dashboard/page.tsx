import { requireRole } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/money";
import Link from "next/link";
import { ProductImageUploader, VerificationUploader } from "@/components/Uploaders";
import { activateRole, createBusiness, createProduct, createAffiliateLink } from "./actions";
export const metadata = { title: "Dashboard", robots: { index: false } };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const user = await requireRole(["customer", "affiliate", "seller", "support", "admin"]);
  const { error, message } = await searchParams;
  const supabase = await supabaseServer();

  return (
    <>
      <h1>Dashboard</h1>
      <p>Signed in as <strong>{user.email}</strong> <span className="badge">{user.role}</span></p>
      {message && <p role="status">{message}</p>}
      {error && <p role="alert" className="error">{error}</p>}

      {user.role === "customer" && <CustomerPanel />}
      {user.role === "seller" && await SellerPanel()}
      {user.role === "affiliate" && await AffiliatePanel()}
      {user.role === "seller" && <p><Link href="/dashboard/campaigns">Manage campaigns</Link></p>}
      {user.role === "affiliate" && <p><Link href="/dashboard/earnings">Earnings & payouts</Link></p>}
      {user.role === "support" && <div className="card"><h2>Support</h2><p><Link href="/support">Open the support queue</Link></p></div>}
    </>
  );

  function CustomerPanel() {
    return (
      <div className="card">
        <h2>Become a seller or affiliate marketer</h2>
        <p className="muted">Access activates immediately. Seller businesses and product listings still require review before they appear publicly.</p>
        <form action={activateRole}>
          <label htmlFor="role">I want to be a</label>
          <select id="role" name="role"><option value="affiliate">Affiliate marketer</option><option value="seller">Seller / business</option></select>
          <p><button className="btn">Activate access</button></p>
        </form>
      </div>
    );
  }

  async function SellerPanel() {
    const { data: biz } = await supabase.from("businesses").select("id,name,verification_status").eq("owner_id", user.id);
    const { data: myProducts } = await supabase.from("products").select("id,title,status,image_path,businesses!inner(owner_id)").eq("businesses.owner_id", user.id);
    const { data: leads } = await supabase.from("leads").select("id,name,email,message,status,created_at").order("created_at", { ascending: false }).limit(20);
    return (
      <>
        <div className="card">
          <h2>Your businesses</h2>
          {biz?.length ? <ul>{biz.map((b) => <li key={b.id}>{b.name} <span className="badge">{b.verification_status}</span>
            {b.verification_status !== "verified" && <VerificationUploader userId={user.id} businessId={b.id} />}</li>)}</ul> : <p className="muted">None yet.</p>}
          <form action={createBusiness}>
            <label htmlFor="bn">Business name</label><input id="bn" name="name" required minLength={2} maxLength={120} />
            <label htmlFor="bc">Country</label>
            <select id="bc" name="country"><option value="UG">Uganda</option><option value="KE">Kenya</option><option value="TZ">Tanzania</option><option value="RW">Rwanda</option></select>
            <p><button className="btn">Create business</button></p>
          </form>
        </div>
        {biz?.length ? (
          <div className="card" style={{ marginTop: 16 }}>
            <h2>Add a product</h2>
            <form action={createProduct}>
              <label htmlFor="pb">Business</label>
              <select id="pb" name="business_id">{biz.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
              <label htmlFor="pt">Title</label><input id="pt" name="title" required />
              <label htmlFor="pd">Description</label><textarea id="pd" name="description" rows={3} />
              <label htmlFor="pc">Category</label><input id="pc" name="category" />
              <label htmlFor="pp">Price (whole units, e.g. 45000)</label><input id="pp" name="price" type="number" min={0} required />
              <label htmlFor="pcur">Currency</label>
              <select id="pcur" name="currency"><option>UGX</option><option>KES</option><option>TZS</option><option>RWF</option><option>USD</option></select>
              <p><button className="btn">Submit for review</button></p>
            </form>
          </div>
        ) : null}
        <div className="card" style={{ marginTop: 16 }}>
          <h2>Your products</h2>
          {myProducts?.length ? myProducts.map((pr) => (<div key={pr.id} style={{ marginBottom: 12 }}><strong>{pr.title}</strong> <span className="badge">{pr.status}</span>
            <ProductImageUploader userId={user.id} productId={pr.id} hasImage={!!pr.image_path} /></div>)) : <p className="muted">No products yet.</p>}
        </div>
        <div className="card" style={{ marginTop: 16 }}>
          <h2>Recent enquiries</h2>
          {leads?.length ? <ul>{leads.map((l) => <li key={l.id}>{l.name} ({l.email}) <span className="badge">{l.status}</span><br />{l.message}</li>)}</ul> : <p className="muted">No enquiries yet.</p>}
        </div>
      </>
    );
  }

  async function AffiliatePanel() {
    const { data: links } = await supabase.from("affiliate_links").select("code,product_id,products(title)").eq("affiliate_id", user.id);
    const { data: camps } = await supabase.from("campaigns").select("id,name,product_id,commission_bps").eq("status", "active");
    const { data: products } = await supabase.from("products").select("id,title,price_minor,currency").eq("status", "published").not("external_url", "is", null).limit(50);
    const site = process.env.NEXT_PUBLIC_SITE_URL || "";
    return (
      <>
        <div className="card">
          <h2>Your links</h2>
          {links?.length ? <ul>{links.map((l) => <li key={l.code}><code>{site}/go/{l.code}</code></li>)}</ul> : <p className="muted">No links yet.</p>}
          <p className="muted">Clicks are tracked. Commissions are only created from verified conversions and approved by an administrator.</p>
        </div>
        <div className="card" style={{ marginTop: 16 }}>
          <h2>Products you can promote</h2>
          {products?.length ? products.map((p) => (
            <form key={p.id} action={createAffiliateLink} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <input type="hidden" name="product_id" value={p.id} />
              <span style={{ flex: 1 }}>{p.title} ({formatMoney(p.price_minor, p.currency)})</span>
              <select name="campaign_id" aria-label="Campaign" style={{ width: "auto" }}><option value="">No campaign (no commission)</option>{camps?.filter((c) => c.product_id === p.id).map((c) => <option key={c.id} value={c.id}>{c.name} ({c.commission_bps / 100}%)</option>)}</select>
              <button className="btn secondary">Get link</button>
            </form>
          )) : <p className="muted">No promotable products yet.</p>}
        </div>
      </>
    );
  }
}
