export type RouteRole = "public" | "parent" | "coach" | "admin" | "support" | "shared" | "prototype";

export type RouteLifecycle =
  | "primary"
  | "compatibility"
  | "shared-implementation"
  | "prototype"
  | "deprecated-hidden";

export type AllowedRouteRole = "signed_out" | "parent" | "coach" | "admin";

export interface RouteTopologyEntry {
  href: string;
  label: string;
  short: string;
  group: "Family" | "Coach" | "League Ops" | "Admin Tools" | "Support" | "Switch role";
  role: RouteRole;
  lifecycle: RouteLifecycle;
  canonicalHref?: string;
  allowedRoles: AllowedRouteRole[];
  navVisible: boolean;
  commandVisible: boolean;
  searchable: boolean;
  mobilePriority?: number;
  requiresAuth: boolean;
  requiresActiveAdmin?: boolean;
  noindex?: boolean;
}

export interface RoleSwitchLink {
  href: string;
  label: string;
  role: Extract<RouteRole, "parent" | "coach" | "admin">;
}

export interface ClientShellAccess {
  signedIn: boolean;
  userId?: string;
  canParent: boolean;
  canCoach: boolean;
  canAdmin: boolean;
  roleSwitchLinks: RoleSwitchLink[];
}

export const signedOutShellAccess: ClientShellAccess = {
  signedIn: false,
  canParent: false,
  canCoach: false,
  canAdmin: false,
  roleSwitchLinks: []
};

