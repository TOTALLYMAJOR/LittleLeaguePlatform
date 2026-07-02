"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AppStateProvider } from "@/app/providers";
import { StatusBadge, UnreadBadge } from "./primitives";

interface ShellNavItem {
  label: string;
  href: string;
  short: string;
  group: "Family" | "Coach" | "League Ops" | "Admin Tools" | "Support";
  unread?: number;
}

const navItems: ShellNavItem[] = [
  { label: "Home", href: "/", short: "HM", group: "Family" },
  { label: "Parent Home", href: "/parent", short: "PA", group: "Family" },
  { label: "Parent RSVP", href: "/parent/rsvp", short: "RS", group: "Family" },
  { label: "Schedule", href: "/schedule", short: "SC", group: "Family" },
  { label: "Team Portal", href: "/team-portal", short: "TP", group: "Family" },
  { label: "Team Chat", href: "/team-chat", short: "CH", group: "Family", unread: 3 },
  { label: "Coach Home", href: "/coach", short: "CO", group: "Coach" },
  { label: "Coach RSVPs", href: "/coach/rsvps", short: "CR", group: "Coach" },
  { label: "Parent Replay", href: "/coach/parent-replay", short: "PR", group: "Coach" },
  { label: "Registration", href: "/registration", short: "RG", group: "League Ops" },
  { label: "Admin Dashboard", href: "/admin", short: "AD", group: "Admin Tools" },
  { label: "Operations", href: "/admin/operations", short: "OP", group: "Admin Tools" },
  { label: "Security", href: "/admin/security", short: "SE", group: "Admin Tools" },
  { label: "Themes", href: "/admin/themes", short: "TH", group: "Admin Tools" },
  { label: "Registrations", href: "/admin/registrations", short: "RR", group: "Admin Tools" },
  { label: "Teams", href: "/admin/teams", short: "TM", group: "Admin Tools" },
  { label: "Auth", href: "/auth", short: "AU", group: "Support" },
  { label: "Account", href: "/account", short: "AC", group: "Support" },
  { label: "Recover Invite", href: "/invite/recover", short: "RI", group: "Support" }
];

const mobileItems = [
  navItems.find((item) => item.href === "/")!,
  navItems.find((item) => item.href === "/schedule")!,
  navItems.find((item) => item.href === "/team-chat")!,
  navItems.find((item) => item.href === "/account")!,
  navItems.find((item) => item.href === "/admin")!
];

const parentMobileItems: ShellNavItem[] = [
  { label: "Home", href: "/parent", short: "HM", group: "Family" },
  { label: "Schedule", href: "/schedule", short: "SC", group: "Family" },
  { label: "Msgs", href: "/team-chat", short: "MS", group: "Family", unread: 3 },
  { label: "Photos", href: "/parent#team-media", short: "PH", group: "Family" },
  { label: "More", href: "/account", short: "MO", group: "Support" }
];

const groups: ShellNavItem["group"][] = ["Family", "Coach", "League Ops", "Admin Tools", "Support"];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function routeParent(pathname: string) {
  if (pathname.startsWith("/admin/")) return "/admin";
  if (pathname.startsWith("/coach/")) return "/coach";
  if (pathname.startsWith("/parent/")) return "/parent";
  return "/";
}

export function AppShell({ children }: { children: ReactNode }) {
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
  const activeMobileItems = pathname.startsWith("/parent") ? parentMobileItems : mobileItems;

  const filteredNav = useMemo(() => {
    const query = commandQuery.trim().toLowerCase();
    if (!query) return navItems;
    return navItems.filter((item) => `${item.label} ${item.group} ${item.href}`.toLowerCase().includes(query));
  }, [commandQuery]);

  useEffect(() => {
    setHasHydrated(true);
    setIsOffline(typeof navigator !== "undefined" ? !navigator.onLine : false);
    const saved = window.localStorage.getItem("little-league-shell-collapsed");
    setCollapsed(saved === "true");
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
    setCommandOpen(false);
    setCommandQuery("");
    setCommandIndex(0);
  }, [pathname]);

  function openCommandRoute(item: ShellNavItem) {
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
              return (
                <div className="nav-group" key={group}>
                  <small className="nav-section">{group}</small>
                  {items.map((item) => {
                    const active = isActive(pathname, item.href);
                    return (
                      <Link key={item.href} href={item.href} data-active={active ? "true" : undefined} aria-current={active ? "page" : undefined} title={item.label}>
                        <span className="nav-icon" aria-hidden="true">{item.short}</span>
                        <span className="nav-label">{item.label}</span>
                        {item.unread ? <UnreadBadge count={item.unread} /> : null}
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </nav>
        </aside>

        <main id="main-content" className="main">
          <div className="context-bar">
            <button type="button" className="secondary context-back" onClick={() => (window.history.length > 1 ? router.back() : router.push(routeParent(pathname)))}>
              Back
            </button>
            <StatusBadge label="Read-only" variant="neutral" />
          </div>
          {children}
        </main>

        <nav className="mobile-tabbar" aria-label="Mobile navigation">
          {activeMobileItems.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} data-active={active ? "true" : undefined}>
                <span>{item.short}</span>
                <small>{item.label.replace("Parent ", "")}</small>
                {item.unread ? <UnreadBadge count={item.unread} /> : null}
              </Link>
            );
          })}
        </nav>
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
            placeholder="Type schedule, chat, admin, or replay"
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
