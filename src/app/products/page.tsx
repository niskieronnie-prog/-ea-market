import Link from "next/link";
import { supabaseServer, isSupabaseConfigured } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/money";
import { getDisplayCurrency, getRates, indicative } from "@/lib/currency";
export const metadata = { title: "Products", description: "Browse published product listings." };

export default async function Products({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  if (!isSupabaseConfigured()) return null;
  const { q = "", page = "1" } = await searchParams;
  const pageNum = Math.max(1, parseInt(page) || 1);
  const size = 12;
  const supabase = await supabaseServer();
  const cur = await getDisplayCurrency();
  const { rates, asOf } = await getRates();
  let query = supabase.from("products").select("id,title,price_minor,currency,source,stock_status,price_checked_at,category,image_path", { count: "exact" })
    .eq("status", "published").order("created_at", { ascending: false }).range((pageNum - 1) * size, pageNum * size - 1);
  const term = q.replace(/[%_,()]/g, " ").trim().slice(0, 60);
  if (term) query = query.ilike("title", `%${term}%`);
  const { data, count } = await query;
  const pages = Math.ceil((count ?? 0) / size);

  return (
    <>
      <h1>Products</h1>
      <form role="search" style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <label htmlFor="q" style={{ position: "absolute", left: -999 }}>Search products</label>
        <input id="q" name="q" defaultValue={term} placeholder="Search products" />
        <button className="btn">Search</button>
      </form>
      {data?.length ? (
        <div className="grid">
          {data.map((p) => (
            <article className="card" key={p.id}>
              <h2 style={{ fontSize: "1.1rem" }}><Link href={`/products/${p.id}`}>{p.title}</Link></h2>
              {p.image_path && <img src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${p.image_path}`} alt={p.title} loading="lazy" style={{ width: "100%", height: 160, objectFit: "cover", borderRadius: 8 }} />}
              <p><strong>{formatMoney(p.price_minor, p.currency)}</strong>{indicative(p.price_minor, p.currency, cur, rates) && <span className="muted"> {indicative(p.price_minor, p.currency, cur, rates)} (indicative{asOf ? `, rates ${asOf.toLocaleDateString("en-GB")}` : ""})</span>}</p>
              <p className="muted">
                <span className="badge">{p.source === "seller" ? "Sold by a participating business" : "Affiliate offer"}</span>{" "}
                Price recorded {new Date(p.price_checked_at).toLocaleDateString("en-GB")}. Confirm final price at checkout.
              </p>
            </article>
          ))}
        </div>
      ) : <p className="muted">No published products yet{term ? ` matching "${term}"` : ""}. In development you can run supabase/seed.sql for a sample.</p>}
      {pages > 1 && (
        <p>{pageNum > 1 && <Link href={`/products?q=${encodeURIComponent(term)}&page=${pageNum - 1}`}>Previous</Link>}{" "}
          Page {pageNum} of {pages}{" "}
          {pageNum < pages && <Link href={`/products?q=${encodeURIComponent(term)}&page=${pageNum + 1}`}>Next</Link>}</p>
      )}
    </>
  );
}
