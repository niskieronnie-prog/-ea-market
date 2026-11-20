"use server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { sniffImage, sniffPdf } from "@/lib/imageSniff";

async function verifyObject(bucket: string, path: string, userId: string, kind: "image" | "any") {
  if (!path.startsWith(`${userId}/`) || path.includes("..") || path.split("/").length !== 2) return "Invalid path.";
  const supabase = await supabaseServer();
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || !data) return "File not found.";
  const head = new Uint8Array(await data.slice(0, 16).arrayBuffer());
  const ok = kind === "image" ? sniffImage(head) !== null : (sniffImage(head) !== null || sniffPdf(head));
  if (!ok) { await supabase.storage.from(bucket).remove([path]); return "File content does not match an allowed type. Removed."; }
  return null;
}

export async function attachProductImage(productId: string, path: string): Promise<string> {
  const user = await requireRole(["seller"]);
  if (!z.string().uuid().safeParse(productId).success) return "Invalid product.";
  const bad = await verifyObject("product-images", path, user.id, "image"); if (bad) return bad;
  const supabase = await supabaseServer();
  const { data, error } = await supabase.from("products").update({ image_path: path }).eq("id", productId).select("id");  // RLS: owner only
  if (error || !data?.length) return "Could not attach image to that product.";
  return "Image added.";
}

export async function submitVerificationDoc(businessId: string, path: string): Promise<string> {
  const user = await requireRole(["seller"]);
  if (!z.string().uuid().safeParse(businessId).success) return "Invalid business.";
  const bad = await verifyObject("verification-docs", path, user.id, "any"); if (bad) return bad;
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc("request_verification", { bid: businessId });
  return error ? "Document stored. (Verification was already requested.)" : "Document uploaded. An administrator will review it.";
}
