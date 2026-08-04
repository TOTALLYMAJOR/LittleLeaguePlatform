import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

type WorkerRequest = {
  method: string;
  mode: string;
  url: string;
};

type WorkerResponse = {
  ok: boolean;
  label: string;
  clone: () => WorkerResponse;
};

type CachePut = (request: string | WorkerRequest, response: WorkerResponse) => Promise<void>;

type FetchEvent = {
  request: WorkerRequest;
  respondWith: (response: Promise<unknown>) => void;
};

function response(label: string): WorkerResponse {
  return {
    ok: true,
    label,
    clone: () => response(`${label}:clone`)
  };
}

function serviceWorkerHarness(
  fetchImplementation: (request: string | WorkerRequest) => Promise<unknown>,
  cachedFallback?: WorkerResponse
) {
  const listeners = new Map<string, (event: FetchEvent) => void>();
  const cachePut = vi.fn<CachePut>(async () => undefined);
  const cacheOpen = vi.fn(async () => ({ put: cachePut }));
  const cacheMatch = vi.fn(async (request: string | WorkerRequest) => (
    request === "/offline.html" ? cachedFallback : undefined
  ));
  const serviceWorker = readFileSync(join(process.cwd(), "public", "sw.js"), "utf8");

  runInNewContext(serviceWorker, {
    URL,
    caches: {
      delete: vi.fn(async () => true),
      keys: vi.fn(async () => []),
      match: cacheMatch,
      open: cacheOpen
    },
    fetch: vi.fn(fetchImplementation),
    self: {
      addEventListener: (
        eventName: string,
        listener: (event: FetchEvent) => void
      ) => listeners.set(eventName, listener),
      clients: { claim: vi.fn() },
      location: { origin: "https://leaguepilot.test" },
      skipWaiting: vi.fn()
    }
  });

  async function dispatchFetch(request: WorkerRequest) {
    const listener = listeners.get("fetch");
    if (!listener) throw new Error("Service worker fetch listener was not registered.");
    let pendingResponse: Promise<unknown> | undefined;
    listener({
      request,
      respondWith: (nextResponse) => {
        pendingResponse = Promise.resolve(nextResponse);
      }
    });
    if (!pendingResponse) throw new Error("Service worker did not handle this request.");
    return pendingResponse;
  }

  return {
    cacheMatch,
    cacheOpen,
    cachePut,
    dispatchFetch
  };
}

