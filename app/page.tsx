import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LandingIntroOverlay } from "@/components/landing-intro-overlay";
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
    title: "LeaguePilot — Your season, organized.",
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
    title: "LeaguePilot — Your season, organized.",
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

function nextGameDay() {
  const now = new Date();
  const daysUntilSaturday = (6 - now.getDay() + 7) % 7;
  const gameDay = new Date(now);
  gameDay.setDate(now.getDate() + daysUntilSaturday);
  return {
    isToday: daysUntilSaturday === 0,
    label: new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric" }).format(gameDay)
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
        <svg
          className="landing-gateway-sky"
          viewBox="0 0 900 400"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
          focusable="false"
        >
          <g className="landing-gateway-cloud landing-gateway-cloud-1" fill="currentColor">
            <ellipse cx="120" cy="90" rx="86" ry="30" />
            <ellipse cx="196" cy="72" rx="58" ry="24" />
          </g>
          <g className="landing-gateway-cloud landing-gateway-cloud-2" fill="currentColor">
            <ellipse cx="560" cy="150" rx="104" ry="32" />
            <ellipse cx="646" cy="128" rx="62" ry="24" />
          </g>
          <g className="landing-gateway-cloud landing-gateway-cloud-3" fill="currentColor">
            <ellipse cx="330" cy="230" rx="70" ry="24" />
            <ellipse cx="392" cy="214" rx="46" ry="18" />
          </g>
        </svg>

        <div className="landing-gateway-copy">
          <p className="landing-gateway-kicker">LeaguePilot</p>
          <p className="landing-gateway-dedication">
            Built in honor of Pearl River Youth Sport Administrators and Volunteers
          </p>
          <h1 id="landing-title">Your season, organized.</h1>
          <p className="landing-gateway-summary">
            Schedules, team access, and local support—clear from the first click.
          </p>

          <Link className="landing-gateway-gameday" href="/schedule">
            <span className="landing-gateway-gameday-dot" aria-hidden="true" />
            {gameDay.isToday ? "Game day is today" : `Next game day: Saturday, ${gameDay.label}`}
            <em>See the public schedule →</em>
          </Link>

          <ul className="landing-gateway-assurances">
            <li>
              <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
                <path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                <path d="m8.5 12 2.4 2.4 4.6-4.8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Private by default. Children do not create accounts.</span>
            </li>
            <li>
              <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
                <path d="M12 21s-7-4.6-9.2-9A5.2 5.2 0 0 1 12 6.6 5.2 5.2 0 0 1 21.2 12C19 16.4 12 21 12 21z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              </svg>
              <span>Built for volunteers—nobody here gets paid.</span>
            </li>
            <li>
              <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
                <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              </svg>
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
            <span>Schedule</span>
            <strong>Games and field updates</strong>
            <small>View public schedule</small>
            <i className="landing-gateway-action-arrow" aria-hidden="true">→</i>
          </Link>
          <Link className="landing-gateway-action" href="/sponsors">
            <span>Sponsors</span>
            <strong>Support local youth sports</strong>
            <small>View sponsor information</small>
            <i className="landing-gateway-action-arrow" aria-hidden="true">→</i>
          </Link>
          <Link className="landing-gateway-action is-primary" href={accountHref}>
            <span>Account</span>
            <strong>{accountLabel}</strong>
            <small>For approved families and staff</small>
            <i className="landing-gateway-action-arrow" aria-hidden="true">→</i>
          </Link>
        </nav>

        <div className="landing-gateway-footer">
          <ReplayIntroButton />
        </div>
      </section>
    </div>
  );
}
