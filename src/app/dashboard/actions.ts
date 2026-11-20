"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

const back = (msg: string, ok = false) => redirect(`/dashboard?${ok ? "message" : "error"}=${encodeURIComponent(msg)}`);

export async function requestRole(formData: FormData) {
  const user = await requireRole(["customer"]);
  const role = z.enum(["affiliate", "seller"]).safeParse(formData.get("role"));
  if (!role.success) back("Invalid role");
  const supabase = await supabaseServer();
  const { error } = await supabase.from("role_requests").insert({ user_id: user.id, requested_role: role.data! });
  if (error) back("You already have a pending request.");
  back("Request submitted. An administrator will review it.", true);
}

export async function createBusiness(formData: FormData) {
  const user = await requireRole(["seller"]);
  const p = z.object({ name: z.string().trim().min(2).max(120), country: z.enum(["UG", "KE", "TZ", "RW"]) })
    .safeParse({ name: formData.get("name"), country: formData.get("country") });
  if (!p.success) back("Invalid business details");
  const supabase = await supabaseServer();
  const { error } = await supabase.from("businesses").insert({ owner_id: user.id, ...p.data! });
  if (error) back("Could not create business");
  revalidatePath("/dashboard");
  back("Business created. It will appear publicly once an administrator verifies it.", true);
}

export async function createProduct(formData: FormData) {
  await requireRole(["seller"]);
  const p = z.object({
    business_id: z.string().uuid(),
    title: z.string().trim().min(2).max(200),
    description: z.string().trim().max(5000).optional(),
    category: z.string().trim().max(60).optional(),
    price: z.coerce.number().int().min(0).max(1_000_000_000),
    currency: z.enum(["UGX", "KES", "TZS", "RWF", "USD"]),
  }).safeParse(Object.fromEntries(formData));
  if (!p.success) back("Invalid product details");
  const { price, ...rest } = p.data!;
  const supabase = await supabaseServer();
  // RLS checks the business belongs to this user; status is forced to 'pending' by policy.
  const { error } = await supabase.from("products").insert({ ...rest, price_minor: price, source: "seller", status: "pending" });
  if (error) back("Could not create product (is the business yours?)");
  back("Product submitted for review.", true);
}

export async function createAffiliateLink(formData: FormData) {
  const user = await requireRole(["affiliate"]);
  const id = z.string().uuid().safeParse(formData.get("product_id"));
  if (!id.success) back("Invalid product");
  const supabase = await supabaseServer();
  const camp = z.string().uuid().safeParse(formData.get("campaign_id"));
  const { error } = await supabase.from("affiliate_links").insert({ affiliate_id: user.id, product_id: id.data!, campaign_id: camp.success ? camp.data : null });
  if (error) back("Link already exists or product not available.");
  revalidatePath("/dashboard");
  back("Link created.", true);
}
