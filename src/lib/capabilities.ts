export type UserRole = "FREE" | "PRO" | "ADMIN";

export function hasPRO(role?: UserRole | null) {
  return role === "PRO";
}
