export type Role = "customer" | "affiliate" | "seller" | "support" | "admin";
export const ROLES: Role[] = ["customer", "affiliate", "seller", "support", "admin"];

export function hasRole(role: Role | null | undefined, allowed: Role[]): boolean {
  return !!role && allowed.includes(role);
}
