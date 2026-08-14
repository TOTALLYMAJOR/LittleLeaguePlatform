import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LandingIntroOverlay } from "@/components/landing-intro-overlay";
import { getServerShellAccess, toClientShellAccess } from "@/lib/supabase/shell-access";
import type { ClientShellAccess } from "@/lib/navigation/route-topology";

export const dynamic = "force-dynamic";

function roleHomeHref(access: ClientShellAccess) {
  if (access.activeRole === "coach" && access.canCoach) return "/coach";
  if (access.activeRole === "admin" && access.canAdmin) return "/admin";
  if (access.activeRole === "parent" && access.canParent) return "/parent";
  if (access.canParent) return "/parent";
  if (access.canCoach) return "/coach";
  if (access.canAdmin) return "/admin";
  return "/account";
}

export default async function HomePage() {
  const access = toClientShellAccess(await getServerShellAccess());
  if (access.signedIn) redirect(roleHomeHref(access));
  const accountHref = "/auth";
  const accountLabel = "Sign in";

  return (
    <div className="landing-gateway">
      <LandingIntroOverlay />
      <section className="landing-gateway-hero" aria-labelledby="landing-title">
        <div className="landing-gateway-copy">
          <p className="landing-gateway-kicker">LeaguePilot</p>
          <p className="landing-gateway-dedication">
            Built in honor of Pearl River Youth Sport Administrators and Volunteers
          </p>
          <h1 id="landing-title">Your season, organized.</h1>
          <p className="landing-gateway-summary">
            Schedules, team access, and local support—clear from the first click.
          </p>
          <p className="landing-gateway-privacy">
            Private by default. Children do not create accounts.
          </p>
        </div>

        <div className="landing-gateway-media" aria-hidden="true">
          <Image
            alt=""
            fill
            priority
            sizes="(max-width: 760px) 100vw, 58vw"
            src="/images/leaguepilot-community-game-day-hero.png"
          />
        </div>

        <nav className="landing-gateway-actions" aria-label="Get started">
          <Link className="landing-gateway-action" href="/schedule">
            <span>Schedule</span>
            <strong>Games and field updates</strong>
            <small>View public schedule</small>
          </Link>
          <Link className="landing-gateway-action" href="/sponsors">
            <span>Sponsors</span>
            <strong>Support local youth sports</strong>
            <small>View sponsor information</small>
          </Link>
          <Link className="landing-gateway-action is-primary" href={accountHref}>
            <span>Account</span>
            <strong>{accountLabel}</strong>
            <small>For approved families and staff</small>
          </Link>
        </nav>
      </section>
    </div>
  );
}
