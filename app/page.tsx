import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  HeartHandshake,
  LogIn,
  ShieldCheck,
  UsersRound,
  WifiOff
} from "lucide-react";
import { LandingCelebration } from "@/components/landing-celebration";
import { LandingFooterClouds, LandingSky } from "@/components/landing-sky";
import { LandingWeatherNotification } from "@/components/landing-weather-notification";
import { getServerShellAccess, toClientShellAccess } from "@/lib/supabase/shell-access";
import type { ClientShellAccess } from "@/lib/navigation/route-topology";
import heroImage from "@/public/images/leaguepilot-community-game-day-hero.png";

export const dynamic = "force-dynamic";

const SITE_URL = "https://leaguepilot.us";
const LANDING_DESCRIPTION =
  "Schedules, team access, and local support for youth sports families, volunteer coaches, and league admins. Built in honor of Pearl River Youth Sport Administrators and Volunteers.";

export const metadata: Metadata = {
  title: "Your season, organized.",
  description: LANDING_DESCRIPTION,
  alternates: { canonical: SITE_URL },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "LeaguePilot",
    title: "LeaguePilot - Your season, organized.",
    description: LANDING_DESCRIPTION,
    images: [
      {
        url: `${SITE_URL}/images/leaguepilot-community-game-day-hero.png`,
        alt: "Coaches and families together at a youth soccer field"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "LeaguePilot - Your season, organized.",
    description: LANDING_DESCRIPTION,
    images: [`${SITE_URL}/images/leaguepilot-community-game-day-hero.png`]
  }
};

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "SportsOrganization",
  name: "LeaguePilot",
  url: SITE_URL,
  slogan: "Your season, organized.",
  description: LANDING_DESCRIPTION
};

function roleHomeHref(access: ClientShellAccess) {
  if (access.activeRole === "coach" && access.canCoach) return "/coach";
  if (access.activeRole === "admin" && access.canAdmin) return "/admin";
  if (access.activeRole === "parent" && access.canParent) return "/parent";
  if (access.canParent) return "/parent";
  if (access.canCoach) return "/coach";
  if (access.canAdmin) return "/admin";
  return "/account";
}

function LandingAssurances({ className = "" }: { className?: string }) {
  return (
    <ul className={`landing-gateway-assurances ${className}`.trim()}>
      <li>
        <ShieldCheck aria-hidden="true" size={18} strokeWidth={2.1} />
        <span>Private by default. Children do not create accounts.</span>
      </li>
      <li>
        <UsersRound aria-hidden="true" size={18} strokeWidth={2.1} />
        <span>Built for volunteer-run leagues.</span>
      </li>
      <li>
        <WifiOff aria-hidden="true" size={18} strokeWidth={2.1} />
        <span>Schedules work offline on game day.</span>
      </li>
    </ul>
  );
}

function LandingVisual({ className = "" }: { className?: string }) {
  return (
    <div className={`landing-gateway-visual ${className}`.trim()}>
      <div className="landing-gateway-media" aria-hidden="true">
        <Image
          alt=""
          fill
          priority
          placeholder="blur"
          sizes="(max-width: 760px) calc(100vw - 28px), 56vw"
          src={heroImage}
        />
          <div className="landing-community-caption">
            <span>At the heart of every season</span>
            <strong>The people who show up.</strong>
          </div>
      </div>
      <LandingWeatherNotification />
    </div>
  );
}

function LandingActionItems({ accountHref, accountLabel }: { accountHref: string; accountLabel: string }) {
  return (
    <>
      <Link className="landing-gateway-action" href="/schedule">
        <span className="landing-gateway-action-icon" aria-hidden="true">
          <CalendarDays size={21} strokeWidth={2.1} />
        </span>
        <span className="landing-gateway-action-label">Schedule</span>
        <strong>Games and field updates</strong>
        <small>View public schedule</small>
        <ArrowRight className="landing-gateway-action-arrow" aria-hidden="true" size={18} strokeWidth={2.2} />
      </Link>
      <Link className="landing-gateway-action" href="/sponsors">
        <span className="landing-gateway-action-icon" aria-hidden="true">
          <HeartHandshake size={21} strokeWidth={2.1} />
        </span>
        <span className="landing-gateway-action-label">Sponsors</span>
        <strong>Support local youth sports</strong>
        <small>View sponsor information</small>
        <ArrowRight className="landing-gateway-action-arrow" aria-hidden="true" size={18} strokeWidth={2.2} />
      </Link>
      <Link className="landing-gateway-action is-primary" href={accountHref}>
        <span className="landing-gateway-action-icon" aria-hidden="true">
          <LogIn size={21} strokeWidth={2.1} />
        </span>
        <span className="landing-gateway-action-label">Account</span>
        <strong>{accountLabel}</strong>
        <small>For approved families and staff</small>
        <ArrowRight className="landing-gateway-action-arrow" aria-hidden="true" size={18} strokeWidth={2.2} />
      </Link>
    </>
  );
}

