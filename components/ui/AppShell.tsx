"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AppStateProvider } from "@/app/providers";
import {
  getCommandEntries,
  getMobileNavEntries,
  getPrimaryNavEntries,
  getRouteEntry,
  getRouteParent,
  isRouteActive,
  signedOutShellAccess,
  type ClientShellAccess,
  type RouteTopologyEntry
} from "@/lib/navigation/route-topology";
import { StatusBadge } from "./primitives";

const groups: RouteTopologyEntry["group"][] = ["Family", "Coach", "League Ops", "Admin Tools", "Switch role", "Support"];

const routeHelpByRole: Record<RouteTopologyEntry["role"], { title: string; body: string; tone: string }> = {
  public: {
    title: "Start here",
    body: "Sign in, sign up, or check the public calendar before private team tools unlock.",
    tone: "public"
  },
  parent: {
    title: "Family tools",
    body: "Use this area for the next game, RSVP, messages, photos, and coach-approved practice help.",
    tone: "family"
  },
  coach: {
    title: "Coach tools",
    body: "Use this area for attendance, practice recaps, team messages, roster, weather, and planning.",
    tone: "coach"
  },
  admin: {
    title: "League office",
    body: "Use this area for registration, team setup, safety review, media review, providers, and audit proof.",
    tone: "admin"
  },
  support: {
    title: "Account help",
    body: "Use this area for sign in, account status, invite recovery, and support paths.",
    tone: "support"
  },
  shared: {
    title: "Shared team surface",
    body: "This route reuses one private team surface and scopes what appears by your active role.",
    tone: "shared"
  },
  prototype: {
    title: "Prototype reference",
    body: "This is the preserved static prototype, not the live production app surface.",
    tone: "support"
  }
};

const routeHelpByHref: Record<string, string> = {
  "/registration": "Families submit a request here. Admin approval is still required before any private access appears.",
  "/auth": "Use the role-specific email and password, then the shell will show only the pages that role can open.",
  "/schedule": "Public calendar view. Private team details still require an approved account role.",
  "/parent": "Start with the next event card, then answer RSVP or open messages if a coach needs a response.",
  "/parent/rsvp": "Pick going, maybe, or not going for linked children only.",
  "/coach": "Start with readiness: RSVP gaps, snack or volunteer needs, weather drafts, and practice follow-up.",
  "/coach/practice-recaps": "Paste YouTube drill references, pick practice focus areas, and review drafts before anything is published.",
  "/admin": "Start here to see review queues, registration status, setup gaps, and safety/provider boundaries.",
  "/admin/registrations": "Approve or reject pending registration requests before families receive private access.",
  "/admin/media-review": "Review reported media and approve or reject coach drill video sources and videos.",
  "/admin/teams": "Set up active teams, seasons, divisions, and roster readiness before inviting families.",
  "/admin/security-audit": "Use this page to confirm role boundaries, RLS proof, and audit evidence."
};

function getShellContext(pathname: string, access: ClientShellAccess) {
  const entry = getRouteEntry(pathname);
  const roleHelp = routeHelpByRole[entry?.role ?? "public"];
  const title = entry?.label ? `${roleHelp.title}: ${entry.label}` : roleHelp.title;
  const body = entry?.href && routeHelpByHref[entry.href] ? routeHelpByHref[entry.href] : roleHelp.body;
  const signInRequired = Boolean(entry?.requiresAuth && !access.signedIn);
  const badge = signInRequired ? "Sign-in required" : access.signedIn ? "Role scoped" : "Public entry";
  const badgeVariant = signInRequired ? "warning" : access.signedIn ? "info" : "neutral";
  return { ...roleHelp, title, body, badge, badgeVariant: badgeVariant as "warning" | "info" | "neutral" };
}

