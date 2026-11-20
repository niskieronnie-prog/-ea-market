import { requireRole } from "@/lib/auth";
import { amazonConfigured, searchAmazon, type AmazonItem } from "@/lib/amazon/creators";
import { formatMoney } from "@/lib/money";
import { addAffiliateProduct, searchAmazonAction } from "./actions";
export const metadata = { title: "Import products", robots: { index: false } };

export default async function Import({ searchParams }: { searchParams: Promise<{ q?: string; error?: string; message?: string }> }) {
  await requireRole(["admin"]);
  const { q, error, message } = await searchParams;
  let items: AmazonItem[] = []; let amazonError = "";
  if (q && amazonConfigured()) { try { items = await searchAmazon(q); } catch (e) { amazonError = `Amazon lookup failed (${(e as Error).message}).`; } }
  return (<>
    <h1>Import affiliate products</h1>
    {message && <p role="status">{message}</p>}{error && <p role="alert" className="error">{error}</p>}
    <p className="notice">Only add products you may promote under the merchant&apos;s programme terms. Prices here are a snapshot: re-check them regularly and never present them as live.</p>

    <h2>Amazon (Creators API)</h2>
    {!amazonConfigured() ? <p className="muted">Not configured. Needs an approved Associates account and Creators API credentials (see README).</p> : (<>
      <form action={searchAmazonAction} style={{ display: "flex", gap: 8 }}><label htmlFor="aq" style={{ position: "absolute", left: -999 }}>Search Amazon</label>
        <input id="aq" name="q" defaultValue={q} placeholder="Search keywords" /><button className="btn">Search</button></form>
      {amazonError && <p role="alert" className="error">{amazonError}</p>}
      {items.map((it) => (
        <form key={it.asin} action={addAffiliateProduct} className="card" style={{ marginTop: 8 }}>
          <input type="hidden" name="source" value="amazon" /><input type="hidden" name="title" value={it.title.slice(0, 200)} />
          <input type="hidden" name="url" value={it.url} />
          <strong>{it.title}</strong>
          {it.priceMinor !== undefined && it.currency ? <>
            <p>{formatMoney(it.priceMinor, it.currency)} (from API just now)</p>
            <input type="hidden" name="price" value={it.priceMinor / (it.currency === "UGX" || it.currency === "TZS" || it.currency === "RWF" ? 1 : 100)} />
            <input type="hidden" name="currency" value={it.currency} />
            <button className="btn secondary">Add to catalog</button></>
            : <p className="muted">No price in the response, so it can&apos;t be added automatically. Use the manual form below.</p>}
        </form>))}
    </>)}

    <h2>Manual entry (Amazon or Jumia)</h2>
    <p className="muted">For Jumia, paste the affiliate link generated in your Jumia affiliate account. Enter the price you can see on the merchant page today.</p>
    <form action={addAffiliateProduct} className="card">
      <label htmlFor="s">Merchant</label><select id="s" name="source"><option value="jumia">Jumia</option><option value="amazon">Amazon</option></select>
      <label htmlFor="t">Title</label><input id="t" name="title" required />
      <label htmlFor="d">Short description (write your own, don&apos;t copy the merchant&apos;s)</label><textarea id="d" name="description" rows={2} />
      <label htmlFor="c">Category</label><input id="c" name="category" />
      <label htmlFor="p">Price (whole units, e.g. 45000)</label><input id="p" name="price" type="number" step="0.01" min={0} required />
      <label htmlFor="cu">Currency</label><select id="cu" name="currency"><option>UGX</option><option>KES</option><option>TZS</option><option>RWF</option><option>USD</option></select>
      <label htmlFor="u">Affiliate / product URL (https)</label><input id="u" name="url" type="url" required />
      <p><button className="btn">Publish</button></p>
    </form>
  </>);
}
