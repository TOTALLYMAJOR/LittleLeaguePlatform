import { describe, expect, it } from "vitest";
import {
  getCommandEntries,
  getFamilyPrimaryNavEntries,
  getMobileNavEntries,
  getParentMoreDestinations,
  getProductShellFamily,
  getPrimaryNavEntries,
  getRouteEntry,
  resolveRouteAuthorityContext,
  resolveNavigationRole,
  routeTopology,
  type ClientShellAccess,
  type ProductRole
} from "./route-topology";

function confirmedContext(role: ProductRole) {
  return {
    actorUserId: `user-${role}`,
    role,
    organizationId: "org-1",
    organizationName: "LeaguePilot Demo League",
    seasonId: "season-1",
    seasonName: "Spring 2026",
    teamId: role === "admin" ? undefined : `team-${role}`,
    teamName: role === "admin" ? undefined : `${role} team`,
    permittedTeamIds: role === "admin" ? ["team-parent", "team-coach"] : [`team-${role}`],
    permittedPlayerIds: role === "parent" ? ["player-1"] : [],
    contextKey: `${role}:org-1:season-1`,
    archived: false,
    readOnly: false
  };
}

const signedOut: ClientShellAccess = {
  signedIn: false,
  canParent: false,
  canCoach: false,
  canAdmin: false,
  roleSwitchLinks: []
};

const parent: ClientShellAccess = {
  signedIn: true,
  userId: "user-parent",
  canParent: true,
  canCoach: false,
  canAdmin: false,
  roleSwitchLinks: [{ href: "/parent", label: "Parent Home", role: "parent" }],
  contexts: [confirmedContext("parent")]
};

const signedInPending: ClientShellAccess = {
  signedIn: true,
  userId: "user-pending",
  canParent: false,
  canCoach: false,
  canAdmin: false,
  roleSwitchLinks: []
};

const coach: ClientShellAccess = {
  signedIn: true,
  userId: "user-coach",
  canParent: false,
  canCoach: true,
  canAdmin: false,
  roleSwitchLinks: [{ href: "/coach", label: "Coach Home", role: "coach" }],
  contexts: [confirmedContext("coach")]
};

const coachWithAdmin: ClientShellAccess = {
  signedIn: true,
  userId: "user-coach-admin",
  canParent: false,
  canCoach: true,
  canAdmin: true,
  roleSwitchLinks: [
    { href: "/coach", label: "Coach Home", role: "coach" },
    { href: "/admin", label: "Admin Overview", role: "admin" }
  ],
  contexts: [confirmedContext("coach"), confirmedContext("admin")]
};

const parentWithCoach: ClientShellAccess = {
  signedIn: true,
  userId: "user-parent-coach",
  canParent: true,
  canCoach: true,
  canAdmin: false,
  roleSwitchLinks: [
    { href: "/parent", label: "Parent Home", role: "parent" },
    { href: "/coach", label: "Coach Home", role: "coach" }
  ],
  contexts: [confirmedContext("parent"), confirmedContext("coach")]
};

const parentWithAdmin: ClientShellAccess = {
  signedIn: true,
  userId: "user-parent-admin",
  canParent: true,
  canCoach: false,
  canAdmin: true,
  roleSwitchLinks: [
    { href: "/parent", label: "Parent Home", role: "parent" },
    { href: "/admin", label: "Admin Overview", role: "admin" }
  ],
  contexts: [confirmedContext("parent"), confirmedContext("admin")]
};

const admin: ClientShellAccess = {
  signedIn: true,
  userId: "user-admin",
  canParent: false,
  canCoach: false,
  canAdmin: true,
  roleSwitchLinks: [{ href: "/admin", label: "Admin Overview", role: "admin" }],
  contexts: [confirmedContext("admin")]
};

const multiRole: ClientShellAccess = {
  signedIn: true,
  userId: "user-multi-role",
  canParent: true,
  canCoach: true,
  canAdmin: true,
  roleSwitchLinks: [
    { href: "/parent", label: "Parent Home", role: "parent" },
    { href: "/coach", label: "Coach Home", role: "coach" },
    { href: "/admin", label: "Admin Overview", role: "admin" }
  ],
  contexts: [
    confirmedContext("parent"),
    confirmedContext("coach"),
    confirmedContext("admin")
  ]
};

function hrefs(entries: Array<{ href: string }>) {
  return entries.map((entry) => entry.href);
}

function expectRouteAuthority(
  access: ClientShellAccess,
  pathname: string,
  expected: {
    role?: ProductRole;
    shell: "family" | "staff" | "neutral" | "public";
    source: string;
  },
  context: Parameters<typeof resolveRouteAuthorityContext>[2] = {}
) {
  const authority = resolveRouteAuthorityContext(access, pathname, context);

  expect(authority.activeRole).toBe(expected.role);
  expect(authority.dataScopeRole).toBe(expected.role);
  expect(authority.shellFamily).toBe(expected.shell);
  expect(authority.source).toBe(expected.source);
  if (expected.role) {
    expect(authority.navigationRole).toBe(expected.role);
  }
  return authority;
}

