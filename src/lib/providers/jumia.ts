import type { MerchantProvider } from "./types";
// No public Jumia catalog/affiliate-product API was found. Listings are curated by an admin using
// affiliate links issued by Jumia's own affiliate programme. No scraping.
export const jumia: MerchantProvider = {
  id: "jumia",
  status: () => ({
    id: "jumia", name: "Jumia (curated links)", state: "setup_required",
    note: "Manual: admin pastes affiliate links from the Jumia affiliate portal. Needs your approved Jumia affiliate account. No automated price feed, so refresh prices by hand.",
  }),
};
