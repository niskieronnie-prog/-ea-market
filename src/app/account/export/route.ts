import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  if (!(await getCurrentUser())) return new NextResponse("Unauthorized", { status: 401 });
  const { data, error } = await (await supabaseServer()).rpc("export_my_data");
  if (error) return new NextResponse("Export failed", { status: 500 });
  return new NextResponse(JSON.stringify(data, null, 2), { headers: {
    "Content-Type": "application/json", "Content-Disposition": 'attachment; filename="my-data.json"', "Cache-Control": "no-store" } });
}
