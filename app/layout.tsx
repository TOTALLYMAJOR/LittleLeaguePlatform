import type { Metadata, Viewport } from "next";
import { Fredoka, Geist } from "next/font/google";
import "./globals.css";
import "./parent/parent-weekly.css";
import { AppShell } from "@/components/ui/AppShell";
import { getServerShellAccess, toClientShellAccess } from "@/lib/supabase/shell-access";

const parentSans = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-parent-sans"
});

const parentDisplay = Fredoka({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-parent-display"
});

const criticalShellCss = `
html,body{margin:0;min-height:100%}
body{background:#fdf8f1;color:#1c2438;font-family:var(--font-parent-sans),Geist,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;line-height:1.55}
*,*::before,*::after{box-sizing:border-box}
.shell.app-shell{display:grid;grid-template-columns:minmax(260px,280px) minmax(0,1fr);min-height:100dvh}
.main{min-width:0;padding:28px clamp(20px,3vw,44px) 72px}
.sidebar.app-sidebar{position:sticky;top:0;display:flex;flex-direction:column;gap:12px;height:100vh;overflow-y:auto;border-right:1px solid #e7ded1;background:#fdf8f1;padding:20px 18px}
.sidebar-topline,.brand{display:flex;align-items:center;gap:12px}
.sidebar-topline{justify-content:space-between}
.brand{text-decoration:none;color:inherit}
.brand-mark{display:grid;place-items:center;flex-shrink:0;width:42px;height:42px;border-radius:12px;background:#1f3a63;color:#fff;font-weight:700}
.nav{display:grid;gap:2px}
.nav a{display:flex;align-items:center;gap:8px;min-height:44px;padding:11px 12px;border-radius:12px;color:#68665f;text-decoration:none;font-weight:800}
.page{display:grid;gap:24px;width:min(100%,1240px);margin-inline:auto}
.public-app-shell{min-height:100dvh}.public-header{display:flex;align-items:center;justify-content:space-between;min-height:72px;width:min(100% - 32px,1240px);margin:0 auto;padding:12px 24px}.public-brand{display:flex;align-items:center;gap:12px;text-decoration:none;color:inherit}.public-nav{display:flex;align-items:center;gap:20px}.public-main{min-width:0}
@media (max-width:900px){.shell.app-shell{display:block}.sidebar.app-sidebar{display:none}.main{padding:20px 16px 112px}.mobile-tabbar{display:grid}}
`;

export const metadata: Metadata = {
  title: {
    default: "LeaguePilot",
    template: "%s | LeaguePilot"
  },
  description: "Private youth sports operations for families, coaches, and league admins.",
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
    title: "LeaguePilot",
    statusBarStyle: "default"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const shellAccess = toClientShellAccess(await getServerShellAccess({ includeAttention: true }));

  return (
    <html lang="en" className={`${parentSans.variable} ${parentDisplay.variable}`}>
      <head>
        <style id="critical-shell-css" dangerouslySetInnerHTML={{ __html: criticalShellCss }} />
      </head>
      <body>
        <AppShell access={shellAccess}>{children}</AppShell>
      </body>
    </html>
  );
}