export const routeTopology = [
  route("/", "Home", "HM", "public", "Family", ["signed_out", "parent", "coach", "admin"], true, true, true, false, 1),
  route("/registration", "Registration", "RG", "public", "League Ops", ["signed_out", "parent", "coach", "admin"], true, true, true, false),
  route("/auth", "Sign in", "AU", "support", "Support", ["signed_out", "parent", "coach", "admin"], true, true, true, false, 4),
  route("/account", "Account", "AC", "support", "Support", ["parent", "coach", "admin"], true, true, true, true, 5),
  route("/invite/recover", "Recover Invite", "RI", "support", "Support", ["signed_out", "parent", "coach", "admin"], true, true, true, false),
  route("/invite/expired", "Expired Invite", "EX", "support", "Support", ["signed_out", "parent", "coach", "admin"], false, false, false, false),
  route("/offline", "Offline", "OF", "support", "Support", ["signed_out", "parent", "coach", "admin"], false, false, false, false),

  route("/parent", "Home", "HM", "parent", "Family", ["parent"], true, true, true, true, 1),
  route("/parent/schedule", "Schedule", "SC", "parent", "Family", ["parent"], true, true, true, true, 2),
  route("/parent/rsvp", "RSVP", "RS", "parent", "Family", ["parent"], true, true, true, true, 3),
  route("/parent/messages", "Messages", "MS", "parent", "Family", ["parent"], true, true, true, true, 4),
  route("/parent/photos", "Photos", "PH", "parent", "Family", ["parent"], true, true, true, true, 5),
  route("/parent/practice-recaps", "Practice Recaps", "PR", "parent", "Family", ["parent"], true, true, true, true),
  route("/parent/family-access", "Family Access", "FA", "parent", "Family", ["parent"], true, true, true, true),
  route("/parent/settings", "Settings", "ST", "parent", "Family", ["parent"], true, true, true, true),

  route("/coach", "Home", "HM", "coach", "Coach", ["coach"], true, true, true, true, 1),
  route("/coach/schedule", "Schedule", "SC", "coach", "Coach", ["coach"], true, true, true, true, 2),
  route("/coach/attendance", "Attendance", "AT", "coach", "Coach", ["coach"], true, true, true, true, 3),
  route("/coach/messages", "Messages", "MS", "coach", "Coach", ["coach"], true, true, true, true, 4),
  route("/coach/practice-recaps", "Practice Recaps", "PR", "coach", "Coach", ["coach"], true, true, true, true, 5),
  route("/coach/roster", "Roster", "RO", "coach", "Coach", ["coach"], true, true, true, true),
  route("/coach/snacks-volunteers", "Snacks & Volunteers", "SV", "coach", "Coach", ["coach"], true, true, true, true),
  route("/coach/weather-fields", "Weather & Fields", "WF", "coach", "Coach", ["coach"], true, true, true, true),
  route("/coach/drafts", "Drafts to Review", "DR", "coach", "Coach", ["coach"], true, true, true, true),
  route("/coach/settings", "Settings", "ST", "coach", "Coach", ["coach"], true, true, true, true),
  compatibility("/coach/rsvps", "Coach RSVPs", "CR", "coach", "Coach", "/coach/attendance", ["coach"], true),
  compatibility("/coach/parent-replay", "Parent Replay", "PR", "coach", "Coach", "/coach/practice-recaps", ["coach"], true),

  route("/admin", "Overview", "OV", "admin", "Admin Tools", ["admin"], true, true, true, true, 1, true),
  route("/admin/registrations", "Registrations", "RR", "admin", "Admin Tools", ["admin"], true, true, true, true, 2, true),
  route("/admin/teams", "Teams", "TM", "admin", "Admin Tools", ["admin"], true, true, true, true, 3, true),
  route("/admin/family-access", "Family Access", "FA", "admin", "Admin Tools", ["admin"], true, true, true, true, 4, true),
  route("/admin/schedule-venues", "Schedule & Venues", "SV", "admin", "Admin Tools", ["admin"], true, true, true, true, 5, true),
  route("/admin/communications", "Communications", "CM", "admin", "Admin Tools", ["admin"], true, true, true, true, undefined, true),
  route("/admin/safety-weather", "Safety & Weather", "SW", "admin", "Admin Tools", ["admin"], true, true, true, true, undefined, true),
  route("/admin/media-review", "Media Review", "MR", "admin", "Admin Tools", ["admin"], true, true, true, true, undefined, true),
  route("/admin/sponsors", "Sponsors", "SP", "admin", "Admin Tools", ["admin"], true, true, true, true, undefined, true),
  route("/admin/branding", "Branding", "BR", "admin", "Admin Tools", ["admin"], true, true, true, true, undefined, true),
  route("/admin/reports-archive", "Reports & Archive", "AR", "admin", "Admin Tools", ["admin"], true, true, true, true, undefined, true),
  route("/admin/security-audit", "Security & Audit", "SA", "admin", "Admin Tools", ["admin"], true, true, true, true, undefined, true),
  route("/admin/message-delivery-review", "Message Delivery Review", "MD", "admin", "Admin Tools", ["admin"], true, true, true, true, undefined, true),
  route("/admin/settings", "Settings", "ST", "admin", "Admin Tools", ["admin"], true, true, true, true, undefined, true),
  route("/admin/operations", "Operations", "OP", "admin", "Admin Tools", ["admin"], true, true, true, true, undefined, true),
  route("/admin/imports", "Imports", "IM", "admin", "Admin Tools", ["admin"], true, true, true, true, undefined, true),
  route("/admin/invites", "Invites", "IN", "admin", "Admin Tools", ["admin"], true, true, true, true, undefined, true),
  route("/admin/memberships", "Memberships", "MB", "admin", "Admin Tools", ["admin"], true, true, true, true, undefined, true),
  route("/admin/health", "Health", "HL", "admin", "Admin Tools", ["admin"], true, true, true, true, undefined, true),
  compatibility("/admin/guardian-links", "Guardian Links", "GL", "admin", "Admin Tools", "/admin/family-access", ["admin"], true),
  compatibility("/admin/themes", "Themes", "TH", "admin", "Admin Tools", "/admin/branding", ["admin"], true),
  compatibility("/admin/security", "Security", "SE", "admin", "Admin Tools", "/admin/security-audit", ["admin"], true),
  compatibility("/admin/archive", "Archive", "AR", "admin", "Admin Tools", "/admin/reports-archive", ["admin"], true),

  shared("/schedule", "Schedule", "SC", "/parent/schedule"),
  shared("/team-chat", "Team Chat", "CH", "/parent/messages"),
  shared("/team-portal", "Team Portal", "TP", "/parent/family-access"),
  {
    href: "/prototype/index.html",
    label: "Static Prototype",
    short: "PT",
    group: "Support",
    role: "prototype",
    lifecycle: "prototype",
    canonicalHref: "/",
    allowedRoles: ["signed_out", "parent", "coach", "admin"],
    navVisible: false,
    commandVisible: false,
    searchable: false,
    requiresAuth: false,
    noindex: true
  }
] as const satisfies RouteTopologyEntry[];

function route(
  href: string,
  label: string,
  short: string,
  role: RouteRole,
  group: RouteTopologyEntry["group"],
  allowedRoles: AllowedRouteRole[],
  navVisible: boolean,
  commandVisible: boolean,
  searchable: boolean,
  requiresAuth: boolean,
  mobilePriority?: number,
  requiresActiveAdmin = false
): RouteTopologyEntry {
  return {
    href,
    label,
    short,
    group,
    role,
    lifecycle: "primary",
    allowedRoles,
    navVisible,
    commandVisible,
    searchable,
    mobilePriority,
    requiresAuth,
    requiresActiveAdmin
  };
}

function compatibility(
  href: string,
  label: string,
  short: string,
  role: RouteRole,
  group: RouteTopologyEntry["group"],
  canonicalHref: string,
  allowedRoles: AllowedRouteRole[],
  requiresAuth: boolean
): RouteTopologyEntry {
  return {
    href,
    label,
    short,
    group,
    role,
    lifecycle: "compatibility",
    canonicalHref,
    allowedRoles,
    navVisible: false,
    commandVisible: false,
    searchable: false,
    requiresAuth
  };
}

