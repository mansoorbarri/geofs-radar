export type UserRole = "FREE" | "PRO" | "ADMIN";

// Check if user has PRO features (PRO or ADMIN)
export function hasPRO(role?: UserRole | null) {
  return role === "PRO" || role === "ADMIN";
}

// Check if user is ADMIN
export function isADMIN(role?: UserRole | null) {
  return role === "ADMIN";
}
