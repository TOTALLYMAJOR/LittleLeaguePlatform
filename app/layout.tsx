import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/ui/AppShell";
import { getServerShellAccess, toClientShellAccess } from "@/lib/supabase/shell-access";

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

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const shellAccess = toClientShellAccess(await getServerShellAccess());

  return (
    <html lang="en">
      <body>
        <AppShell access={shellAccess}>{children}</AppShell>
      </body>
    </html>
  );
}
