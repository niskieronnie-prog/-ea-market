import { redirect } from "next/navigation";
import { supabaseServer, isSupabaseConfigured } from "./supabase/server";
import { hasRole, type Role } from "./roles";

export type CurrentUser = { id: string; email: string; role: Role; fullName: string | null };

/** Verifies the session with Supabase (getUser, not getSession) and loads the role from the DB. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile, error } = await supabase.from("profiles").select("role, full_name, email").eq("id", user.id).single();
  if (error) {
    console.error("Supabase profile lookup failed:", { code: error.code, message: error.message });
    return null;
  }
  if (!profile) return null;
  return { id: user.id, email: profile.email, role: profile.role as Role, fullName: profile.full_name };
}

/** Call at the top of every protected page / action. Server-side authorization. */
export async function requireRole(allowed: Role[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) return redirect("/login");
  if (!hasRole(user.role, allowed)) return redirect("/dashboard?error=Not+authorized");
  return user;
}
