import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/ui/AppShell";
import { PWA_BRAND_ASSET_REVISION, PWA_MANIFEST_REVISION, versionedPwaAsset } from "@/lib/domain/pwa-cache";

const shieldIconUrl = versionedPwaAsset("/favicons/favicon-option-1-shield.png", PWA_BRAND_ASSET_REVISION);
const shieldSvgUrl = versionedPwaAsset("/favicons/favicon-option-1-shield.svg", PWA_BRAND_ASSET_REVISION);

export const metadata: Metadata = {
  title: "Little League HQ",
  description: "Production scaffold for a private youth sports operations platform.",
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
    title: "Little League HQ",
    statusBarStyle: "default"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
