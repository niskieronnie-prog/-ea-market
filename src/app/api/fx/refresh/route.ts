import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";
import { fetchUsdRates } from "@/lib/fx";
import { anonClient, serverRpcKey } from "@/lib/serverRpc";

// Call daily from a scheduler (e.g. Vercel Cron or GitHub Actions) with: Authorization: Bearer <CRON_SECRET>
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET, key = serverRpcKey();
  if (!secret || secret.length < 32 || !key) return new NextResponse("Not configured", { status: 503 });
  const given = Buffer.from((req.headers.get("authorization") ?? "").replace(/^Bearer /, ""));
  const want = Buffer.from(secret);
  if (given.length !== want.length || !timingSafeEqual(given, want)) return new NextResponse("Unauthorized", { status: 401 });
  try {
    const rates = await fetchUsdRates();
    const { data, error } = await anonClient().rpc("fx_upsert", { p_key: key, p_rates: rates, p_source: "open.er-api.com" });
    if (error) throw error;
    return NextResponse.json({ updated: data });
  } catch { return new NextResponse("Refresh failed", { status: 502 }); }
}