describe("AppShell private sign-out boundary", () => {
  it("moves sign-out into Account while preserving the generation-fenced clear order", () => {
    const shell = readFileSync(join(process.cwd(), "components", "ui", "AppShell.tsx"), "utf8");
    const account = readFileSync(join(process.cwd(), "components", "feature-panels.tsx"), "utf8");
    const clearIndex = account.indexOf("await clearPrivateGameDayData(data.user.id)");
    const authIndex = account.indexOf("await supabase.auth.signOut()", clearIndex);
    const navigationIndex = account.indexOf('window.location.assign("/auth")', authIndex);

    expect(shell).not.toContain(">Sign out<");
    expect(account).toContain("Account security");
    expect(account).toContain("Sign out");
    expect(clearIndex).toBeGreaterThan(-1);
    expect(authIndex).toBeGreaterThan(clearIndex);
    expect(navigationIndex).toBeGreaterThan(authIndex);
    expect(account).toContain("if (error) throw error");
    expect(account).toContain("detail: { actorId: data.user.id }");
    expect(account).not.toContain("clearPrivateGameDayData()");
  });

  it("selects the Family shell and both navigation presentations from route topology", () => {
    const shell = readFileSync(join(process.cwd(), "components", "ui", "AppShell.tsx"), "utf8");

    expect(shell).toContain("getProductShellFamily");
    expect(shell).toContain("resolveRouteAuthorityContext");
    expect(shell).toContain("getFamilyPrimaryNavEntries");
    expect(shell).toContain("getMobileNavEntries");
    expect(shell).toContain("data-route-authority");
    expect(shell).toContain("data-data-scope-role");
    expect(shell).toContain('data-surface-family={usesFamilyShell ? "family" : undefined}');
    expect(shell).toContain('className="family-primary-link"');
    expect(shell).toContain('className="family-shell-context"');
    expect(shell).toContain("access.activeRole");
    expect(shell).toContain('fetch("/api/auth/active-role"');
    expect(shell).not.toContain('pathname === "/parent"');
    expect(shell).not.toContain('pathname.startsWith("/parent")');
    expect(shell).not.toContain("setPreservedRole");
  });

  it("offers the same explicit theme control in public, Family, and staff chrome", () => {
    const shell = readFileSync(join(process.cwd(), "components", "ui", "AppShell.tsx"), "utf8");
    const toggle = readFileSync(join(process.cwd(), "components", "ui", "ThemeToggle.tsx"), "utf8");

    expect(shell.match(/<ThemeToggle/g)).toHaveLength(3);
    expect(toggle).toContain("COLOR_THEME_STORAGE_KEY");
    expect(toggle).toContain("document.documentElement.dataset.theme");
    expect(toggle).toContain("useSyncExternalStore");
    expect(toggle).not.toContain("useEffect");
    expect(toggle).toContain("Use ${nextTheme} mode");
    expect(toggle).not.toContain("matchMedia");
    expect(toggle).not.toContain("prefers-color-scheme");
  });

  it("wires queue and replay to current actor, session, and owner-generation checks", () => {
    const source = readFileSync(join(process.cwd(), "components", "feature-panels.tsx"), "utf8");
    const replaySession = source.slice(
      source.indexOf("async function getOfflineReplaySession"),
      source.indexOf("function mediaReviewPriority")
    );
    const parentOffline = source.slice(
      source.indexOf("export function ParentRsvpClient"),
      source.indexOf("export function CoachDashboardClient")
    );
    const coachOffline = source.slice(
      source.indexOf("export function CoachDashboardClient"),
      source.indexOf("export function AdminDashboard")
    );

    expect(replaySession).toContain("session?.user.id !== expectedActorId");
    expect(replaySession).toContain("session.expires_at * 1000 <= Date.now()");
    expect(replaySession).toContain("await supabase.auth.getUser()");
    expect(replaySession).toContain("userData.user?.id !== expectedActorId");
    expect(replaySession).toContain("queueOfflineGameDayAction(action, expectedOwnerGeneration)");
    expect(parentOffline).toContain('dashboardData?.accessStatus === "live"');
    expect(parentOffline).toContain("dashboardData.isSupabaseBacked");
    expect(parentOffline).toContain("captureOfflineOwnerGeneration(parentUserId)");
    expect(parentOffline).toContain("queueOfflineActionForCurrentSession");
    expect(coachOffline).toContain('dashboardData?.accessStatus === "live"');
    expect(coachOffline).toContain("dashboardData.isSupabaseBacked");
    expect(coachOffline).toContain("captureOfflineOwnerGeneration(coachId)");
    expect(coachOffline).toContain("queueOfflineActionForCurrentSession");
  });

  it("keeps the cold static fallback actor-neutral and storage-blind", () => {
    const fallback = readFileSync(join(process.cwd(), "public", "offline.html"), "utf8");

    expect(fallback).toContain('role="status"');
    expect(fallback).toContain('aria-live="polite"');
    expect(fallback).not.toContain("indexedDB");
    expect(fallback).not.toContain("queued-count");
    expect(fallback).not.toContain("receipt-count");
    expect(fallback).not.toContain("<script");
  });
});

describe("private-safe service worker behavior", () => {
  it.each(["/offline", "/parent", "/coach", "/admin"])(
    "returns network navigation %s without writing it to cache",
    async (pathname) => {
      const networkResponse = response(`network:${pathname}`);
      const harness = serviceWorkerHarness(async () => networkResponse);

      await expect(harness.dispatchFetch({
        method: "GET",
        mode: "navigate",
        url: `https://leaguepilot.test${pathname}`
      })).resolves.toBe(networkResponse);
      expect(harness.cacheOpen).not.toHaveBeenCalled();
      expect(harness.cachePut).not.toHaveBeenCalled();
      expect(harness.cacheMatch).not.toHaveBeenCalled();
    }
  );

  it("returns the static fallback after a failed navigation without caching private HTML", async () => {
    const fallback = response("offline-fallback");
    const harness = serviceWorkerHarness(
      async () => {
        throw new Error("offline");
      },
      fallback
    );

    await expect(harness.dispatchFetch({
      method: "GET",
      mode: "navigate",
      url: "https://leaguepilot.test/parent"
    })).resolves.toBe(fallback);
    expect(harness.cacheMatch).toHaveBeenCalledWith("/offline.html");
    expect(harness.cacheOpen).not.toHaveBeenCalled();
    expect(harness.cachePut).not.toHaveBeenCalled();
  });

  it("may cache same-origin static assets", async () => {
    const networkResponse = response("static-chunk");
    const harness = serviceWorkerHarness(async () => networkResponse);
    const request: WorkerRequest = {
      method: "GET",
      mode: "no-cors",
      url: "https://leaguepilot.test/_next/static/chunks/app.js"
    };

    await expect(harness.dispatchFetch(request)).resolves.toBe(networkResponse);
    expect(harness.cacheMatch).toHaveBeenCalledWith(request);
    expect(harness.cacheOpen).toHaveBeenCalledWith("little-league-hq-runtime-2026.07.29.1");
    expect(harness.cachePut).toHaveBeenCalledTimes(1);
    expect(harness.cachePut.mock.calls[0]?.[0]).toBe(request);
    expect(harness.cachePut.mock.calls[0]?.[1]).toMatchObject({
      label: "static-chunk:clone"
    });
  });
});
