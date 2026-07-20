import { describe, expect, it } from "vitest";
import {
  getCommandEntries,
  getMobileNavEntries,
  getPrimaryNavEntries,
  getRouteEntry,
  routeTopology,
  type ClientShellAccess
} from "./route-topology";

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
  roleSwitchLinks: [{ href: "/parent", label: "Parent Home", role: "parent" }]
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
  roleSwitchLinks: [{ href: "/coach", label: "Coach Home", role: "coach" }]
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
  ]
};

const admin: ClientShellAccess = {
  signedIn: true,
  userId: "user-admin",
  canParent: false,
  canCoach: false,
  canAdmin: true,
  roleSwitchLinks: [{ href: "/admin", label: "Admin Overview", role: "admin" }]
};

function hrefs(entries: Array<{ href: string }>) {
  return entries.map((entry) => entry.href);
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

  it("filters parent IA away from shared and compatibility routes", () => {
    const nav = hrefs(getPrimaryNavEntries(parent, "/parent/schedule"));
    const command = hrefs(getCommandEntries(parent, "/parent/schedule"));
    const parentHome = getPrimaryNavEntries(parent, "/parent").find((entry) => entry.href === "/parent");

    expect(nav).toContain("/parent/schedule");
    expect(nav).toContain("/parent/messages");
    expect(parentHome?.label).toBe("Home");
    expect(command).toContain("/parent/practice-recaps");
    expect(nav).not.toContain("/schedule");
    expect(nav).not.toContain("/team-chat");
    expect(command).not.toContain("/prototype/index.html");
  });

  it("filters coach IA to canonical attendance and practice recap routes", () => {
    const nav = hrefs(getPrimaryNavEntries(coach, "/coach"));
    const coachHome = getPrimaryNavEntries(coach, "/coach").find((entry) => entry.href === "/coach");

    expect(nav).toContain("/coach/attendance");
    expect(nav).toContain("/coach/practice-recaps");
    expect(coachHome?.label).toBe("Home");
    expect(nav).not.toContain("/coach/rsvps");
    expect(nav).not.toContain("/coach/parent-replay");
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
      "/parent/settings"
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
    for (const href of ["/coach/rsvps", "/coach/parent-replay", "/admin/themes", "/admin/security", "/admin/archive"]) {
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
});
