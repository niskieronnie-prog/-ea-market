import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { answer } from "@/lib/chatbot";
import { aiAnswer } from "@/lib/ai";
import { rateLimit } from "@/lib/rateLimit";
import { supabaseServer, isSupabaseConfigured } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { formatMoney } from "@/lib/money";

const body = z.object({ message: z.string().min(1).max(500) });

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const user = await getCurrentUser();
  if (!rateLimit(`chat:ip:${ip}`, 20, 60_000) || (user && !rateLimit(`chat:u:${user.id}`, 30, 60_000)) || !rateLimit("chat:global", 600, 60_000))
    return NextResponse.json({ reply: "Too many messages. Please wait a minute." }, { status: 429 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ reply: "Invalid message." }, { status: 400 });

  const result = answer(parsed.data.message);
  if (result.escalate) return NextResponse.json({ reply: result.reply, escalate: true });
  if (result.reply && !result.unknown) return NextResponse.json({ reply: result.reply, source: "rules" });
  if (!isSupabaseConfigured()) return NextResponse.json({ reply: "Search is not set up yet." });

  const supabase = await supabaseServer();
  const terms = (result.searchTerm ?? parsed.data.message).replace(/[%_,()\\]/g, " ").trim().slice(0, 60);
  const { data } = await supabase.from("products").select("id,title,price_minor,currency").eq("status", "published").ilike("title", `%${terms}%`).limit(5);

  if (result.searchTerm) {
    if (!data?.length) return NextResponse.json({ reply: `I couldn't find published products matching "${terms}".`, source: "rules" });
    return NextResponse.json({ source: "rules", reply: "Here is what I found (prices as recorded; confirm at checkout):\n" +
      data.map((p) => `• ${p.title}, ${formatMoney(p.price_minor, p.currency)} (/products/${p.id})`).join("\n") });
  }
  // Unknown question: try AI (grounded, capped, killable), otherwise the rules fallback.
  const ai = await aiAnswer(parsed.data.message, (data ?? []).map((p) => ({ id: p.id, title: p.title, price: formatMoney(p.price_minor, p.currency) })));
  if (ai) return NextResponse.json({ reply: ai, source: "ai" });
  return NextResponse.json({ reply: result.reply, source: "rules" });
}