function LandingActions({ accountHref, accountLabel, className = "" }: { accountHref: string; accountLabel: string; className?: string }) {
  return (
    <nav className={`landing-gateway-actions ${className}`.trim()} aria-label="Get started">
      <LandingActionItems accountHref={accountHref} accountLabel={accountLabel} />
    </nav>
  );
}

export default async function HomePage() {
  const access = toClientShellAccess(await getServerShellAccess());
  if (access.signedIn) redirect(roleHomeHref(access));
  const accountHref = "/auth";
  const accountLabel = "Sign in";

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }} />
      <LandingCelebration />
        <div className="landing-gateway landing-ready-board landing-motion-candidate">
        <section className="landing-gateway-hero landing-ready-board-hero" aria-labelledby="landing-title">
          <LandingSky />
          <div className="landing-gateway-copy landing-ready-board-copy">
            <p className="landing-gateway-dedication landing-ready-board-dedication">
              Built in honor of Pearl River Youth Sport Administrators and Volunteers
            </p>
              <h1 id="landing-title">Your season,{" "}<br /><span>organized.</span></h1>
              <p className="landing-gateway-summary landing-ready-board-summary">Less coordinating. More cheering.<br />Schedules, team access, and local support in one welcoming place.</p>
              <nav className="landing-desktop-actions" aria-label="Start your season">
                <Link className="landing-hero-action is-primary" href={accountHref}>
                  {accountLabel}<ArrowRight aria-hidden="true" size={18} />
                </Link>
                <Link className="landing-hero-action" href="/schedule">
                  <CalendarDays aria-hidden="true" size={18} />View schedule
                </Link>
              </nav>
              <p className="landing-hero-note">A clubhouse for families.<br />A helping hand for volunteers.</p>
            <nav className="landing-mobile-actions" aria-label="Quick access">
              <Link className="landing-mobile-action is-primary" href={accountHref}>
                <span>{accountLabel}</span>
                <ArrowRight aria-hidden="true" size={17} strokeWidth={2.25} />
              </Link>
              <Link className="landing-mobile-action is-secondary" href="/schedule">
                <span>Schedule</span>
                <CalendarDays aria-hidden="true" size={17} strokeWidth={2.15} />
              </Link>
            </nav>
          </div>
          <LandingVisual className="landing-ready-board-visual" />
          <LandingAssurances className="landing-ready-board-assurances" />
        </section>
      </div>
      <div className="landing-footer-zone">
        <LandingFooterClouds />
        <div className="landing-cloud-content">
          <Link className="landing-gateway-gameday landing-cloud-gameday" href="/schedule">
            <span>Plan for game day</span>
            <em>See the public schedule <ArrowRight aria-hidden="true" size={14} strokeWidth={2.25} /></em>
          </Link>
          <LandingActions accountHref={accountHref} accountLabel={accountLabel} className="landing-cloud-actions" />
        </div>
      </div>
      <footer className="landing-public-footer" aria-label="LeaguePilot information">
        <div className="landing-public-footer-inner">
          <div className="landing-public-footer-brand">
            <strong>LeaguePilot</strong>
            <span>Private youth sports operations for families, coaches, and league administrators.</span>
            <span>© {new Date().getFullYear()} LeaguePilot. All rights reserved.</span>
          </div>
          <nav aria-label="More LeaguePilot destinations">
            <Link href="/schedule">Schedule</Link>
            <Link href="/sponsors">Sponsors</Link>
            <Link href="/auth">Sign in</Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
