import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const appRoutes = [
  "/",
  "/admin",
  "/admin/themes",
  "/admin/registrations",
  "/coach",
  "/offline",
  "/parent",
  "/registration",
  "/team-portal",
  "/team-chat",
  "/coach/parent-replay"
];

function pagePath(route: string) {
  return join(process.cwd(), "app", route === "/" ? "" : route.slice(1), "page.tsx");
}

describe("route smoke coverage", () => {
  it("keeps the primary mobile app routes backed by App Router pages", () => {
    for (const route of appRoutes) {
      expect(existsSync(pagePath(route)), `${route} should have a page.tsx`).toBe(true);
    }
  });

  it("keeps the PWA offline fallback route wired into the service worker", () => {
    const serviceWorker = readFileSync(join(process.cwd(), "public", "sw.js"), "utf8");

    expect(serviceWorker).toContain("\"/offline\"");
    expect(serviceWorker).toContain("caches.match(\"/offline\")");
  });

  it("keeps PWA install and standalone usage measurement wired", () => {
    const provider = readFileSync(join(process.cwd(), "app", "providers.tsx"), "utf8");

    expect(provider).toContain("/api/mobile-usage-events");
    expect(provider).toContain("install_prompt_shown");
    expect(provider).toContain("standalone_launch");
  });

  it("keeps season archive readiness proof documented", () => {
    const checklist = readFileSync(join(process.cwd(), "docs", "archive-readiness-checklist.md"), "utf8");

    expect(checklist).toContain("/api/admin/exports");
    expect(checklist).toContain("deleted chat message text");
    expect(checklist).toContain("read-only archived-season smoke check");
  });
});