export function AppShell({ access = signedOutShellAccess, children }: { access?: ClientShellAccess; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [hasHydrated, setHasHydrated] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [commandIndex, setCommandIndex] = useState(0);
  const [isOffline, setIsOffline] = useState(false);
  const [sessionWarningVisible, setSessionWarningVisible] = useState(false);
  const previousFocus = useRef<HTMLElement | null>(null);
  const commandDialogRef = useRef<HTMLDialogElement>(null);
  const commandInputRef = useRef<HTMLInputElement>(null);
  const navItems = useMemo(() => getPrimaryNavEntries(access, pathname), [access, pathname]);
  const commandItems = useMemo(() => getCommandEntries(access, pathname), [access, pathname]);
  const activeMobileItems = useMemo(() => getMobileNavEntries(access, pathname), [access, pathname]);
  const shellContext = useMemo(() => getShellContext(pathname, access), [access, pathname]);
  const showMobileTabbar = access.signedIn && (access.canParent || access.canCoach || access.canAdmin) && activeMobileItems.length >= 3;

  const filteredNav = useMemo(() => {
    const query = commandQuery.trim().toLowerCase();
    if (!query) return commandItems;
    return commandItems.filter((item) => `${item.label} ${item.group} ${item.href}`.toLowerCase().includes(query));
  }, [commandItems, commandQuery]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setHasHydrated(true);
      setIsOffline(!navigator.onLine);
      const saved = window.localStorage.getItem("little-league-shell-collapsed");
      setCollapsed(saved === "true");
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    window.localStorage.setItem("little-league-shell-collapsed", String(collapsed));
  }, [collapsed, hasHydrated]);

  useEffect(() => {
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setSessionWarningVisible(true), 1000 * 60 * 20);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const dialog = commandDialogRef.current;
    if (!dialog) return;
    if (commandOpen) {
      previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      if (!dialog.open) dialog.showModal();
      window.setTimeout(() => commandInputRef.current?.focus(), 0);
      return;
    }
    if (dialog.open) dialog.close();
    previousFocus.current?.focus();
  }, [commandOpen]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setCommandOpen(false);
      setCommandQuery("");
      setCommandIndex(0);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  function openCommandRoute(item: RouteTopologyEntry) {
    setCommandOpen(false);
    router.push(item.href);
  }

  return (
    <AppStateProvider>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      {isOffline ? (
        <div className="offline-banner" role="status" aria-live="assertive">
          You are offline. Some features may be unavailable until Supabase reconnects.
        </div>
      ) : null}
      <div className={`shell app-shell${collapsed ? " sidebar-collapsed" : ""}`}>
        <aside className="sidebar app-sidebar" aria-label="Primary">
          <div className="sidebar-topline">
            <Link href="/" className="brand" aria-label="Little League HQ home">
              <span className="brand-mark">LL</span>
              <span className="brand-copy">
                <strong>Little League HQ</strong>
                <small>Private season operations</small>
              </span>
            </Link>
            <button
              type="button"
              className="icon-btn sidebar-collapse"
              aria-expanded={!collapsed}
              aria-controls="app-primary-nav"
              aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
              onClick={() => setCollapsed((value) => !value)}
            >
              {collapsed ? "+" : "-"}
            </button>
          </div>

          <button type="button" className="command-launch" onClick={() => setCommandOpen(true)}>
            <span>Search routes</span>
            <kbd>Ctrl K</kbd>
          </button>

          <nav className="nav" id="app-primary-nav" aria-label="Main navigation">
            {groups.map((group) => {
              const items = navItems.filter((item) => item.group === group);
              if (!items.length) return null;
              return (
                <div className="nav-group" key={group}>
                  <small className="nav-section">{group}</small>
                  {items.map((item) => {
                    const active = isRouteActive(pathname, item.href);
                    return (
                      <Link key={item.href} href={item.href} data-active={active ? "true" : undefined} aria-current={active ? "page" : undefined} title={item.label}>
                        <span className="nav-icon" aria-hidden="true">{item.short}</span>
                        <span className="nav-label">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </nav>
        </aside>

        <main id="main-content" className="main">
          <div className={`context-bar context-bar-${shellContext.tone}`} aria-label="Current app area">
            <div className="context-copy">
              <span className="context-kicker">You are here</span>
              <strong>{shellContext.title}</strong>
              <small>{shellContext.body}</small>
            </div>
            <div className="context-actions">
              <button type="button" className="secondary context-back" onClick={() => (window.history.length > 1 ? router.back() : router.push(getRouteParent(pathname)))}>
                Back
              </button>
              <StatusBadge label={shellContext.badge} variant={shellContext.badgeVariant} />
            </div>
          </div>
          {children}
        </main>

        {showMobileTabbar ? (
          <nav className="mobile-tabbar" aria-label="Mobile navigation">
            {activeMobileItems.map((item) => {
              const active = isRouteActive(pathname, item.href);
              return (
                <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} data-active={active ? "true" : undefined}>
                  <span>{item.short}</span>
                  <small>{item.label.replace("Parent ", "")}</small>
                </Link>
              );
            })}
          </nav>
        ) : null}
      </div>

      {sessionWarningVisible ? (
        <aside className="session-warning" role="status" aria-live="polite">
          <StatusBadge label="Pending review" variant="warning" />
          <span>Your session will need a fresh sign-in soon. Drafts stay in this browser until submitted.</span>
          <button type="button" className="secondary" onClick={() => setSessionWarningVisible(false)}>Dismiss</button>
        </aside>
      ) : null}

      <div id="live-region" aria-live="polite" aria-atomic="true">
        {isOffline ? "Offline mode active" : "Route ready"}
      </div>

      <dialog
        ref={commandDialogRef}
        className="command-dialog"
        aria-labelledby="route-finder-title"
        onCancel={(event) => {
          event.preventDefault();
          setCommandOpen(false);
        }}
        onClick={(event) => {
          if (event.target === commandDialogRef.current) setCommandOpen(false);
        }}
      >
        <div className="dialog-header">
          <div>
            <span className="eyebrow">Route finder</span>
            <h2 id="route-finder-title">Open a route</h2>
          </div>
          <button type="button" className="dialog-close" aria-label="Close route finder" onClick={() => setCommandOpen(false)}>
            x
          </button>
        </div>
        <label>
          Search routes
          <input
            ref={commandInputRef}
            value={commandQuery}
            onChange={(event) => {
              setCommandQuery(event.target.value);
              setCommandIndex(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setCommandIndex((index) => Math.min(filteredNav.length - 1, index + 1));
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setCommandIndex((index) => Math.max(0, index - 1));
              }
              if (event.key === "Enter" && filteredNav[commandIndex]) {
                event.preventDefault();
                openCommandRoute(filteredNav[commandIndex]);
              }
            }}
            placeholder="Type schedule, messages, branding, or safety"
          />
        </label>
        <div className="command-results" role="listbox" aria-label="Route results">
          {filteredNav.map((item, index) => (
            <button
              type="button"
              key={item.href}
              role="option"
              aria-selected={index === commandIndex}
              data-active={index === commandIndex ? "true" : undefined}
              onMouseEnter={() => setCommandIndex(index)}
              onClick={() => openCommandRoute(item)}
            >
              <span className="nav-icon" aria-hidden="true">{item.short}</span>
              <span>
                <strong>{item.label}</strong>
                <small>{item.group} · {item.href}</small>
              </span>
            </button>
          ))}
        </div>
      </dialog>
    </AppStateProvider>
  );
}
