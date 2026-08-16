"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, Search, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AppStateProvider } from "@/app/providers";
import { OfflineSyncStatus } from "@/components/offline-sync-status";
import {
  getCommandEntries,
  getFamilyPrimaryNavEntries,
  getMobileNavEntries,
  getProductShellFamily,
  getPrimaryNavEntries,
  getRouteEntry,
  getRouteParent,
  resolveRouteAuthorityContext,
  resolveNavigationRole,
  canAccessRouteEntry,
  isNavigationEntryActive,
  signedOutShellAccess,
  type ClientShellAccess,
  type RouteTopologyEntry
} from "@/lib/navigation/route-topology";
import { formatBadgeCount, getAttentionBadge } from "@/lib/navigation/shell-attention";
import { StatusBadge } from "./primitives";
import { RouteIcon } from "./route-icons";
import { ThemeToggle } from "./ThemeToggle";

/**
 * Sidebar section order. Highest-frequency work first, configuration and
 * account last, so the top of the sidebar always holds the daily jobs.
 */
const groups: RouteTopologyEntry["group"][] = [
  "Family",
  "Today",
  "Team",
  "Schedule",
  "Communication",
  "Registration & Access",
  "Season Operations",
  "Trust & Safety",
  "League Setup",
  "Public",
  "Switch role",
  "Account"
];

const roleToneByRole: Record<RouteTopologyEntry["role"], string> = {
  public: "public",
  parent: "family",
  coach: "coach",
  admin: "admin",
  support: "support",
  shared: "shared",
  prototype: "support"
};

const roleDisplayName: Record<string, string> = {
  parent: "Parent",
  coach: "Coach",
  admin: "League admin"
};

const routeHelpByHref: Record<string, string> = {
  "/registration": "Families request access here. Someone from the league office reviews every request before private details appear.",
  "/auth": "Sign in with your email and password. You will only see the pages your role can open.",
  "/schedule": "The public calendar. Team details stay private until your account is approved.",
  "/parent": "Start with the next event card, then answer RSVP or open messages if a coach needs a response.",
  "/parent/rsvp": "Pick going, maybe, or not going for linked children only.",
  "/coach": "Start with what needs you today: missing RSVPs, snack and volunteer gaps, weather, and practice follow-up.",
  "/coach/practice-recaps": "Add YouTube drill links, pick what you worked on, and review the draft before families see it.",
  "/team-portal": "Team details and approved photos that are safe for families to see.",
  "/admin": "Start here to see what is waiting on you: registrations, setup gaps, and anything about to reach families.",
  "/admin/registrations": "Approve or reject pending registration requests before families receive private access.",
  "/admin/media-review": "Review reported photos and approve or reject the drill videos coaches want to use.",
  "/admin/teams": "Set up teams, seasons, divisions, and rosters before you invite families.",
  "/admin/security-audit": "Confirm that each role can only see what it should, and review a record of sensitive changes."
};

/**
 * Resolves the one-line shell context strip. Page purpose now lives in each
 * page's own header, so the strip carries only identity, blocking access
 * states, and optional route help behind a disclosure.
 */
