import type { Metadata, Viewport } from "next";
import { Fredoka, Geist } from "next/font/google";
import "./globals.css";
import "./parent/parent-weekly.css";
import { AppShell } from "@/components/ui/AppShell";
import { PWA_BRAND_ASSET_REVISION, PWA_MANIFEST_REVISION, versionedPwaAsset } from "@/lib/domain/pwa-cache";
import { getServerShellAccess, toClientShellAccess } from "@/lib/supabase/shell-access";
import { COLOR_THEME_PREPAINT_SCRIPT } from "@/lib/theme";

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

const shieldIconUrl = versionedPwaAsset("/favicons/favicon-option-1-shield.png", PWA_BRAND_ASSET_REVISION);
const shieldSvgUrl = versionedPwaAsset("/favicons/favicon-option-1-shield.svg", PWA_BRAND_ASSET_REVISION);

const criticalShellCss = `
html,body{margin:0;min-height:100%}
body{background:var(--bg,#fdf8f1);color:var(--text,#1c2438);font-family:var(--font-parent-sans),Geist,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;line-height:1.55}
*,*::before,*::after{box-sizing:border-box}
[data-surface-family="family"],.parent-weekly-app-shell{color-scheme:light}
.shell.app-shell{display:grid;grid-template-columns:minmax(260px,280px) minmax(0,1fr);min-height:100dvh}
.main{min-width:0;padding:28px clamp(20px,3vw,44px) 72px}
.sidebar.app-sidebar{position:sticky;top:0;display:flex;flex-direction:column;gap:12px;height:100vh;overflow-y:auto;border-right:1px solid var(--line,#e7ded1);background:var(--bg,#fdf8f1);padding:20px 18px}
.sidebar-topline,.brand{display:flex;align-items:center;gap:12px}
.sidebar-topline{justify-content:space-between}
.brand{text-decoration:none;color:inherit}
.brand-mark{display:grid;place-items:center;flex-shrink:0;width:42px;height:42px;border-radius:12px;background:#1f3a63;color:#fff;font-weight:700}
.nav{display:grid;gap:2px}
.nav a{display:flex;align-items:center;gap:8px;min-height:44px;padding:11px 12px;border-radius:12px;color:var(--muted,#68665f);text-decoration:none;font-weight:800}
.page{display:grid;gap:24px;width:min(100%,1240px);margin-inline:auto}
.public-app-shell{min-height:100dvh}.public-header{display:flex;align-items:center;justify-content:space-between;min-height:72px;width:min(100% - 32px,1240px);margin:0 auto;padding:12px 24px}.public-brand{display:flex;align-items:center;gap:12px;min-width:44px;min-height:44px;text-decoration:none;color:inherit}.public-nav{display:flex;align-items:center;gap:20px}.public-main{min-width:0}
.parent-weekly-header{min-height:64px}.parent-weekly-header-inner{display:flex;align-items:center;justify-content:space-between;min-height:64px;width:min(100% - 40px,1152px);margin-inline:auto}.parent-weekly-brand{display:flex;align-items:center;gap:10px;min-height:44px;color:inherit;text-decoration:none}.parent-weekly-brand-mark{display:grid;place-items:center;width:40px;height:40px;flex:0 0 40px;border-radius:14px;background:#1f3a63;color:#fff}.parent-weekly-header-nav{display:flex;align-items:center;gap:6px}.parent-weekly-header-nav>a,.parent-weekly-header-nav>button{display:inline-flex;align-items:center;justify-content:center;min-width:44px;min-height:44px;border:0;background:transparent;color:#1f3a63;text-decoration:none}.parent-weekly-header-nav>a:not(.parent-weekly-avatar),.parent-weekly-header-nav>button{padding:0 10px}.parent-weekly-avatar{width:44px;height:44px}
.mobile-tabbar a{min-height:52px;padding:6px 4px}
@media (max-width:900px){.shell.app-shell{display:block}.sidebar.app-sidebar{display:none}.main{padding:20px 16px 112px}.mobile-tabbar{display:grid}.parent-weekly-header-nav .family-primary-link{display:none}}
@media (max-width:820px){.parent-weekly-header-nav>a:not(.parent-weekly-avatar) span,.parent-weekly-header-nav>button span{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}.parent-weekly-header-nav>a:not(.parent-weekly-avatar),.parent-weekly-header-nav>button{width:44px;padding:0}}
@media (max-width:640px){.public-header{align-items:flex-start;flex-direction:column;gap:10px;padding-inline:0}.public-nav{display:grid;grid-template-columns:1fr;gap:8px;width:100%}.public-nav a{justify-content:center;min-height:44px}}
`;

export const metadata: Metadata = {
  title: {
    default: "LeaguePilot",
    template: "%s | LeaguePilot"
  },
  description: "Private youth sports operations for families, coaches, and league admins.",
  manifest: versionedPwaAsset("/manifest.webmanifest", PWA_MANIFEST_REVISION),
  icons: {
    icon: [
      { url: shieldSvgUrl, type: "image/svg+xml" },
      { url: shieldIconUrl, sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: shieldIconUrl, sizes: "512x512", type: "image/png" }]
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
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
      className={`${parentSans.variable} ${parentDisplay.variable}`}
    >
      <head>
        <style id="critical-shell-css" dangerouslySetInnerHTML={{ __html: criticalShellCss }} />
        <script id="leaguepilot-color-theme" dangerouslySetInnerHTML={{ __html: COLOR_THEME_PREPAINT_SCRIPT }} />
      </head>
      <body>
        <AppShell access={shellAccess}>{children}</AppShell>
      </body>
    </html>
  );
}
