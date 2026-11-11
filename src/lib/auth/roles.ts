export const USER_ROLES = ["CLIENT", "BUSINESS", "ADMIN"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const ROLE_LABEL: Record<UserRole, string> = {
  CLIENT: "Cliente",
  BUSINESS: "Comercio",
  ADMIN: "Administrador",
};

/** Panel principal de cada rol. */
export const ROLE_DASHBOARD: Record<UserRole, string> = {
  CLIENT: "/cliente/dashboard",
  BUSINESS: "/negocio/dashboard",
  ADMIN: "/admin/dashboard",
};

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && USER_ROLES.includes(value as UserRole);
}

export function dashboardForRole(role: UserRole): string {
  return ROLE_DASHBOARD[role];
}
