"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, CalendarDays, Menu, MessageCircle, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AppStateProvider } from "@/app/providers";
import { OfflineSyncStatus } from "@/components/offline-sync-status";
import { clearPrivateGameDayData } from "@/lib/offline/game-day-outbox";
import {
  getCommandEntries,
  getMobileNavEntries,
  getPrimaryNavEntries,
  getRouteEntry,
  getRouteParent,
  canAccessRouteEntry,
  isRouteActive,
  signedOutShellAccess,
  type ClientShellAccess,
  type RouteTopologyEntry
} from "@/lib/navigation/route-topology";
import { StatusBadge } from "./primitives";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const groups: RouteTopologyEntry["group"][] = [
  "Family",
  "Command",
  "Calendar",
  "Team",
  "Communication",
  "Replay",
  "Tools",
  "Launch",
  "Operations",
  "Trust & Safety",
  "Business",
  "Configuration",
  "League Ops",
  "Admin Tools",
  "Switch role",
  "Support"
];

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
    body: "Use this area for sign in, account status, invite recovery, temporary-care review, and support.",
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
  "/admin/security-audit": "Use this page to confirm role boundaries, access-policy proof, and audit evidence."
};

function getShellContext(pathname: string, access: ClientShellAccess) {
  const entry = getRouteEntry(pathname);
  if (entry && !canAccessRouteEntry(entry, access)) {
    return {
      title: "Access not available",
      body: "This account does not have access to the requested area. Private labels and navigation remain hidden.",
      tone: "support",
      badge: "Permission denied",
      badgeVariant: "warning" as const
    };
  }
  const roleHelp = routeHelpByRole[entry?.role ?? "public"];
  const title = entry?.label ? `${roleHelp.title}: ${entry.label}` : roleHelp.title;
  const body = entry?.href && routeHelpByHref[entry.href] ? routeHelpByHref[entry.href] : roleHelp.body;
  const signInRequired = Boolean(entry?.requiresAuth && !access.signedIn);
  const badge = signInRequired ? "Sign-in required" : access.signedIn ? "Signed in" : "Public entry";
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
  const [roleSwitchPending, setRoleSwitchPending] = useState<RouteTopologyEntry | null>(null);
  const [signOutPending, setSignOutPending] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const previousFocus = useRef<HTMLElement | null>(null);
  const commandDialogRef = useRef<HTMLDialogElement>(null);
  const commandInputRef = useRef<HTMLInputElement>(null);
  const navItems = useMemo(() => getPrimaryNavEntries(access, pathname), [access, pathname]);
  const commandItems = useMemo(() => getCommandEntries(access, pathname), [access, pathname]);
  const activeMobileItems = useMemo(() => getMobileNavEntries(access, pathname), [access, pathname]);
  const shellContext = useMemo(() => getShellContext(pathname, access), [access, pathname]);
  const activeRouteRole = getRouteEntry(pathname)?.role;
  const activeContext = access.contexts?.find((context) => context.role === activeRouteRole);
  const usesParentWeeklyShell = pathname === "/parent" && access.canParent;
  const usesImmersiveFamilyHeader = pathname === "/parent/messages" || usesParentWeeklyShell;
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
    if (item.group === "Switch role") {
      switchRole(item);
      return;
    }
    setCommandOpen(false);
    router.push(item.href);
  }

  function switchRole(item: RouteTopologyEntry) {
    setRoleSwitchPending(item);
    setCommandOpen(false);
    setCommandQuery("");
    for (const key of Object.keys(window.sessionStorage)) {
      if (key.startsWith("leaguepilot-context:")) window.sessionStorage.removeItem(key);
    }
    window.dispatchEvent(new CustomEvent("leaguepilot:context-reset", {
      detail: { nextRole: item.role, nextHref: item.href }
    }));
    window.location.assign(item.href);
  }

  async function signOut() {
    if (!access.userId || signOutPending) return;
    setSignOutPending(true);
    setSignOutError("");
    try {
      // The atomic owner clear increments every affected generation before it
      // deletes records. A replay already in flight therefore cannot settle
      // into a receipt or recreate private queue state after this resolves.
      await clearPrivateGameDayData(access.userId);
      window.dispatchEvent(new CustomEvent("leaguepilot:sign-out", {
        detail: { actorId: access.userId }
      }));
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      window.location.assign("/auth");
    } catch {
      setSignOutError("Sign-out could not safely clear private offline data. Try again before leaving this device.");
      setSignOutPending(false);
    }
  }

  if (!access.signedIn) {
    return (
      <AppStateProvider key="signed-out">
        <a className="skip-link" href="#main-content">Skip to main content</a>
        {isOffline ? (
          <div className="offline-banner" role="status" aria-live="assertive">
            You are offline. Saved pages may still be available, but current team details need a connection.
          </div>
        ) : null}
        <div className="public-app-shell">
          <header className="public-header">
            <Link href="/" className="public-brand" aria-label="LeaguePilot home">
              <span className="public-brand-mark">LP</span>
              <span className="public-brand-copy">
                <strong>LeaguePilot</strong>
                <small>Private youth sports operations</small>
              </span>
            </Link>
            <nav className="public-nav" aria-label="Public navigation">
              <Link href="/schedule">Schedule</Link>
              <Link className="button" href="/registration">Request Team Access</Link>
              <Link className="button secondary" href="/auth">Sign in</Link>
            </nav>
          </header>
          <main id="main-content" className="public-main">{children}</main>
        </div>
        <div id="live-region" aria-live="polite" aria-atomic="true">
          {isOffline ? "Offline mode active" : "Route ready"}
        </div>
      </AppStateProvider>
    );
  }

  return (
    <AppStateProvider key={activeContext?.contextKey ?? "signed-in-unresolved"}>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      {isOffline ? (
        <div className="offline-banner" role="status" aria-live="assertive">
          You are offline. Current team details may be unavailable until the connection returns.
        </div>
      ) : null}
      <div className={usesParentWeeklyShell
        ? "parent-weekly-app-shell"
        : `shell app-shell${collapsed ? " sidebar-collapsed" : ""}`}>
        {usesParentWeeklyShell ? (
          <header className="parent-weekly-header">
            <div className="parent-weekly-header-inner">
              <Link href="/parent" className="parent-weekly-brand" aria-label="LeaguePilot family home">
                <span className="parent-weekly-brand-mark">LP</span>
                <span>
                  <strong>LeaguePilot</strong>
                  <small>{activeContext?.teamName ?? "Family home"}</small>
                </span>
              </Link>
              <nav className="parent-weekly-header-nav" aria-label="Family shortcuts">
                <Link href="/parent/schedule" aria-label="Open family schedule">
                  <CalendarDays aria-hidden="true" size={20} />
                  <span>Schedule</span>
                </Link>
                <Link href="/parent/messages" aria-label="Open family messages">
                  <MessageCircle aria-hidden="true" size={20} />
                  <span>Messages</span>
                </Link>
                <Link href="/account" aria-label="Open account and notification settings">
                  <Bell aria-hidden="true" size={20} />
                  <span>Account</span>
                </Link>
                <button
                  type="button"
                  aria-label="Open all LeaguePilot pages"
                  onClick={() => setCommandOpen(true)}
                >
                  <Menu aria-hidden="true" size={21} />
                  <span>Menu</span>
                </button>
                <Link className="parent-weekly-avatar" href="/account" aria-label="Open parent account">
                  <ShieldCheck aria-hidden="true" size={18} />
                  <span className="sr-only">Verified parent account</span>
                </Link>
              </nav>
            </div>
          </header>
        ) : (
        <aside className="sidebar app-sidebar" aria-label="Primary">
          <div className="sidebar-video-backdrop" aria-hidden="true">
            <video
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              poster="/images/leaguepilot-game-day-parent.png"
              tabIndex={-1}
            >
              <source src="/videos/leaguepilot-sidebar-loop.webm" type="video/webm" />
            </video>
            <span />
          </div>
          <div className="sidebar-topline">
            <Link href="/" className="brand" aria-label="LeaguePilot home">
              <span className="brand-mark">LP</span>
              <span className="brand-copy">
                <strong>LeaguePilot</strong>
                <small>Little League HQ demo</small>
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
                      <Link
                        key={item.href}
                        href={item.href}
                        data-active={active ? "true" : undefined}
                        aria-current={active ? "page" : undefined}
                        title={item.label}
                        onClick={item.group === "Switch role" ? (event) => {
                          event.preventDefault();
                          switchRole(item);
                        } : undefined}
                      >
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
        )}

        <main
          id="main-content"
          className={usesParentWeeklyShell
            ? "main parent-weekly-main"
            : `main${usesImmersiveFamilyHeader ? " immersive-family-main" : ""}`}
        >
          {!usesImmersiveFamilyHeader ? (
            <>
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
              {activeContext ? (
                <div className="verified-context-bar" aria-label="Verified role and organization context">
                  <span><small>Role</small><strong>{activeContext.role}</strong></span>
                  <span><small>Organization</small><strong>{activeContext.organizationName}</strong></span>
                  <span><small>Season</small><strong>{activeContext.seasonName}</strong></span>
                  {activeContext.teamName ? <span><small>Team</small><strong>{activeContext.teamName}</strong></span> : null}
                  <span className={activeContext.readOnly ? "state-readonly" : "state-current"}>
                    <small>Access</small>
                    <strong>{activeContext.readOnly ? "Archived, read-only" : "Current access"}</strong>
                  </span>
                  <button type="button" className="secondary" disabled={signOutPending} onClick={() => void signOut()}>
                    {signOutPending ? "Signing out..." : "Sign out"}
                  </button>
                </div>
              ) : (
                <div className="verified-context-bar context-unavailable" role="status">
                  <span><small>Privacy</small><strong>Private team details stay hidden on this page</strong></span>
                </div>
              )}
            </>
          ) : null}
          {children}
          <OfflineSyncStatus actorId={access.userId} contextKey={activeContext?.contextKey} />
          {signOutError ? <p className="notice warning" role="alert">{signOutError}</p> : null}
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

      {roleSwitchPending ? (
        <div className="role-switch-transition" role="status" aria-live="assertive">
          <span className="role-switch-spinner" aria-hidden="true" />
          <div>
            <strong>Switching to {roleSwitchPending.role} view</strong>
            <small>Prior role data is being cleared. Access will be checked again by the server.</small>
          </div>
        </div>
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
            <span className="eyebrow">Quick navigation</span>
            <h2 id="route-finder-title">Go to a page</h2>
          </div>
          <button type="button" className="dialog-close" aria-label="Close route finder" onClick={() => setCommandOpen(false)}>
            x
          </button>
        </div>
        <label>
          Search pages
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
            placeholder="Type schedule, messages, teams, or safety"
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
                <small>{item.group} - {item.href}</small>
              </span>
            </button>
          ))}
        </div>
      </dialog>
    </AppStateProvider>
  );
}
