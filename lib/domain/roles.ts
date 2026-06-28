import { USER_ROLES, type UserRole } from "./contracts";

export { USER_ROLES };
export type { UserRole };

export function isUserRole(role: unknown): role is UserRole {
  return typeof role === "string" && USER_ROLES.includes(role as UserRole);
}

export function hasAllowedRole(
  currentRole: UserRole | null | undefined,
  allowedRoles: readonly UserRole[]
): currentRole is UserRole {
  return Boolean(currentRole && allowedRoles.includes(currentRole));
}
