import { currencyDecimals } from "../money";

/**
 * Amazon Creators API client (replacement for the retired PA-API 5).
 * VERIFIED from Amazon docs/sources: global host https://creatorsapi.amazon, OAuth client-credentials,
 *   v3.x credentials use Login-with-Amazon token URLs, scope "creatorsapi::default", header x-marketplace,
 *   body fields partnerTag / marketplace / keywords / itemCount / resources.
 * UNVERIFIED (confirm against live docs + real credentials): exact URL path "/catalog/v1/searchItems",
 *   token request body format, and response field names parsed below. Unknown fields are skipped, never invented.
 * Eligibility: needs final-accepted Associates status (reported: 10 qualifying sales / 30 days). Only v3.x creds supported here.
 */
const TOKEN_URL: Record<string, string> = {
  "3.1": "https://api.amazon.com/auth/o2/token",
  "3.2": "https://api.amazon.co.uk/auth/o2/token",
  "3.3": "https://api.amazon.co.jp/auth/o2/token",
};

export type AmazonItem = { asin: string; title: string; url: string; imageUrl?: string; priceMinor?: number; currency?: string };

export function amazonConfigured(): boolean {
  return Boolean(process.env.CREATORS_API_CREDENTIAL_ID && process.env.CREATORS_API_CREDENTIAL_SECRET
    && process.env.CREATORS_API_VERSION && TOKEN_URL[process.env.CREATORS_API_VERSION ?? ""] && process.env.AMAZON_ASSOCIATES_TAG);
}

let cached: { token: string; exp: number } | null = null;
async function accessToken(): Promise<string> {
  if (cached && cached.exp > Date.now() + 30_000) return cached.token;
  const res = await fetch(TOKEN_URL[process.env.CREATORS_API_VERSION!], {
    method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(10_000),
    body: JSON.stringify({ grant_type: "client_credentials", client_id: process.env.CREATORS_API_CREDENTIAL_ID,
      client_secret: process.env.CREATORS_API_CREDENTIAL_SECRET, scope: "creatorsapi::default" }),
  });
  if (!res.ok) throw new Error("amazon_auth_failed");
  const j = await res.json();
  cached = { token: j.access_token, exp: Date.now() + (Number(j.expires_in) || 3000) * 1000 };
  return cached.token;
}

/** Pure + defensive so it can be unit-tested and survive shape changes. */
export function parseSearchResponse(json: any): AmazonItem[] {
  const items: any[] = json?.searchResult?.items ?? json?.SearchResult?.Items ?? [];
  const out: AmazonItem[] = [];
  for (const it of items) {
    const asin = it?.asin ?? it?.ASIN;
    const title = it?.itemInfo?.title?.displayValue;
    const url = it?.detailPageURL ?? it?.detailPageUrl;
    if (typeof asin !== "string" || typeof title !== "string" || typeof url !== "string" || !url.startsWith("https://")) continue;
    const money = it?.offersV2?.listings?.[0]?.price?.money;
    const item: AmazonItem = { asin, title, url, imageUrl: it?.images?.primary?.medium?.url };
    if (typeof money?.amount === "number" && typeof money?.currency === "string") {
      item.priceMinor = Math.round(money.amount * 10 ** currencyDecimals(money.currency));
      item.currency = money.currency;
    }
    out.push(item);
  }
  return out;
}

export async function searchAmazon(keywords: string): Promise<AmazonItem[]> {
  if (!amazonConfigured()) throw new Error("amazon_not_configured");
  const marketplace = process.env.AMAZON_MARKETPLACE || "www.amazon.com";
  const res = await fetch("https://creatorsapi.amazon/catalog/v1/searchItems", {
    method: "POST", signal: AbortSignal.timeout(15_000),
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${await accessToken()}`, "x-marketplace": marketplace },
    body: JSON.stringify({ keywords: keywords.slice(0, 100), partnerTag: process.env.AMAZON_ASSOCIATES_TAG, marketplace,
      itemCount: 5, resources: ["itemInfo.title", "images.primary.medium", "offersV2.listings.price"] }),
  });
  if (!res.ok) throw new Error(`amazon_api_${res.status}`);
  return parseSearchResponse(await res.json());
}