describe("route topology", () => {
  it("shows signed-out users only signup, calendar, and sign-in routes", () => {
    const nav = hrefs(getPrimaryNavEntries(signedOut, "/"));

    expect(nav).toEqual(["/registration", "/schedule", "/auth"]);
    expect(nav).not.toContain("/parent");
    expect(nav).not.toContain("/coach");
    expect(nav).not.toContain("/admin");
    expect(nav).not.toContain("/team-portal");
    expect(nav).not.toContain("/invite/recover");
  });

  it("shows signed-in pending users account, registration, and calendar without private role IA", () => {
    const nav = hrefs(getPrimaryNavEntries(signedInPending, "/"));

    expect(nav).toEqual(["/registration", "/schedule", "/account"]);
    expect(nav).not.toContain("/auth");
    expect(nav).not.toContain("/parent");
    expect(nav).not.toContain("/coach");
    expect(nav).not.toContain("/admin");
  });

  it("keeps the five primary family destinations separate from secondary and compatibility routes", () => {
    const nav = hrefs(getPrimaryNavEntries(parent, "/parent/schedule"));
    const command = hrefs(getCommandEntries(parent, "/parent/schedule"));
    const parentHome = getPrimaryNavEntries(parent, "/parent").find((entry) => entry.href === "/parent");

    expect(nav).toContain("/parent/schedule");
    expect(nav).toContain("/parent/messages");
    expect(nav).toContain("/parent/family-access");
    expect(nav).toContain("/parent/more");
    expect(parentHome?.label).toBe("Home");
    expect(command).toContain("/parent/practice-recaps");
    expect(nav).not.toContain("/parent/rsvp");
    expect(nav).not.toContain("/parent/settings");
    expect(nav).not.toContain("/schedule");
    expect(nav).not.toContain("/team-chat");
    expect(command).not.toContain("/prototype/index.html");
  });

  it("filters coach IA to canonical attendance and practice recap routes", () => {
    const nav = hrefs(getPrimaryNavEntries(coach, "/coach"));
    const coachHome = getPrimaryNavEntries(coach, "/coach").find((entry) => entry.href === "/coach");

    expect(nav).toContain("/coach/attendance");
    expect(nav).toContain("/coach/practice-recaps");
    expect(coachHome?.label).toBe("Today");
    expect(nav).not.toContain("/coach/rsvps");
    expect(nav).not.toContain("/coach/parent-replay");
    // /coach/settings renders the coach home surface, so it stays a
    // compatibility alias instead of a duplicate nav destination.
    expect(nav).not.toContain("/coach/settings");
    expect(getRouteEntry("/coach/settings")?.canonicalHref).toBe("/coach");
  });

  it("lets coach-admin users switch to admin home without showing full admin IA on coach routes", () => {
    const nav = hrefs(getPrimaryNavEntries(coachWithAdmin, "/coach/attendance"));
    const command = hrefs(getCommandEntries(coachWithAdmin, "/coach/attendance"));

    expect(nav).toContain("/coach/attendance");
    expect(nav).toContain("/admin");
    expect(command).toContain("/admin");
    expect(command).not.toContain("/admin/security-audit");
  });

  it("shows admin IA only to active admins", () => {
    const nav = hrefs(getPrimaryNavEntries(admin, "/admin/security-audit"));
    const adminHome = getPrimaryNavEntries(admin, "/admin").find((entry) => entry.href === "/admin");

    expect(nav).toContain("/admin/security-audit");
    expect(nav).toContain("/admin/message-delivery-review");
    expect(adminHome?.label).toBe("Overview");
    expect(nav).not.toContain("/admin/security");
    expect(nav).not.toContain("/admin/themes");
  });

  it("keeps mobile nav role-specific and prioritized", () => {
    expect(hrefs(getMobileNavEntries(parent, "/parent"))).toEqual([
      "/parent",
      "/parent/schedule",
      "/parent/messages",
      "/parent/family-access",
      "/parent/more"
    ]);
    expect(hrefs(getFamilyPrimaryNavEntries(parent))).toEqual([
      "/parent",
      "/parent/schedule",
      "/parent/messages",
      "/parent/family-access",
      "/parent/more"
    ]);
    expect(hrefs(getMobileNavEntries(coach, "/coach"))).toEqual([
      "/coach",
      "/coach/attendance",
      "/coach/practice-recaps",
      "/coach/messages",
      "/coach/roster"
    ]);
  });

  it("keeps compatibility and prototype routes hidden with canonical targets", () => {
    for (const href of ["/coach/rsvps", "/coach/parent-replay", "/admin/settings", "/admin/safety-weather", "/admin/themes", "/admin/security", "/admin/archive"]) {
      const entry = getRouteEntry(href);
      expect(entry?.lifecycle).toBe("compatibility");
      expect(entry?.canonicalHref).toBeTruthy();
      expect(entry?.navVisible).toBe(false);
      expect(entry?.commandVisible).toBe(false);
    }

    expect(getRouteEntry("/prototype/index.html")?.noindex).toBe(true);
    expect(routeTopology.every((entry) => entry.lifecycle !== "compatibility" || entry.canonicalHref)).toBe(true);
  });

  it("keeps shared team routes behind active role access", () => {
    const teamPortal = getRouteEntry("/team-portal");
    const teamChat = getRouteEntry("/team-chat");

    expect(teamPortal?.requiresAuth).toBe(true);
    expect(teamPortal?.allowedRoles).toEqual(["parent", "coach", "admin"]);
    expect(teamChat?.requiresAuth).toBe(true);
    expect(teamChat?.allowedRoles).toEqual(["parent", "coach", "admin"]);
  });

  it.each(["/team-chat", "/team-portal", "/account", "/"])(
    "retains Family navigation and shell context for a parent on %s",
    (pathname) => {
      const nav = hrefs(getPrimaryNavEntries(parent, pathname));
      expect(nav).toContain("/parent");
      expect(nav).toContain("/parent/messages");
      expect(nav).not.toContain("/coach");
      expect(resolveNavigationRole(parent, pathname)).toBe("parent");
      if (pathname === "/") {
        expect(getProductShellFamily(parent, pathname)).toBe("neutral");
      } else {
        expect(getProductShellFamily(parent, pathname)).toBe("family");
      }
    }
  );

  it("uses preserved role on shared routes but route-required staff roles take precedence", () => {
    const parentContext = { preservedRole: "parent" as const };

    expect(getProductShellFamily(multiRole, "/team-chat", parentContext)).toBe("family");
    expect(hrefs(getPrimaryNavEntries(multiRole, "/team-chat", parentContext))).toContain("/parent/messages");

    expect(resolveNavigationRole(multiRole, "/coach/messages", parentContext)).toBe("coach");
    expect(getProductShellFamily(multiRole, "/coach/messages", parentContext)).toBe("staff");
    expect(hrefs(getPrimaryNavEntries(multiRole, "/coach/messages", parentContext))).toContain("/coach/messages");
    expect(hrefs(getPrimaryNavEntries(multiRole, "/coach/messages", parentContext))).not.toContain("/parent/messages");
  });

  it("falls back to a neutral shell when a shared route has ambiguous multi-role membership", () => {
    expect(resolveNavigationRole(multiRole, "/account")).toBeUndefined();
    expect(getProductShellFamily(multiRole, "/account")).toBe("neutral");
  });

  it("does not grant Family navigation from canParent without confirmed context", () => {
    const capabilityOnly: ClientShellAccess = {
      signedIn: true,
      userId: "user-unresolved",
      canParent: true,
      canCoach: false,
      canAdmin: false,
      roleSwitchLinks: [{ href: "/parent", label: "Parent Home", role: "parent" }],
      contexts: []
    };

    expect(resolveNavigationRole(capabilityOnly, "/parent")).toBeUndefined();
    expect(getProductShellFamily(capabilityOnly, "/parent")).toBe("neutral");
    expect(getFamilyPrimaryNavEntries(capabilityOnly)).toEqual([]);
    expect(hrefs(getPrimaryNavEntries(capabilityOnly, "/parent"))).not.toContain("/parent");
  });

  it("classifies family, shared, support, public, and transition routes explicitly", () => {
    const expected = {
      "/parent": ["family", "family", "family", "home", false],
      "/parent/setup": ["family", "family", "family", "family", false],
      "/account": ["support", "active-role", "active-role", "more", false],
      "/team-chat": ["shared", "active-role", "active-role", "messages", false],
      "/team-portal": ["shared", "active-role", "active-role", "family", false],
      "/": ["public", "neutral", "active-role", "home", false],
      "/access/status": ["transition", "neutral", "none", undefined, true],
      "/invite/accept": ["transition", "neutral", "none", undefined, true]
    } as const;

    for (const [href, values] of Object.entries(expected)) {
      const entry = getRouteEntry(href);
      expect(entry).toBeDefined();
      expect([
        entry?.surfaceFamily,
        entry?.shellFamily,
        entry?.primaryNavigationFamily,
        entry?.familyMobileTab,
        entry?.neutralTransition
      ]).toEqual(values);
    }
  });

  it("keeps caregiver acceptance public but caregiver event data signed-in only", () => {
    const acceptance = getRouteEntry("/caregiver/accept");
    const portal = getRouteEntry("/caregiver");

    expect(acceptance?.requiresAuth).toBe(false);
    expect(acceptance?.allowedRoles).toEqual(["signed_out", "signed_in"]);
    expect(acceptance?.navVisible).toBe(false);
    expect(portal?.requiresAuth).toBe(true);
    expect(portal?.allowedRoles).toEqual(["signed_in"]);
    expect(portal?.navVisible).toBe(false);
  });

  it("resolves parent-only routes and shared data scope to the same Family authority", () => {
    expectRouteAuthority(parent, "/parent", {
      role: "parent",
      shell: "family",
      source: "route-required"
    });
    expectRouteAuthority(parent, "/team-chat", {
      role: "parent",
      shell: "family",
      source: "single-role-inferred"
    });
    expectRouteAuthority(parent, "/team-portal", {
      role: "parent",
      shell: "family",
      source: "single-role-inferred"
    });
  });

  it("resolves single-role staff users on shared routes without Family chrome", () => {
    expectRouteAuthority(coach, "/team-chat", {
      role: "coach",
      shell: "staff",
      source: "single-role-inferred"
    });
    expectRouteAuthority(coach, "/team-portal", {
      role: "coach",
      shell: "staff",
      source: "single-role-inferred"
    });
    expectRouteAuthority(admin, "/team-chat", {
      role: "admin",
      shell: "staff",
      source: "single-role-inferred"
    });
    expectRouteAuthority(admin, "/team-portal", {
      role: "admin",
      shell: "staff",
      source: "single-role-inferred"
    });
  });

  it.each([
    ["parent + coach", parentWithCoach],
    ["parent + admin", parentWithAdmin],
    ["coach + admin", coachWithAdmin],
    ["parent + coach + admin", multiRole]
  ] as const)("keeps ambiguous %s shared routes neutral before loading broader data", (_label, access) => {
    const authority = expectRouteAuthority(access, "/team-chat", {
      shell: "neutral",
      source: "ambiguous"
    });

    expect(authority.ambiguous).toBe(true);
    expect(authority.navigationRole).toBeUndefined();
    expect(hrefs(getPrimaryNavEntries(access, "/team-chat"))).not.toContain("/parent/messages");
  });

  it("honors explicit and server-persisted role context only when membership supports it", () => {
    expectRouteAuthority(parentWithCoach, "/team-chat", {
      role: "parent",
      shell: "family",
      source: "explicit"
    }, { currentRole: "parent" });
    expectRouteAuthority(parentWithCoach, "/team-chat", {
      role: "coach",
      shell: "staff",
      source: "explicit"
    }, { currentRole: "coach" });
    expectRouteAuthority(parentWithAdmin, "/team-portal", {
      role: "admin",
      shell: "staff",
      source: "explicit"
    }, { currentRole: "admin" });

    expectRouteAuthority(parent, "/team-chat", {
      role: "parent",
      shell: "family",
      source: "single-role-inferred"
    }, { preservedRole: "admin" });

    expectRouteAuthority({
      ...parentWithCoach,
      activeRole: "admin",
      activeRoleSource: "server-persisted"
    }, "/team-chat", {
      shell: "neutral",
      source: "ambiguous"
    });
  });

  it("keeps parent More guarded and topology-backed", () => {
    const signedOutAuthority = resolveRouteAuthorityContext(signedOut, "/parent/more");
    expect(signedOutAuthority).toMatchObject({
      shellFamily: "neutral",
      source: "signed-out"
    });
    expect(signedOutAuthority.activeRole).toBeUndefined();
    expect(signedOutAuthority.dataScopeRole).toBeUndefined();
    expect(getParentMoreDestinations(signedOut)).toEqual([]);

    const more = getParentMoreDestinations(parent);
    expect(hrefs(more)).toEqual([
      "/parent/practice-recaps",
      "/parent/photos",
      "/parent/transportation",
      "/parent/settings",
      "/account",
      "/invite/recover",
      "/offline"
    ]);
    expect(more.every((entry) => entry.parentMoreDescription)).toBe(true);
    expect(more.every((entry) => getRouteEntry(entry.href) === entry)).toBe(true);
  });

  it("keeps neutral transition routes neutral even for signed-in role holders", () => {
    for (const pathname of ["/access/status", "/invite/accept"]) {
      const authority = expectRouteAuthority({
        ...parent,
        activeRole: "parent",
        activeRoleSource: "server-persisted"
      }, pathname, {
        shell: "neutral",
        source: "neutral-transition"
      });

      expect(authority.neutralTransition).toBe(true);
      expect(authority.dataScopeRole).toBeUndefined();
    }
  });
});
