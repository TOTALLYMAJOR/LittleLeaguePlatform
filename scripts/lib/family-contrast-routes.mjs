import { routeTopology } from "../../lib/navigation/route-topology.ts";

export function discoverFamilyContrastRoutes() {
  return routeTopology
    .filter((entry) => (
      entry.requiresAuth
      && (entry.allowedRoles.includes("parent") || entry.allowedRoles.includes("signed_in"))
      && (
        entry.surfaceFamily === "family"
        || (entry.shellFamily === "active-role" && Boolean(entry.familyMobileTab))
      )
    ))
    .map((entry) => ({
      path: entry.href,
      surfaceFamily: entry.surfaceFamily,
      expectedShellFamily: "family",
      familyMobileTab: entry.familyMobileTab ?? null
    }));
}
