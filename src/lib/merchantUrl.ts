/** Allow-list for affiliate/merchant destination links: https only, exact storefront domains only. */
const AMAZON_TLDS = "com|co\\.uk|de|fr|it|es|ca|com\\.au|co\\.jp|in|ae|sa|eg|nl|se|pl|sg|com\\.mx|com\\.br|com\\.tr|com\\.be|ie";
const JUMIA_TLDS = "ug|co\\.ke|com\\.ng|com\\.gh|com\\.eg|ma|sn|ci|co\\.tz|rw";
const HOSTS: Record<"amazon" | "jumia", RegExp> = {
  amazon: new RegExp(`^([a-z0-9-]+\\.)?(amazon\\.(${AMAZON_TLDS})|amzn\\.to|a\\.co)$`, "i"),
  jumia: new RegExp(`^([a-z0-9-]+\\.)?jumia\\.(${JUMIA_TLDS})$`, "i"),
};
export function validateMerchantUrl(source: "amazon" | "jumia", raw: string): string | null {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" || u.username || u.password) return null;
    return HOSTS[source].test(u.hostname) ? u.toString() : null;
  } catch { return null; }
}
