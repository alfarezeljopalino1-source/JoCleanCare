export const roles = ["customer", "admin", "staff"] as const;
export type UserRole = (typeof roles)[number];

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && roles.includes(value as UserRole);
}

export function dashboardForRole(role: UserRole) {
  return role === "admin" ? "/admin" : role === "staff" ? "/staff" : "/dashboard";
}
