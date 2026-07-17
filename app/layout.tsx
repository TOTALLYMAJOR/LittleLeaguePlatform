import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/ui/AppShell";
import { getServerShellAccess, toClientShellAccess } from "@/lib/supabase/shell-access";

const criticalShellCss = `
html,body{margin:0;min-height:100%}
body{background:#eef7fb;color:#102033;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;line-height:1.55}
*,*::before,*::after{box-sizing:border-box}
.shell.app-shell{display:grid;grid-template-columns:minmax(260px,280px) minmax(0,1fr);min-height:100vh}
.main{min-width:0;padding:32px}
.sidebar.app-sidebar{position:sticky;top:0;display:flex;flex-direction:column;gap:12px;height:100vh;overflow-y:auto;border-right:1px solid #d9e0ea;background:#fff;padding:22px}
.sidebar-topline,.brand{display:flex;align-items:center;gap:12px}
.sidebar-topline{justify-content:space-between}
.brand{text-decoration:none;color:inherit}
.brand-mark{display:grid;place-items:center;flex-shrink:0;width:42px;height:42px;border-radius:8px;background:#0b63ce;color:#fff;font-weight:700}
.nav{display:grid;gap:2px}
.nav a{display:flex;align-items:center;gap:8px;min-height:44px;padding:11px 12px;border-radius:8px;color:#243b53;text-decoration:none;font-weight:800}
.page{display:grid;gap:24px;max-width:1180px}
@media (max-width:900px){.shell.app-shell{display:block}.sidebar.app-sidebar{display:none}.main{padding:20px 16px 112px}.mobile-tabbar{display:grid}}
`;

export const metadata: Metadata = {
  title: "Little League HQ",
  description: "Production scaffold for a private youth sports operations platform.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicons/favicon-option-1-shield.svg", type: "image/svg+xml" },
      { url: "/favicons/favicon-option-1-shield.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: "/favicons/favicon-option-1-shield.png", sizes: "512x512", type: "image/png" }]
  },
  appleWebApp: {
    capable: true,
    title: "Little League HQ",
    statusBarStyle: "default"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const shellAccess = toClientShellAccess(await getServerShellAccess());

  return (
    <html lang="en">
      <head>
        <style id="critical-shell-css" dangerouslySetInnerHTML={{ __html: criticalShellCss }} />
      </head>
      <body>
        <AppShell access={shellAccess}>{children}</AppShell>
      </body>
    </html>
  );
}
