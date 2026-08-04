export type RouteRole = "public" | "parent" | "coach" | "admin" | "support" | "shared" | "prototype";

export type RouteLifecycle =
  | "primary"
  | "compatibility"
  | "shared-implementation"
  | "prototype"
  | "deprecated-hidden";

export type AllowedRouteRole = "signed_out" | "signed_in" | "parent" | "coach" | "admin";
export type ProductRole = Extract<AllowedRouteRole, "parent" | "coach" | "admin">;
export type SurfaceFamily = "public" | "family" | "staff" | "shared" | "support" | "transition" | "prototype";
export type ShellFamily = "public" | "family" | "staff" | "neutral" | "active-role";
export type PrimaryNavigationFamily = "public" | "family" | "coach" | "admin" | "active-role" | "none";
export type FamilyMobileTab = "home" | "schedule" | "messages" | "family" | "more";
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
  surfaceFamily: SurfaceFamily;
  shellFamily: ShellFamily;
  primaryNavigationFamily: PrimaryNavigationFamily;
  familyMobileTab?: FamilyMobileTab;
  parentMoreDescription?: string;
  parentMorePriority?: number;
  neutralTransition: boolean;
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
  activeRole?: ProductRole;
  activeRoleSource?: RouteAuthoritySource;
  roleSwitchLinks: RoleSwitchLink[];
  contexts?: import("@/lib/operational-truth").ActiveContext[];
  attentionBadges?: import("@/lib/navigation/shell-attention").ShellAttentionBadge[];
  attentionStatus?: "ready" | "error";
}

export interface NavigationRoleContext {
  currentRole?: ProductRole;
  preservedRole?: ProductRole;
}

export type RouteAuthoritySource =
  | "signed-out"
  | "route-required"
  | "explicit"
  | "server-persisted"
  | "single-role-inferred"
  | "ambiguous"
  | "neutral-transition"
  | "unsupported";

export interface RouteAuthorityContext {
  entry?: RouteTopologyEntry;
  activeRole?: ProductRole;
  shellFamily: Exclude<ShellFamily, "active-role">;
  navigationRole?: ProductRole | "public";
  dataScopeRole?: ProductRole;
  routeRequiredRole?: ProductRole;
  source: RouteAuthoritySource;
  neutralTransition: boolean;
  ambiguous: boolean;
}

export const signedOutShellAccess: ClientShellAccess = {
  signedIn: false,
  canParent: false,
  canCoach: false,
  canAdmin: false,
  roleSwitchLinks: []
};