function getShellContext(pathname: string, access: ClientShellAccess) {
  const entry = getRouteEntry(pathname);
  if (entry && !canAccessRouteEntry(entry, access)) {
    return {
      tone: "support",
      help: undefined,
      blocked: {
        title: "Access not available",
        body: "This account does not have access to the requested area. Private labels and navigation remain hidden."
      }
    };
  }
  const signInRequired = Boolean(entry?.requiresAuth && !access.signedIn);
  return {
    tone: roleToneByRole[entry?.role ?? "public"],
    help: entry?.href ? routeHelpByHref[entry.href] : undefined,
    blocked: signInRequired
      ? {
        title: "Sign-in required",
        body: "Sign in with an approved account to open this area. Private team details stay hidden until then."
      }
      : undefined
  };
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
  const previousFocus = useRef<HTMLElement | null>(null);
  const commandDialogRef = useRef<HTMLDialogElement>(null);
  const commandInputRef = useRef<HTMLInputElement>(null);
  const routeRole = getRouteEntry(pathname)?.role;
  const explicitRouteRole = routeRole === "parent" || routeRole === "coach" || routeRole === "admin"
    ? routeRole
    : undefined;
  const navigationContext = useMemo(
    () => ({ currentRole: explicitRouteRole ?? access.activeRole }),
    [access.activeRole, explicitRouteRole]
  );
  const navItems = useMemo(
    () => getPrimaryNavEntries(access, pathname, navigationContext),
    [access, navigationContext, pathname]
  );
  const commandItems = useMemo(
    () => getCommandEntries(access, pathname, navigationContext),
    [access, navigationContext, pathname]
  );
  const activeMobileItems = useMemo(
    () => getMobileNavEntries(access, pathname, navigationContext),
    [access, navigationContext, pathname]
  );
  const familyNavItems = useMemo(() => getFamilyPrimaryNavEntries(access), [access]);
  const shellContext = useMemo(() => getShellContext(pathname, access), [access, pathname]);
  const routeAuthority = resolveRouteAuthorityContext(access, pathname, navigationContext);
  const activeProductRole = resolveNavigationRole(access, pathname, navigationContext);
  const activeContext = access.contexts?.find((context) => context.role === activeProductRole);
  const roleAttentionBadges = (access.attentionBadges ?? []).filter((badge) => (
    activeProductRole ? badge.href.startsWith(`/${activeProductRole}/`) : false
  ));
  const roleAttentionCount = roleAttentionBadges.reduce((total, badge) => total + badge.count, 0);
  const attentionSummary = access.attentionStatus === "error"
    ? "Task counts unavailable"
    : roleAttentionCount > 0
      ? `${roleAttentionCount} ${roleAttentionCount === 1 ? "item needs" : "items need"} attention`
      : "All caught up";
  const productShellFamily = getProductShellFamily(access, pathname, navigationContext);
  const usesFamilyShell = productShellFamily === "family";
  const usesImmersiveFamilyHeader = usesFamilyShell;
  const usesPublicGateway = pathname === "/";
  const brandHomeHref = activeProductRole === "coach"
    ? "/coach"
    : activeProductRole === "admin"
      ? "/admin"
      : activeProductRole === "parent"
        ? "/parent"
        : "/";
  const showMobileTabbar = Boolean(activeProductRole) && activeMobileItems.length >= 3;

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

  async function switchRole(item: RouteTopologyEntry) {
    setRoleSwitchPending(item);
    if (access.userId && (item.role === "parent" || item.role === "coach" || item.role === "admin")) {
      window.sessionStorage.setItem(`leaguepilot-shell-role:${access.userId}`, item.role);
      try {
        await fetch("/api/auth/active-role", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ role: item.role })
        });
      } catch {
        // The destination route still enforces role access server-side.
      }
    }
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

  if (!access.signedIn) {
    return (
      <AppStateProvider key="signed-out">
        <a className="skip-link" href="#main-content">Skip to main content</a>
        {isOffline ? (
          <div className="offline-banner" role="status" aria-live="assertive">
            You are offline. Saved pages may still be available, but current team details need a connection.
          </div>
        ) : null}
        <div className={`public-app-shell${usesPublicGateway ? " public-app-shell-gateway" : ""}`}>
          <header className={`public-header${usesPublicGateway ? " public-header-gateway" : ""}`}>
            <Link href="/" className="public-brand" aria-label="LeaguePilot home">
              <span className="public-brand-mark">LP</span>
              <span className="public-brand-copy">
                <strong>LeaguePilot</strong>
                <small>Private youth sports operations</small>
              </span>
            </Link>
            <nav className="public-nav" aria-label="Public navigation">
              <Link href="/schedule">Schedule</Link>
              {usesPublicGateway ? <Link href="/sponsors">Sponsors</Link> : <Link className="button" href="/registration">Request Team Access</Link>}
              <Link className="button secondary" href="/auth">Sign in</Link>
              <ThemeToggle />
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
      <div
        data-product-shell={usesFamilyShell ? "family" : productShellFamily}
        data-surface-family={usesFamilyShell ? "family" : undefined}
        data-route-authority={routeAuthority.source}
        data-resolved-role={routeAuthority.activeRole}
        data-data-scope-role={routeAuthority.dataScopeRole}
        className={usesFamilyShell
        ? "parent-weekly-app-shell"
        : `shell app-shell${collapsed ? " sidebar-collapsed" : ""}`}
      >
        {usesFamilyShell ? (
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
                {familyNavItems.map((item) => {
                  const active = isNavigationEntryActive(pathname, item);
                  const attention = getAttentionBadge(access.attentionBadges, item.href);
                  return (
                    <Link
                      className="family-primary-link"
                      key={item.href}
                      href={item.href}
                      aria-label={attention ? `${item.label}, ${attention.label}` : item.label}
                      aria-current={active ? "page" : undefined}
                      data-active={active ? "true" : undefined}
                    >
                      <RouteIcon href={item.href} short={item.short} role={item.role} size={20} />
                      <span>{item.label}</span>
                      {attention ? (
                        <span className="parent-weekly-nav-attention" aria-label={attention.label}>
                          {formatBadgeCount(attention.count)} {attention.meaning}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
                <button
                  type="button"
                  aria-label="Open all LeaguePilot pages"
                  onClick={() => setCommandOpen(true)}
                >
                  <Menu aria-hidden="true" size={21} />
                  <span>Menu</span>
                </button>
                <ThemeToggle compact />
                <Link className="parent-weekly-avatar" href="/account" aria-label="Open parent account">
                  <ShieldCheck aria-hidden="true" size={18} />
                  <span className="sr-only">Verified parent account</span>
                </Link>
              </nav>
            </div>
            {activeContext ? (
              <details className="family-shell-context" aria-label="Verified family context">
                <summary>
                  <strong>Parent · {activeContext.organizationName} · {activeContext.teamName ?? "Family teams"}</strong>
                  {activeContext.readOnly ? <span className="badge warning">Archived</span> : null}
                  <small>Context details</small>
                </summary>
                <div className="family-shell-context-details">
                  <span><small>Role</small><strong>Parent</strong></span>
                  <span><small>Organization</small><strong>{activeContext.organizationName}</strong></span>
                  <span><small>Season</small><strong>{activeContext.seasonName}</strong></span>
                  <span><small>Team</small><strong>{activeContext.teamName ?? "Family teams"}</strong></span>
                  <span><small>Family</small><strong>{activeContext.permittedPlayerIds.length} linked {activeContext.permittedPlayerIds.length === 1 ? "player" : "players"}</strong></span>
                  <span><small>Access</small><strong>{activeContext.readOnly ? "Archived, read-only" : "Current access"}</strong></span>
                </div>
              </details>
            ) : (
              <div className="family-shell-context family-shell-context-unavailable" role="status">
                Private team details stay hidden until parent access is confirmed.
              </div>
            )}
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
            <Link href={brandHomeHref} className="brand" aria-label="LeaguePilot home">
              <span className="brand-mark">LP</span>
              <span className="brand-copy">
                <strong>LeaguePilot</strong>
                <small>{activeContext?.organizationName ?? "Youth sports operations"}</small>
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
                    const active = isNavigationEntryActive(pathname, item);
                    const attention = getAttentionBadge(access.attentionBadges, item.href);
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
                        <span className="nav-icon" aria-hidden="true">
                          <RouteIcon href={item.href} short={item.short} role={item.role} />
                        </span>
                        <span className="nav-label">{item.label}</span>
                        {attention ? (
                          <span className="nav-attention-badge" aria-label={attention.label}>
                            {formatBadgeCount(attention.count)} {attention.meaning}
                          </span>
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </nav>

          <div className="sidebar-footer">
            <button type="button" className="command-launch" onClick={() => setCommandOpen(true)}>
              <span className="nav-icon" aria-hidden="true"><Search size={16} /></span>
              <span>Find a page</span>
              <kbd aria-hidden="true">⌘K</kbd>
            </button>
          </div>
        </aside>
        )}

        {!usesFamilyShell ? (
          <header className="staff-mobile-bar">
            <Link href={brandHomeHref} className="staff-mobile-brand" aria-label="LeaguePilot home">
              <span className="brand-mark" aria-hidden="true">LP</span>
              <span>{activeContext?.organizationName ?? "LeaguePilot"}</span>
            </Link>
            <button type="button" className="secondary staff-mobile-menu" onClick={() => setCommandOpen(true)}>
              <Menu aria-hidden="true" size={18} />
              <span>All pages</span>
              {roleAttentionCount ? (
                <span className="staff-mobile-menu-count" aria-label={attentionSummary}>
                  {formatBadgeCount(roleAttentionCount)}
                </span>
              ) : null}
            </button>
          </header>
        ) : null}

        <main
          id="main-content"
          className={usesFamilyShell
            ? "main parent-weekly-main"
            : `main${usesImmersiveFamilyHeader ? " immersive-family-main" : ""}`}
        >
          {!usesImmersiveFamilyHeader ? (
            <>
              {shellContext.blocked ? (
                <section className="notice warning shell-access-notice" role="status">
                  <strong>{shellContext.blocked.title}</strong>
                  <p>{shellContext.blocked.body}</p>
                </section>
              ) : null}
              <div className={`context-bar context-bar-${shellContext.tone}`} aria-label="Current role and organization context">
                <div className="context-copy">
                  {activeContext ? (
                    <details className="context-identity">
                      <summary>
                        <span className="context-identity-line">
                          <strong>{roleDisplayName[activeContext.role] ?? activeContext.role}</strong>
                          <span>{activeContext.organizationName}</span>
                          <span>{activeContext.seasonName}</span>
                          {activeContext.teamName ? <span>{activeContext.teamName}</span> : null}
                        </span>
                        {activeContext.readOnly ? <span className="badge warning">Archived</span> : null}
                        <small className="context-identity-toggle">Details</small>
                      </summary>
                      <div className="verified-context-details">
                        <span><small>Role</small><strong>{roleDisplayName[activeContext.role] ?? activeContext.role}</strong></span>
                        <span><small>Organization</small><strong>{activeContext.organizationName}</strong></span>
                        <span><small>Season</small><strong>{activeContext.seasonName}</strong></span>
                        {activeContext.teamName ? <span><small>Team</small><strong>{activeContext.teamName}</strong></span> : null}
                        <span className={activeContext.readOnly ? "state-readonly" : "state-current"}>
                          <small>Access</small>
                          <strong>{activeContext.readOnly ? "Archived, read-only" : "Current access"}</strong>
                        </span>
                      </div>
                    </details>
                  ) : (
                    <p className="context-identity-unavailable" role="status">
                      Private team details stay hidden on this page.
                    </p>
                  )}
                  {shellContext.help ? (
                    <details className="context-help">
                      <summary>What is this page for?</summary>
                      <p>{shellContext.help}</p>
                    </details>
                  ) : null}
                </div>
                <div className="context-actions">
                  {roleAttentionCount || access.attentionStatus === "error" ? (
                    <StatusBadge label={attentionSummary} variant={access.attentionStatus === "error" ? "warning" : "info"} />
                  ) : null}
                  <ThemeToggle />
                  <button type="button" className="secondary context-back" onClick={() => (window.history.length > 1 ? router.back() : router.push(getRouteParent(pathname)))}>
                    Back
                  </button>
                </div>
              </div>
            </>
          ) : null}
          {children}
          <OfflineSyncStatus actorId={access.userId} contextKey={activeContext?.contextKey} />
        </main>

        {showMobileTabbar ? (
          <nav className="mobile-tabbar" aria-label="Mobile navigation">
            {activeMobileItems.map((item) => {
              const active = isNavigationEntryActive(pathname, item);
              const attention = getAttentionBadge(access.attentionBadges, item.href);
              return (
                <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} data-active={active ? "true" : undefined}>
                  <span className="mobile-tab-icon" aria-hidden="true">
                    <RouteIcon href={item.href} short={item.short} role={item.role} size={20} />
                  </span>
                  <small>{item.label.replace("Parent ", "")}</small>
                  {attention ? (
                    <span className="mobile-tab-attention" aria-label={attention.label}>
                      {formatBadgeCount(attention.count)} {attention.meaning}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        ) : null}
      </div>

      {sessionWarningVisible ? (
        <aside className="session-warning" role="status" aria-live="polite">
          <StatusBadge label="Session expiring" variant="warning" />
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
              <span className="nav-icon" aria-hidden="true">
                <RouteIcon href={item.href} short={item.short} role={item.role} />
              </span>
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
