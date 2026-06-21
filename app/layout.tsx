import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { AppStateProvider } from "./providers";

export const metadata: Metadata = {
  title: "Little League HQ",
  description: "Production scaffold for a private youth sports operations platform."
};

const navItems = [
  ["Home", "/"],
  ["Admin Health", "/admin/health"],
  ["CSV Imports", "/admin/imports"],
  ["Invites", "/admin/invites"],
  ["Recover Invite", "/invite/recover"],
  ["Parent Home", "/parent"],
  ["Parent RSVP", "/parent/rsvp"],
  ["Coach RSVPs", "/coach/rsvps"],
  ["Schedule", "/schedule"],
  ["Team Chat", "/team-chat"],
  ["Static Prototype", "/prototype/index.html"]
] as const;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppStateProvider>
          <div className="shell">
            <aside className="sidebar">
              <Link href="/" className="brand" aria-label="Little League HQ home">
                <span className="brand-mark">LL</span>
                <span>
                  <strong>Little League HQ</strong>
                  <small>Production scaffold</small>
                </span>
              </Link>
              <nav className="nav" aria-label="Main navigation">
                {navItems.map(([label, href]) => (
                  <Link key={href} href={href}>
                    {label}
                  </Link>
                ))}
              </nav>
            </aside>
            <main className="main">{children}</main>
          </div>
        </AppStateProvider>
      </body>
    </html>
  );
}
