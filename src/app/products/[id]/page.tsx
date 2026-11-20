import { notFound } from "next/navigation";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/money";
import { getDisplayCurrency, getRates, indicative } from "@/lib/currency";
import { submitLead } from "./actions";

export default async function ProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; message?: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const { error, message } = await searchParams;
  const supabase = await supabaseServer();
  const { data: p } = await supabase.from("products")
    .select("id,title,description,price_minor,currency,source,stock_status,price_checked_at,business_id,image_path,external_url,businesses(name)")
    .eq("id", id).eq("status", "published").single();
  if (!p) notFound();
  const cur = await getDisplayCurrency();
  const { rates, asOf } = await getRates();
  const approx = indicative(p.price_minor, p.currency, cur, rates);
  const seller = (p.businesses as unknown as { name?: string } | null)?.name;

  return (
    <>
      <h1>{p.title}</h1>
      {p.image_path && <img src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${p.image_path}`} alt={p.title} style={{ maxWidth: "100%", maxHeight: 360, borderRadius: 8 }} />}
      <p><strong>{formatMoney(p.price_minor, p.currency)}</strong>{approx && <span className="muted"> {approx} (indicative, rates {asOf?.toLocaleDateString("en-GB")})</span>} <span className="badge">{p.source === "seller" ? "Sold directly by a participating business" : "Affiliate offer"}</span></p>
      <p className="muted">Price recorded {new Date(p.price_checked_at).toLocaleString("en-GB")}. Stock: {p.stock_status.replace("_", " ")}. Final price, shipping and taxes are confirmed by the seller/merchant.</p>
      {p.source !== "seller" && <p className="notice">Affiliate disclosure: we may earn a commission if you buy through links on this page, at no extra cost to you.</p>}
      <p>{p.description}</p>
      {p.source !== "seller" && p.external_url && <p><a className="btn" href={p.external_url} rel="sponsored noopener nofollow" target="_blank">View at {p.source === "amazon" ? "Amazon" : "Jumia"} (affiliate link)</a></p>}
      {p.business_id && (
        <section className="card" aria-labelledby="enq">
          <h2 id="enq">Ask {seller ?? "the seller"} a question</h2>
          {message && <p role="status">{message}</p>}
          {error && <p role="alert" className="error">{error}</p>}
          <form action={submitLead}>
            <input type="hidden" name="product_id" value={p.id} />
            <label htmlFor="n">Your name</label><input id="n" name="name" required maxLength={120} />
            <label htmlFor="e">Email</label><input id="e" name="email" type="email" required />
            <label htmlFor="m">Message</label><textarea id="m" name="message" rows={3} maxLength={2000} />
            <label style={{ fontWeight: 400 }}><input type="checkbox" name="consent" style={{ width: "auto" }} required /> I agree that my name, email and message are shared with {seller ?? "this business"} so they can reply to me.</label>
            <p><button className="btn">Send enquiry</button></p>
          </form>
        </section>
      )}
    </>
  );
}
