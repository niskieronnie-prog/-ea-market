"use server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";

export async function submitLead(formData: FormData) {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const p = z.object({
    product_id: z.string().uuid(),
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().email().max(254),
    message: z.string().trim().max(2000).optional(),
  }).safeParse(Object.fromEntries(formData));
  const base = `/products/${formData.get("product_id")}`;
  if (!p.success) redirect(`${base}?error=Please+check+your+details`);
  if (formData.get("consent") !== "on") redirect(`${base}?error=Consent+is+required+to+send+your+details+to+the+business`);
  if (!rateLimit(`lead:${ip}`, 5, 60 * 60_000)) redirect(`${base}?error=Too+many+enquiries.+Try+later`);

  const supabase = await supabaseServer();
  const { data: product } = await supabase.from("products").select("id,business_id").eq("id", p.data!.product_id).eq("status", "published").single();
  if (!product?.business_id) redirect(`${base}?error=This+listing+does+not+accept+enquiries`);
  const user = await getCurrentUser();
  const { error } = await supabase.from("leads").insert({
    product_id: product!.id, business_id: product!.business_id, customer_id: user?.id ?? null,
    name: p.data!.name, email: p.data!.email, message: p.data!.message ?? null, consent_shared: true,
  });
  if (error) redirect(`${base}?error=Could+not+send+enquiry`);
  redirect(`${base}?message=Enquiry+sent`);
}
