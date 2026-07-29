export type RouteRole = "public" | "parent" | "coach" | "admin" | "support" | "shared" | "prototype";

export type RouteLifecycle =
  | "primary"
  | "compatibility"
  | "shared-implementation"
  | "prototype"
  | "deprecated-hidden";

export type AllowedRouteRole = "signed_out" | "signed_in" | "parent" | "coach" | "admin";
export type RouteNavigationGroup =
  | "Family"
  | "Command"
  | "Calendar"
  | "Team"
  | "Communication"
  | "Replay"
  | "Tools"
  | "Launch"
  | "Operations"
  | "Trust & Safety"
  | "Business"
  | "Configuration"
  | "League Ops"
  | "Admin Tools"
  | "Support"
  | "Switch role";

export interface RouteTopologyEntry {
  href: string;
  label: string;
  short: string;
  group: RouteNavigationGroup;
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
  contexts?: import("@/lib/operational-truth").ActiveContext[];
  attentionBadges?: import("@/lib/navigation/shell-attention").ShellAttentionBadge[];
}

export const signedOutShellAccess: ClientShellAccess = {
  signedIn: false,
  canParent: false,
  canCoach: false,
  canAdmin: false,
  roleSwitchLinks: []
};

export const routeTopology = [
  route("/", "Home", "HM", "public", "Family", ["signed_out", "signed_in"], false, false, false, false, 1),
  route("/registration", "Sign up", "SU", "public", "League Ops", ["signed_out", "signed_in"], true, true, true, false),
  route("/schedule", "Calendar", "CL", "public", "Family", ["signed_out", "signed_in"], true, true, true, false, 3),
  route("/sponsors", "Sponsors", "SP", "public", "Business", ["signed_out", "signed_in"], false, false, true, false),
  route("/auth", "Sign in", "AU", "support", "Support", ["signed_out"], true, true, true, false, 4),
  route("/account", "Account", "AC", "support", "Support", ["signed_in"], true, true, true, true, 5),
  route("/invite/recover", "Recover Invite", "RI", "support", "Support", ["signed_in"], false, false, true, true),
  route("/invite/expired", "Expired Invite", "EX", "support", "Support", ["signed_out", "parent", "coach", "admin"], false, false, false, false),
  route("/caregiver/accept", "Accept temporary care", "TC", "support", "Support", ["signed_out", "signed_in"], false, false, false, false),
  route("/caregiver", "Temporary caregiver", "TC", "support", "Support", ["signed_in"], false, false, false, true),
  route("/offline", "Offline", "OF", "support", "Support", ["signed_out", "parent", "coach", "admin"], false, false, false, false),

  route("/parent", "Home", "HM", "parent", "Family", ["parent"], true, true, true, true, 1),
  route("/parent/schedule", "Schedule", "SC", "parent", "Family", ["parent"], true, true, true, true, 2),
  route("/parent/rsvp", "RSVP", "RS", "parent", "Family", ["parent"], true, true, true, true, 3),
  route("/parent/messages", "Messages", "MS", "parent", "Family", ["parent"], true, true, true, true, 4),
  route("/parent/photos", "Photos", "PH", "parent", "Family", ["parent"], true, true, true, true, 5),
  route("/parent/practice-recaps", "Practice Recaps", "PR", "parent", "Family", ["parent"], true, true, true, true),
  route("/parent/family-access", "Family Access", "FA", "parent", "Family", ["parent"], true, true, true, true),
  route("/parent/transportation", "Transportation", "TR", "parent", "Family", ["parent"], true, true, true, true),
  route("/parent/settings", "Settings", "ST", "parent", "Family", ["parent"], true, true, true, true),

  route("/coach", "Home", "HM", "coach", "Command", ["coach"], true, true, true, true, 1),
  route("/coach/schedule", "Schedule", "SC", "coach", "Calendar", ["coach"], true, true, true, true, 2),
  route("/coach/attendance", "Attendance", "AT", "coach", "Team", ["coach"], true, true, true, true, 3),
  route("/coach/messages", "Messages", "MS", "coach", "Communication", ["coach"], true, true, true, true, 4),
  route("/coach/practice-recaps", "Practice Recaps", "PR", "coach", "Replay", ["coach"], true, true, true, true, 5),
  route("/coach/roster", "Roster", "RO", "coach", "Team", ["coach"], true, true, true, true),
  route("/coach/snacks-volunteers", "Snacks & Volunteers", "SV", "coach", "Team", ["coach"], true, true, true, true),
  route("/coach/weather-fields", "Weather & Fields", "WF", "coach", "Tools", ["coach"], true, true, true, true),
  route("/coach/drafts", "Drafts to Review", "DR", "coach", "Communication", ["coach"], true, true, true, true),
  route("/coach/settings", "Settings", "ST", "coach", "Tools", ["coach"], true, true, true, true),
  compatibility("/coach/rsvps", "Coach RSVPs", "CR", "coach", "Team", "/coach/attendance", ["coach"], true),
  compatibility("/coach/parent-replay", "Parent Replay", "PR", "coach", "Replay", "/coach/practice-recaps", ["coach"], true),

  route("/admin", "Overview", "OV", "admin", "Launch", ["admin"], true, true, true, true, 1, true),
  route("/admin/registrations", "Registrations", "RR", "admin", "Launch", ["admin"], true, true, true, true, 2, true),
  route("/admin/teams", "Teams", "TM", "admin", "Launch", ["admin"], true, true, true, true, 3, true),
  route("/admin/family-access", "Family Access", "FA", "admin", "Launch", ["admin"], true, true, true, true, 4, true),
  route("/admin/schedule-venues", "Schedule & Venues", "SV", "admin", "Operations", ["admin"], true, true, true, true, 5, true),
  route("/admin/communications", "Communications", "CM", "admin", "Communication", ["admin"], true, true, true, true, undefined, true),
  route("/admin/safety-weather", "Safety & Weather", "SW", "admin", "Trust & Safety", ["admin"], true, true, true, true, undefined, true),
  route("/admin/media-review", "Media Review", "MR", "admin", "Trust & Safety", ["admin"], true, true, true, true, undefined, true),
  route("/admin/sponsors", "Sponsors", "SP", "admin", "Business", ["admin"], true, true, true, true, undefined, true),
  route("/admin/branding", "Branding", "BR", "admin", "Configuration", ["admin"], true, true, true, true, undefined, true),
  route("/admin/reports-archive", "Reports & Archive", "AR", "admin", "Configuration", ["admin"], true, true, true, true, undefined, true),
  route("/admin/security-audit", "Security & Audit", "SA", "admin", "Trust & Safety", ["admin"], true, true, true, true, undefined, true),
  route("/admin/message-delivery-review", "Message Delivery Review", "MD", "admin", "Communication", ["admin"], true, true, true, true, undefined, true),
  route("/admin/settings", "Settings", "ST", "admin", "Configuration", ["admin"], true, true, true, true, undefined, true),
  route("/admin/operations", "Operations", "OP", "admin", "Operations", ["admin"], true, true, true, true, undefined, true),
  route("/admin/imports", "Imports", "IM", "admin", "Operations", ["admin"], true, true, true, true, undefined, true),
  route("/admin/invites", "Invites", "IN", "admin", "Launch", ["admin"], true, true, true, true, undefined, true),
  route("/admin/memberships", "Memberships", "MB", "admin", "Launch", ["admin"], true, true, true, true, undefined, true),
  route("/admin/health", "Health", "HL", "admin", "Launch", ["admin"], true, true, true, true, undefined, true),
  compatibility("/admin/guardian-links", "Guardian Links", "GL", "admin", "Admin Tools", "/admin/family-access", ["admin"], true),
  compatibility("/admin/themes", "Themes", "TH", "admin", "Admin Tools", "/admin/branding", ["admin"], true),
  compatibility("/admin/security", "Security", "SE", "admin", "Admin Tools", "/admin/security-audit", ["admin"], true),
  compatibility("/admin/archive", "Archive", "AR", "admin", "Admin Tools", "/admin/reports-archive", ["admin"], true),

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
    allowedRoles: ["parent", "coach", "admin"],
    navVisible: false,
    commandVisible: false,
    searchable: false,
    requiresAuth: true
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
    if (role === "signed_out") return !access.signedIn;
    if (role === "signed_in") return access.signedIn;
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
  const roleMobileHrefs: Partial<Record<RouteRole, string[]>> = {
    parent: ["/parent", "/parent/schedule", "/parent/rsvp", "/parent/messages", "/parent/settings"],
    coach: ["/coach", "/coach/attendance", "/coach/practice-recaps", "/coach/messages", "/coach/roster"],
    admin: ["/admin", "/admin/registrations", "/admin/teams", "/admin/message-delivery-review", "/admin/security-audit"]
  };
  const roleMobileLabels: Record<string, string> = {
    "/parent": "Today",
    "/parent/settings": "More",
    "/coach": "Today",
    "/coach/attendance": "RSVPs",
    "/coach/practice-recaps": "Replay",
    "/coach/roster": "Team",
    "/admin": "Dashboard",
    "/admin/message-delivery-review": "Providers",
    "/admin/security-audit": "Security"
  };
  const preferredHrefs = roleMobileHrefs[role];
  if (preferredHrefs) {
    return preferredHrefs
      .map((href) => routeTopology.find((entry) => entry.href === href))
      .filter((entry): entry is RouteTopologyEntry => Boolean(entry && canAccessRouteEntry(entry, access)))
      .map((entry) => ({
        ...entry,
        label: roleMobileLabels[entry.href] ?? entry.label
      }));
  }
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
