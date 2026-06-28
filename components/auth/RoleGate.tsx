import type { ReactNode } from "react";
import { hasAllowedRole, type UserRole } from "@/lib/domain/roles";

export type RoleGateProps = {
  currentRole: UserRole | null | undefined;
  allowedRoles: readonly UserRole[];
  children: ReactNode;
  fallback?: ReactNode;
};

export function RoleGate({
  currentRole,
  allowedRoles,
  children,
  fallback = null
}: RoleGateProps) {
  // UI-only guard. Enforce real access in server routes, service adapters, and RLS.
  if (!hasAllowedRole(currentRole, allowedRoles)) return <>{fallback}</>;

  return <>{children}</>;
}
