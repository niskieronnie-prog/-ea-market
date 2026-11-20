"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { validateMerchantUrl } from "@/lib/merchantUrl";
import { currencyDecimals } from "@/lib/money";

const schema = z.object({
  source: z.enum(["amazon", "jumia"]), title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(2000).optional(), category: z.string().trim().max(60).optional(),
  price: z.coerce.number().min(0).max(1_000_000_000), currency: z.enum(["UGX", "KES", "TZS", "RWF", "USD", "EUR", "GBP"]),
  url: z.string().url().max(2000),
});

export async function addAffiliateProduct(formData: FormData) {
  await requireRole(["admin"]);
  const p = schema.safeParse(Object.fromEntries(formData));
  if (!p.success) redirect("/admin/import?error=" + encodeURIComponent("Check the fields."));
  const d = p.data!;
  const url = validateMerchantUrl(d.source, d.url);
  if (!url) redirect("/admin/import?error=" + encodeURIComponent(`URL must be an https ${d.source} link.`));
  const { error } = await (await supabaseServer()).rpc("admin_add_affiliate_product", {
    p_source: d.source, p_title: d.title, p_desc: d.description ?? null, p_category: d.category ?? null,
    p_price_minor: Math.round(d.price * 10 ** currencyDecimals(d.currency)), p_currency: d.currency, p_url: url });
  redirect("/admin/import?" + (error ? "error=" + encodeURIComponent("Could not add product.") : "message=Product+published"));
}

export async function searchAmazonAction(formData: FormData) {
  await requireRole(["admin"]);
  const q = z.string().trim().min(2).max(100).safeParse(formData.get("q"));
  if (!q.success) redirect("/admin/import?error=Enter+a+search+term");
  redirect("/admin/import?q=" + encodeURIComponent(q.data!));
}
