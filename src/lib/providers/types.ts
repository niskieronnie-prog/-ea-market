export type IntegrationStatus = {
  id: string; name: string;
  state: "configured" | "setup_required" | "simulated" | "disabled";
  note: string;
};
export interface MerchantProvider {
  id: "amazon" | "jumia";
  status(): IntegrationStatus;
}
