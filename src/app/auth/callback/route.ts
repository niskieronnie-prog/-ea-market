import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (code) {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("Supabase auth callback failed:", { status: error.status, code: error.code, message: error.message });
      return NextResponse.redirect(new URL("/login?error=Verification+link+could+not+be+used.+Please+sign+in+or+request+a+new+link.", req.nextUrl.origin));
    }
  } else {
    return NextResponse.redirect(new URL("/login?error=Verification+link+is+missing+or+expired.", req.nextUrl.origin));
  }
  // Fixed redirect target: no open redirect.
  return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
}
