"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AppStateProvider } from "@/app/providers";
import {
  getCommandEntries,
  getMobileNavEntries,
  getPrimaryNavEntries,
  getRouteParent,
  isRouteActive,
  signedOutShellAccess,
  type ClientShellAccess,
  type RouteTopologyEntry
} from "@/lib/navigation/route-topology";
import { StatusBadge } from "./primitives";

const groups: RouteTopologyEntry["group"][] = ["Family", "Coach", "League Ops", "Admin Tools", "Switch role", "Support"];

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

  const filteredNav = useMemo(() => {
    const query = commandQuery.trim().toLowerCase();
    if (!query) return commandItems;
    return commandItems.filter((item) => `${item.label} ${item.group} ${item.href}`.toLowerCase().includes(query));
  }, [commandItems, commandQuery]);

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
          <div className="context-bar">
            <button type="button" className="secondary context-back" onClick={() => (window.history.length > 1 ? router.back() : router.push(getRouteParent(pathname)))}>
              Back
            </button>
            <StatusBadge label="Read-only" variant="neutral" />
          </div>
          {children}
        </main>

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