function shared(href: string, label: string, short: string, canonicalHref: string): RouteTopologyEntry {
  return {
    href,
    label,
    short,
    group: "Support",
    role: "shared",
    lifecycle: "shared-implementation",
    canonicalHref,
    allowedRoles: ["signed_out", "parent", "coach", "admin"],
    navVisible: false,
    commandVisible: false,
    searchable: false,
    requiresAuth: false
  };
}

export function getRouteEntry(pathname: string): RouteTopologyEntry | undefined {
  return [...routeTopology]
    .sort((left, right) => right.href.length - left.href.length)
    .find((entry) => pathname === entry.href || pathname.startsWith(`${entry.href}/`));
}

export function getActiveRouteRole(pathname: string): RouteRole {
  return getRouteEntry(pathname)?.role ?? "public";
}

export function getRouteParent(pathname: string): string {
  const entry = getRouteEntry(pathname);
  if (entry?.role === "admin") return "/admin";
  if (entry?.role === "coach") return "/coach";
  if (entry?.role === "parent") return "/parent";
  return "/";
}

export function isRouteActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function canAccessRouteEntry(entry: RouteTopologyEntry, access: ClientShellAccess): boolean {
  const roleAllowed = entry.allowedRoles.some((role) => {
    if (role === "signed_out") return !entry.requiresAuth || !access.signedIn;
    if (role === "parent") return access.canParent;
    if (role === "coach") return access.canCoach;
    if (role === "admin") return access.canAdmin;
    return false;
  });
  if (!roleAllowed) return false;
  return !entry.requiresActiveAdmin || access.canAdmin;
}

export function getPrimaryNavEntries(access: ClientShellAccess, pathname: string): RouteTopologyEntry[] {
  const activeRole = getActiveRouteRole(pathname);
  const role = activeRole === "shared" || activeRole === "prototype" ? "public" : activeRole;
  const roleEntries = routeTopology.filter((entry) => (
    entry.lifecycle === "primary" &&
    entry.navVisible &&
    canAccessRouteEntry(entry, access) &&
    (entry.role === role || entry.role === "support" || (role === "public" && entry.role === "public"))
  ));

  const switchEntries = getRoleSwitchEntries(access, role);
  return [...roleEntries, ...switchEntries];
}

export function getCommandEntries(access: ClientShellAccess, pathname: string): RouteTopologyEntry[] {
  const activeRole = getActiveRouteRole(pathname);
  const role = activeRole === "shared" || activeRole === "prototype" ? "public" : activeRole;
  return routeTopology
    .filter((entry) => (
      entry.lifecycle === "primary" &&
      entry.commandVisible &&
      entry.searchable &&
      canAccessRouteEntry(entry, access) &&
      (entry.role === role || entry.role === "support" || entry.role === "public" || isRoleHomeSwitch(entry, access, role))
    ));
}

export function getMobileNavEntries(access: ClientShellAccess, pathname: string): RouteTopologyEntry[] {
  const activeRole = getActiveRouteRole(pathname);
  const role = activeRole === "shared" || activeRole === "prototype" ? "public" : activeRole;
  const primaryEntries = getPrimaryNavEntries(access, pathname);
  const roleEntries = primaryEntries.filter((entry) => (
    entry.role === role ||
    (role === "public" && (entry.role === "public" || entry.role === "support"))
  ));
  const entries = roleEntries.length >= 5 ? roleEntries : primaryEntries;

  return entries
    .filter((entry) => typeof entry.mobilePriority === "number")
    .sort((left, right) => (left.mobilePriority ?? 99) - (right.mobilePriority ?? 99))
    .slice(0, 5);
}

function getRoleSwitchEntries(access: ClientShellAccess, activeRole: RouteRole): RouteTopologyEntry[] {
  return access.roleSwitchLinks
    .filter((link) => link.role !== activeRole)
    .map((link) => ({
      href: link.href,
      label: link.label,
      short: link.role.slice(0, 2).toUpperCase(),
      group: "Switch role" as const,
      role: link.role,
      lifecycle: "primary" as const,
      allowedRoles: [link.role],
      navVisible: true,
      commandVisible: true,
      searchable: true,
      requiresAuth: true,
      requiresActiveAdmin: link.role === "admin"
    }));
}

function isRoleHomeSwitch(entry: RouteTopologyEntry, access: ClientShellAccess, activeRole: RouteRole) {
  if (entry.role === activeRole) return true;
  return access.roleSwitchLinks.some((link) => link.href === entry.href && link.role !== activeRole);
}
