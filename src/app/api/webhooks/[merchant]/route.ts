import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { verifySignature } from "@/lib/webhook";
import { anonClient, serverRpcKey } from "@/lib/serverRpc";
import { rateLimit } from "@/lib/rateLimit";

// Partner webhook. Each partner gets its own secret: env WEBHOOK_SECRET_<MERCHANT> (32+ chars).
// Headers: x-timestamp (unix seconds), x-signature (hex HMAC-SHA256 of "<timestamp>.<raw body>").
const event = z.discriminatedUnion("type", [
  z.object({ type: z.literal("conversion"), event_id: z.string().min(6).max(100), external_id: z.string().min(1).max(100),
    link_code: z.string().regex(/^[a-f0-9]{12}$/).optional(), amount_minor: z.number().int().min(0).max(10_000_000_000),
    currency: z.string().length(3) }),
  z.object({ type: z.literal("refund"), event_id: z.string().min(6).max(100), external_id: z.string().min(1).max(100) }),
]);

export async function POST(req: NextRequest, { params }: { params: Promise<{ merchant: string }> }) {
  const { merchant } = await params;
  if (!/^[a-z0-9_]{2,30}$/.test(merchant)) return new NextResponse("Not found", { status: 404 });
  const secret = process.env[`WEBHOOK_SECRET_${merchant.toUpperCase()}`];
  const key = serverRpcKey();
  if (!secret || secret.length < 32) return new NextResponse("Not found", { status: 404 });
  if (!key) return new NextResponse("Not configured", { status: 503 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (!rateLimit(`wh:${ip}`, 120, 60_000)) return new NextResponse("Too many requests", { status: 429 });

  const raw = await req.text();
  if (raw.length > 10_000) return new NextResponse("Too large", { status: 413 });
  const ok = verifySignature(raw, req.headers.get("x-timestamp") ?? "", req.headers.get("x-signature") ?? "", secret);
  if (!ok) return new NextResponse("Invalid signature", { status: 401 });

  let parsed;
  try { parsed = event.safeParse(JSON.parse(raw)); } catch { return new NextResponse("Bad request", { status: 400 }); }
  if (!parsed.success) return new NextResponse("Bad request", { status: 400 });
  const e = parsed.data;

  const db = anonClient();
  const { data, error } = e.type === "conversion"
    ? await db.rpc("ingest_conversion", { p_key: key, p_merchant: merchant, p_event_id: e.event_id, p_external_id: e.external_id,
        p_link_code: e.link_code ?? "", p_amount_minor: e.amount_minor, p_currency: e.currency.toUpperCase() })
    : await db.rpc("ingest_refund", { p_key: key, p_merchant: merchant, p_event_id: e.event_id, p_external_id: e.external_id });
  if (error) { console.error("webhook rpc failed", error.code); return new NextResponse("Processing failed", { status: 500 }); }
  return NextResponse.json({ result: data });
}