export const routeTopology = [
  route("/", "Home", "HM", "public", "Family", ["signed_out", "signed_in"], false, false, false, false, 1, false, {
    shellFamily: "neutral",
    primaryNavigationFamily: "active-role",
    familyMobileTab: "home"
  }),
  route("/registration", "Sign up", "SU", "public", "League Ops", ["signed_out", "signed_in"], true, true, true, false),
  route("/schedule", "Calendar", "CL", "public", "Family", ["signed_out", "signed_in"], true, true, true, false, 3),
  route("/sponsors", "Sponsors", "SP", "public", "Business", ["signed_out", "signed_in"], false, false, true, false),
  route("/auth", "Sign in", "AU", "support", "Support", ["signed_out"], true, true, true, false, 4),
  route("/account", "Account", "AC", "support", "Support", ["signed_in"], true, true, true, true, 5, false, {
    shellFamily: "active-role",
    primaryNavigationFamily: "active-role",
    familyMobileTab: "more",
    parentMoreDescription: "Review identity, memberships, security, and sign out.",
    parentMorePriority: 5
  }),
  route("/access/status", "Access Status", "AS", "support", "Support", ["signed_out", "signed_in"], false, false, true, false, undefined, false, {
    surfaceFamily: "transition",
    shellFamily: "neutral",
    primaryNavigationFamily: "none",
    neutralTransition: true
  }),
  route("/invite/accept", "Accept Invite", "AI", "support", "Support", ["signed_out", "signed_in"], false, false, false, false, undefined, false, {
    surfaceFamily: "transition",
    shellFamily: "neutral",
    primaryNavigationFamily: "none",
    neutralTransition: true
  }),
  route("/invite/recover", "Recover Invite", "RI", "support", "Support", ["signed_in"], false, false, true, true, undefined, false, {
    familyMobileTab: "more",
    parentMoreDescription: "Get help with an invitation or access review.",
    parentMorePriority: 6
  }),
  route("/invite/expired", "Expired Invite", "EX", "support", "Support", ["signed_out", "parent", "coach", "admin"], false, false, false, false),
  route("/caregiver/accept", "Accept temporary care", "TC", "support", "Support", ["signed_out", "signed_in"], false, false, false, false),
  route("/caregiver", "Temporary caregiver", "TC", "support", "Support", ["signed_in"], false, false, false, true),
  route("/offline", "Offline", "OF", "support", "Support", ["signed_out", "parent", "coach", "admin"], false, false, false, false, undefined, false, {
    familyMobileTab: "more",
    parentMoreDescription: "Check what remains available without a connection.",
    parentMorePriority: 7
  }),

  route("/parent", "Home", "HM", "parent", "Family", ["parent"], true, true, true, true, 1, false, {
    familyMobileTab: "home"
  }),
  route("/parent/schedule", "Schedule", "SC", "parent", "Family", ["parent"], true, true, true, true, 2, false, {
    familyMobileTab: "schedule"
  }),
  route("/parent/rsvp", "RSVP", "RS", "parent", "Family", ["parent"], false, true, true, true, undefined, false, {
    familyMobileTab: "schedule"
  }),
  route("/parent/messages", "Messages", "MS", "parent", "Family", ["parent"], true, true, true, true, 3, false, {
    familyMobileTab: "messages"
  }),
  route("/parent/photos", "Photos", "PH", "parent", "Family", ["parent"], false, true, true, true, undefined, false, {
    familyMobileTab: "more",
    parentMoreDescription: "View family-visible team media.",
    parentMorePriority: 2
  }),
  route("/parent/practice-recaps", "Practice Replays", "PR", "parent", "Family", ["parent"], false, true, true, true, undefined, false, {
    familyMobileTab: "more",
    parentMoreDescription: "Open coach-published practice memories.",
    parentMorePriority: 1
  }),
  route("/parent/family-access", "Family", "FA", "parent", "Family", ["parent"], true, true, true, true, 4, false, {
    familyMobileTab: "family"
  }),
  route("/parent/transportation", "Transportation", "TR", "parent", "Family", ["parent"], false, true, true, true, undefined, false, {
    familyMobileTab: "more",
    parentMoreDescription: "Review ride requests, offers, and accepted plans.",
    parentMorePriority: 3
  }),
  route("/parent/settings", "Settings", "ST", "parent", "Family", ["parent"], false, true, true, true, undefined, false, {
    familyMobileTab: "more",
    parentMoreDescription: "Open family preferences and current settings.",
    parentMorePriority: 4
  }),
  route("/parent/more", "More", "MO", "parent", "Family", ["parent"], true, true, true, true, 5, false, {
    familyMobileTab: "more"
  }),
  route("/parent/setup", "Family Setup", "FS", "parent", "Family", ["parent"], false, false, true, true, undefined, false, {
    familyMobileTab: "family"
  }),

  route("/coach", "Home", "HM", "coach", "Command", ["coach"], true, true, true, true, 1),
  route("/coach/schedule", "Schedule", "SC", "coach", "Calendar", ["coach"], true, true, true, true, 2),
  route("/coach/attendance", "RSVPs", "RS", "coach", "Team", ["coach"], true, true, true, true, 3),
  route("/coach/messages", "Messages", "MS", "coach", "Communication", ["coach"], true, true, true, true, 4),
  route("/coach/practice-recaps", "Parent Replay", "PR", "coach", "Replay", ["coach"], true, true, true, true, 5),
  route("/coach/roster", "Team Portal", "TP", "coach", "Team", ["coach"], true, true, true, true),
  route("/coach/snacks-volunteers", "Snacks & Volunteers", "SV", "coach", "Team", ["coach"], true, true, true, true),
  route("/coach/weather-fields", "Weather & Fields", "WF", "coach", "Tools", ["coach"], true, true, true, true),
  route("/coach/drafts", "Drafts to Review", "DR", "coach", "Communication", ["coach"], true, true, true, true),
  route("/coach/settings", "Settings", "ST", "coach", "Tools", ["coach"], false, false, false, true),
  compatibility("/coach/rsvps", "Coach RSVPs", "CR", "coach", "Team", "/coach/attendance", ["coach"], true),
  compatibility("/coach/parent-replay", "Parent Replay", "PR", "coach", "Replay", "/coach/practice-recaps", ["coach"], true),

  route("/admin", "Overview", "OV", "admin", "Launch", ["admin"], true, true, true, true, 1, true),
  route("/admin/registrations", "Registrations", "RR", "admin", "Launch", ["admin"], true, true, true, true, 2, true),
  route("/admin/teams", "Teams", "TM", "admin", "Launch", ["admin"], true, true, true, true, 3, true),
  route("/admin/family-access", "Family Access", "FA", "admin", "Launch", ["admin"], true, true, true, true, 4, true),
  route("/admin/schedule-venues", "Schedule & Venues", "SV", "admin", "Operations", ["admin"], true, true, true, true, 5, true),
  route("/admin/communications", "Communications", "CM", "admin", "Communication", ["admin"], true, true, true, true, undefined, true),
  compatibility("/admin/safety-weather", "Schedule & Venues", "SV", "admin", "Operations", "/admin/schedule-venues", ["admin"], true),
  route("/admin/media-review", "Media Review", "MR", "admin", "Trust & Safety", ["admin"], true, true, true, true, undefined, true),
  route("/admin/sponsors", "Sponsors", "SP", "admin", "Business", ["admin"], true, true, true, true, undefined, true),
  route("/admin/branding", "Branding", "BR", "admin", "Configuration", ["admin"], true, true, true, true, undefined, true),
  route("/admin/reports-archive", "Reports & Archive", "AR", "admin", "Configuration", ["admin"], true, true, true, true, undefined, true),
  route("/admin/security-audit", "Security & Audit", "SA", "admin", "Trust & Safety", ["admin"], true, true, true, true, undefined, true),
  route("/admin/message-delivery-review", "Message Delivery Review", "MD", "admin", "Communication", ["admin"], true, true, true, true, undefined, true),
  compatibility("/admin/settings", "Operations", "OP", "admin", "Operations", "/admin/operations", ["admin"], true),
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
    noindex: true,
    surfaceFamily: "prototype",
    shellFamily: "neutral",
    primaryNavigationFamily: "none",
    neutralTransition: false
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
  requiresActiveAdmin = false,
  metadata: Partial<Pick<
    RouteTopologyEntry,
    "surfaceFamily" | "shellFamily" | "primaryNavigationFamily" | "familyMobileTab" | "neutralTransition"
    | "parentMoreDescription" | "parentMorePriority"
  >> = {}
): RouteTopologyEntry {
  const defaults = routeMetadataForRole(role);
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
    requiresActiveAdmin,
    ...defaults,
    ...metadata
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
    requiresAuth,
    ...routeMetadataForRole(role)
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
    requiresAuth: true,
    surfaceFamily: "shared",
    shellFamily: "active-role",
    primaryNavigationFamily: "active-role",
    familyMobileTab: canonicalHref === "/parent/messages" ? "messages" : "family",
    neutralTransition: false
  };
}

