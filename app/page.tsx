import Image from "next/image";
import Link from "next/link";
import { getServerShellAccess, toClientShellAccess } from "@/lib/supabase/shell-access";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const access = toClientShellAccess(await getServerShellAccess());
  const accountHref = access.canParent
    ? "/parent"
    : access.canCoach
      ? "/coach"
      : access.canAdmin
        ? "/admin"
        : access.signedIn
          ? "/account"
          : "/auth";
  const accountLabel = access.signedIn ? "Open my home" : "Sign in";

  return (
    <div className="landing-gateway">
      <section className="landing-gateway-hero" aria-labelledby="landing-title">
        <div className="landing-gateway-copy">
          <p className="landing-gateway-kicker">LeaguePilot</p>
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
            <small>{access.signedIn ? "Continue in your approved role" : "For approved families and staff"}</small>
          </Link>
        </nav>
      </section>
    </div>
  );
}
