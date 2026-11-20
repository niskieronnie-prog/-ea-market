"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { headers } from "next/headers";
import { isSupabaseConfigured, supabaseServer } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rateLimit";

const creds = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(10, "Password must be at least 10 characters").max(128),
});

async function ip() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0].trim() || "local";
}
const fail = (path: string, msg: string) => redirect(`${path}?error=${encodeURIComponent(msg)}`);

export async function signUp(formData: FormData) {
  if (!isSupabaseConfigured()) fail("/register", "Account registration is unavailable until Supabase is configured.");
  const siteUrl = z.string().url().safeParse(process.env.NEXT_PUBLIC_SITE_URL);
  if (!siteUrl.success) fail("/register", "Account registration is unavailable until the site URL is configured.");
  if (!rateLimit(`signup:${await ip()}`, 5, 15 * 60_000)) fail("/register", "Too many attempts. Try later.");
  const parsed = creds.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) fail("/register", parsed.error.issues[0].message);
  if (formData.get("terms") !== "on") fail("/register", "You must accept the Terms and Privacy Policy.");
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signUp({
    ...parsed.data!,
    options: { emailRedirectTo: new URL("/auth/callback", siteUrl.data).toString() },
  });
  if (error) {
    console.error("Supabase sign-up failed:", { status: error.status, code: error.code, message: error.message });
    fail("/register", "Could not create account. Please check your details or try again later.");
  }
  redirect("/login?message=" + encodeURIComponent("Check your email to verify your account, then log in."));
}

export async function signIn(formData: FormData) {
  if (!isSupabaseConfigured()) fail("/login", "Login is unavailable until Supabase is configured.");
  if (!rateLimit(`login:${await ip()}`, 10, 15 * 60_000)) fail("/login", "Too many attempts. Try later.");
  const parsed = creds.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) fail("/login", "Invalid email or password.");
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword(parsed.data!);
  if (error) {
    console.error("Supabase sign-in failed:", { status: error.status, code: error.code, message: error.message });
    fail("/login", "Invalid email or password.");   // same message: no account enumeration
  }
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect("/");
}
