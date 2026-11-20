import type { MerchantProvider } from "./types";
import { amazonConfigured } from "../amazon/creators";
export const amazon: MerchantProvider = {
  id: "amazon",
  status: () => ({
    id: "amazon", name: "Amazon Creators API",
    state: amazonConfigured() ? "configured" : "setup_required",
    note: amazonConfigured()
      ? "Credentials present. Request path and response mapping are UNVERIFIED until tested with real credentials."
      : "Requires approved Associates account + Creators API credentials (v3.x). PA-API 5 is retired.",
  }),
};