function routeMetadataForRole(role: RouteRole): Pick<
  RouteTopologyEntry,
  "surfaceFamily" | "shellFamily" | "primaryNavigationFamily" | "neutralTransition"
> {
  if (role === "parent") {
    return {
      surfaceFamily: "family",
      shellFamily: "family",
      primaryNavigationFamily: "family",
      neutralTransition: false
    };
  }
  if (role === "coach" || role === "admin") {
    return {
      surfaceFamily: "staff",
      shellFamily: "staff",
      primaryNavigationFamily: role,
      neutralTransition: false
    };
  }
  if (role === "public") {
    return {
      surfaceFamily: "public",
      shellFamily: "public",
      primaryNavigationFamily: "public",
      neutralTransition: false
    };
  }
  return {
    surfaceFamily: role === "prototype" ? "prototype" : "support",
    shellFamily: "neutral",
    primaryNavigationFamily: role === "support" ? "public" : "none",
    neutralTransition: false
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
  if (href === "/parent" || href === "/coach" || href === "/admin") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isNavigationEntryActive(pathname: string, entry: RouteTopologyEntry) {
  const activeEntry = getRouteEntry(pathname);
  if (
    entry.familyMobileTab &&
    activeEntry?.familyMobileTab &&
    entry.role === "parent"
  ) {
    return entry.familyMobileTab === activeEntry.familyMobileTab;
  }
  return isRouteActive(pathname, entry.href);
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

export function getPrimaryNavEntries(
  access: ClientShellAccess,
  pathname: string,
  context: NavigationRoleContext = {}
): RouteTopologyEntry[] {
  const entry = getRouteEntry(pathname);
  const role = resolvePrimaryNavigationRole(access, entry, context);
  const roleEntries = routeTopology.filter((entry) => (
    entry.lifecycle === "primary" &&
    entry.navVisible &&
    canAccessRouteEntry(entry, access) &&
    (
      entry.role === role ||
      entry.role === "support" ||
      (role === "public" && entry.role === "public")
    )
  ));

  const switchEntries = getRoleSwitchEntries(access, role ?? "public");
  return [...roleEntries, ...switchEntries];
}

export function getCommandEntries(
  access: ClientShellAccess,
  pathname: string,
  context: NavigationRoleContext = {}
): RouteTopologyEntry[] {
  const role = resolvePrimaryNavigationRole(access, getRouteEntry(pathname), context);
  return routeTopology
    .filter((entry) => (
      entry.lifecycle === "primary" &&
      entry.commandVisible &&
      entry.searchable &&
      canAccessRouteEntry(entry, access) &&
      (
        entry.role === role ||
        entry.role === "support" ||
        entry.role === "public" ||
        isRoleHomeSwitch(entry, access, role ?? "public")
      )
    ));
}

export function getMobileNavEntries(
  access: ClientShellAccess,
  pathname: string,
  context: NavigationRoleContext = {}
): RouteTopologyEntry[] {
  const role = resolvePrimaryNavigationRole(access, getRouteEntry(pathname), context);
  if (role === "parent") return getFamilyPrimaryNavEntries(access);

  const roleMobileHrefs: Partial<Record<RouteRole, string[]>> = {
    coach: ["/coach", "/coach/attendance", "/coach/practice-recaps", "/coach/messages", "/coach/roster"],
    admin: ["/admin", "/admin/registrations", "/admin/teams", "/admin/message-delivery-review", "/admin/security-audit"]
  };
  const roleMobileLabels: Record<string, string> = {
    "/coach": "Today",
    "/coach/attendance": "RSVPs",
    "/coach/practice-recaps": "Replay",
    "/coach/roster": "Team",
    "/admin": "Dashboard",
    "/admin/message-delivery-review": "Message approvals",
    "/admin/security-audit": "Security"
  };
  const preferredHrefs = role ? roleMobileHrefs[role] : undefined;
  if (preferredHrefs) {
    return preferredHrefs
      .map((href) => routeTopology.find((entry) => entry.href === href))
      .filter((entry): entry is RouteTopologyEntry => Boolean(entry && canAccessRouteEntry(entry, access)))
      .map((entry) => ({
        ...entry,
        label: roleMobileLabels[entry.href] ?? entry.label
      }));
  }
  const primaryEntries = getPrimaryNavEntries(access, pathname, context);
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

export function getFamilyPrimaryNavEntries(access: ClientShellAccess): RouteTopologyEntry[] {
  if (!hasConfirmedRole(access, "parent")) return [];
  const order: FamilyMobileTab[] = ["home", "schedule", "messages", "family", "more"];
  return order
    .map((placement) => routeTopology.find((entry) => (
      entry.role === "parent" &&
      entry.navVisible &&
      entry.familyMobileTab === placement
    )))
    .filter((entry): entry is RouteTopologyEntry => Boolean(entry && canAccessRouteEntry(entry, access)));
}

export function getParentMoreDestinations(access: ClientShellAccess): RouteTopologyEntry[] {
  if (!hasConfirmedRole(access, "parent")) return [];
  return routeTopology.filter((entry) => (
    entry.href !== "/parent/more" &&
    "parentMoreDescription" in entry &&
    entry.parentMoreDescription &&
    canAccessRouteEntry(entry, access) &&
    (
      entry.role === "parent" ||
      entry.role === "support"
    )
  )).sort((left, right) => (
    ("parentMorePriority" in left ? left.parentMorePriority ?? 99 : 99) -
    ("parentMorePriority" in right ? right.parentMorePriority ?? 99 : 99)
  ));
}

export function resolveRouteAuthorityContext(
  access: ClientShellAccess,
  pathname: string,
  context: NavigationRoleContext = {}
): RouteAuthorityContext {
  const entry = getRouteEntry(pathname);
  const shellFamily = entry?.shellFamily ?? "neutral";
  const routeRequiredRole = routeRequiredRoleForEntry(entry);
  const neutralTransition = Boolean(entry?.neutralTransition);

  if (!access.signedIn) {
    return {
      entry,
      shellFamily: shellFamily === "public" ? "public" : "neutral",
      navigationRole: shellFamily === "public" ? "public" : undefined,
      source: "signed-out",
      routeRequiredRole,
      neutralTransition,
      ambiguous: false
    };
  }

  if (neutralTransition) {
    return {
      entry,
      shellFamily: "neutral",
      navigationRole: undefined,
      source: "neutral-transition",
      routeRequiredRole,
      neutralTransition,
      ambiguous: false
    };
  }

  if (routeRequiredRole) {
    const activeRole = hasConfirmedRole(access, routeRequiredRole) ? routeRequiredRole : undefined;
    return {
      entry,
      activeRole,
      shellFamily: activeRole === "parent" ? "family" : activeRole ? "staff" : "neutral",
      navigationRole: activeRole,
      dataScopeRole: activeRole,
      routeRequiredRole,
      source: activeRole ? "route-required" : "unsupported",
      neutralTransition,
      ambiguous: false
    };
  }

  const explicitRole = context.currentRole ?? context.preservedRole;
  if (explicitRole && hasConfirmedRole(access, explicitRole)) {
    return roleAuthority(entry, explicitRole, "explicit", neutralTransition);
  }

  if (access.activeRole && hasConfirmedRole(access, access.activeRole)) {
    return roleAuthority(entry, access.activeRole, access.activeRoleSource ?? "server-persisted", neutralTransition);
  }

  const confirmedRoles = confirmedProductRoles(access);
  if (confirmedRoles.length === 1) {
    return roleAuthority(entry, confirmedRoles[0], "single-role-inferred", neutralTransition);
  }

  const ambiguous = confirmedRoles.length > 1;
  return {
    entry,
    shellFamily: shellFamily === "public" ? "public" : "neutral",
    navigationRole: shellFamily === "public" ? "public" : undefined,
    source: ambiguous ? "ambiguous" : "unsupported",
    routeRequiredRole,
    neutralTransition,
    ambiguous
  };
}

export function resolveNavigationRole(
  access: ClientShellAccess,
  pathname: string,
  context: NavigationRoleContext = {}
): ProductRole | undefined {
  return resolveRouteAuthorityContext(access, pathname, context).activeRole;
}

export function getProductShellFamily(
  access: ClientShellAccess,
  pathname: string,
  context: NavigationRoleContext = {}
): Exclude<ShellFamily, "active-role"> {
  return resolveRouteAuthorityContext(access, pathname, context).shellFamily;
}

function resolvePrimaryNavigationRole(
  access: ClientShellAccess,
  entry: RouteTopologyEntry | undefined,
  context: NavigationRoleContext
): ProductRole | "public" | undefined {
  const family = entry?.primaryNavigationFamily ?? "public";
  if (family === "family") return hasConfirmedRole(access, "parent") ? "parent" : undefined;
  if (family === "coach" || family === "admin") return hasConfirmedRole(access, family) ? family : undefined;
  if (family === "active-role") return resolveRouteAuthorityContext(access, entry?.href ?? "/", context).navigationRole ?? "public";
  if (family === "none") return undefined;
  return "public";
}

function routeRequiredRoleForEntry(entry: RouteTopologyEntry | undefined): ProductRole | undefined {
  return entry?.role === "parent" || entry?.role === "coach" || entry?.role === "admin"
    ? entry.role
    : undefined;
}

function hasConfirmedRole(access: ClientShellAccess, role: ProductRole) {
  const capability = role === "parent"
    ? access.canParent
    : role === "coach"
      ? access.canCoach
      : access.canAdmin;
  return capability && Boolean(access.contexts?.some((context) => context.role === role));
}

function confirmedProductRoles(access: ClientShellAccess): ProductRole[] {
  return (["parent", "coach", "admin"] as const).filter((role) => hasConfirmedRole(access, role));
}

function roleAuthority(
  entry: RouteTopologyEntry | undefined,
  activeRole: ProductRole,
  source: RouteAuthoritySource,
  neutralTransition: boolean
): RouteAuthorityContext {
  const shellFamily = entry?.shellFamily === "active-role"
    ? activeRole === "parent" ? "family" : "staff"
    : entry?.shellFamily === "public" ? "public" : "neutral";
  return {
    entry,
    activeRole,
    shellFamily,
    navigationRole: activeRole,
    dataScopeRole: entry?.role === "shared" ? activeRole : undefined,
    routeRequiredRole: undefined,
    source,
    neutralTransition,
    ambiguous: false
  };
}

function getRoleSwitchEntries(access: ClientShellAccess, activeRole: RouteRole): RouteTopologyEntry[] {
  return access.roleSwitchLinks
    .filter((link) => link.role !== activeRole && hasConfirmedRole(access, link.role))
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
      requiresActiveAdmin: link.role === "admin",
      ...routeMetadataForRole(link.role)
    }));
}

function isRoleHomeSwitch(entry: RouteTopologyEntry, access: ClientShellAccess, activeRole: RouteRole) {
  if (entry.role === activeRole) return true;
  return access.roleSwitchLinks.some((link) => (
    link.href === entry.href &&
    link.role !== activeRole &&
    hasConfirmedRole(access, link.role)
  ));
}
