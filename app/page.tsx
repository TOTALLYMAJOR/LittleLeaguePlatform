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
import { LandingIntroOverlay } from "@/components/landing-intro-overlay";
import { LandingSky } from "@/components/landing-sky";
import { LandingWeatherNotification } from "@/components/landing-weather-notification";
import { ReplayIntroButton } from "@/components/replay-intro-button";
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

const LEAGUE_TIME_ZONE = "America/Chicago";
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function nextGameDay() {
  const now = new Date();
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: LEAGUE_TIME_ZONE, weekday: "short" }).format(now);
  const weekdayIndex = WEEKDAYS.indexOf(weekday);
  const daysUntilSaturday = (6 - weekdayIndex + 7) % 7;
  const gameDay = new Date(now.getTime() + daysUntilSaturday * 24 * 60 * 60 * 1000);
  return {
    isToday: daysUntilSaturday === 0,
    label: new Intl.DateTimeFormat("en-US", { timeZone: LEAGUE_TIME_ZONE, month: "long", day: "numeric" }).format(gameDay)
  };
}

export default async function HomePage() {
  const access = toClientShellAccess(await getServerShellAccess());
  if (access.signedIn) redirect(roleHomeHref(access));
  const accountHref = "/auth";
  const accountLabel = "Sign in";
  const gameDay = nextGameDay();

  return (
    <div className="landing-gateway">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }} />
      <LandingIntroOverlay />
      <section className="landing-gateway-hero" aria-labelledby="landing-title">
        <LandingSky />

        <div className="landing-gateway-copy">
          <p className="landing-gateway-kicker">LeaguePilot</p>
          <p className="landing-gateway-dedication">
            Built in honor of Pearl River Youth Sport Administrators and Volunteers
          </p>
          <h1 id="landing-title">Your season, organized.</h1>
          <p className="landing-gateway-summary">
            Schedules, team access, and local support. Clear from the first click.
          </p>

          <Link className="landing-gateway-gameday" href="/schedule">
            <span className="landing-gateway-gameday-dot" aria-hidden="true" />
            {gameDay.isToday ? "Game day is today" : `Next game day: Saturday, ${gameDay.label}`}
            <em>
              See the public schedule
              <ArrowRight aria-hidden="true" size={14} strokeWidth={2.25} />
            </em>
          </Link>

          <ul className="landing-gateway-assurances">
            <li>
              <ShieldCheck aria-hidden="true" size={18} strokeWidth={2.1} />
              <span>Private by default. Children do not create accounts.</span>
            </li>
            <li>
              <UsersRound aria-hidden="true" size={18} strokeWidth={2.1} />
              <span>Built for volunteers. Nobody here gets paid.</span>
            </li>
            <li>
              <WifiOff aria-hidden="true" size={18} strokeWidth={2.1} />
              <span>Field-ready. Schedules keep working offline on game day.</span>
            </li>
          </ul>
        </div>

        <div className="landing-gateway-media" aria-hidden="true">
          <Image
            alt=""
            fill
            priority
            placeholder="blur"
            sizes="(max-width: 760px) 100vw, 58vw"
            src={heroImage}
          />
        </div>
        <LandingWeatherNotification />

        <nav className="landing-gateway-actions" aria-label="Get started">
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
        </nav>

        <div className="landing-gateway-footer">
          <ReplayIntroButton />
        </div>
      </section>
    </div>
  );
}
