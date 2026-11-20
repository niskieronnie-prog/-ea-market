import { NextResponse, type NextRequest } from "next/server";
import { createHash } from "crypto";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!/^[a-f0-9]{12}$/.test(code)) return new NextResponse("Not found", { status: 404 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const ipHash = createHash("sha256").update(ip + (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")).digest("hex");
  const supabase = await supabaseServer();
  const { data: url } = await supabase.rpc("record_click", { link_code: code, ip_hash: ipHash });
  // Only redirect to https URLs stored by trusted records.
  if (typeof url !== "string" || !url.startsWith("https://")) return new NextResponse("Link unavailable", { status: 404 });
  return NextResponse.redirect(url, 302);
}
