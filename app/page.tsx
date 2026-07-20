import Image from "next/image";
import Link from "next/link";
import { getServerShellAccess, toClientShellAccess } from "@/lib/supabase/shell-access";

export const dynamic = "force-dynamic";

const replaySteps = [
  ["Practice notes", "Pick two or three things the team worked on."],
  ["Family preview", "Review short activities, a parent tip, skill cards, and a team quest."],
  ["Coach approval", "Nothing reaches families until a coach approves the recap."]
] as const;

const roleStories = [
  {
    role: "Parent",
    title: "Know what is next.",
    body: "See the next event, arrival time, directions, RSVP, coach update, and any family help in one glance.",
    href: "/parent",
    action: "Open parent home"
  },
  {
    role: "Coach",
    title: "See the gap before warm-up.",
    body: "Check no-response families, weather risk, volunteer holes, and the next draft from one sideline board.",
    href: "/coach",
    action: "Open coach home"
  },
  {
    role: "Admin",
    title: "Clear the blocker.",
    body: "Work registration, access, team setup, provider, and safety queues in priority order.",
    href: "/admin",
    action: "Open admin dashboard"
  }
] as const;

export default async function HomePage() {
  const access = toClientShellAccess(await getServerShellAccess());
  const roleLinks = [
    ...(access.canParent ? [roleStories[0]] : []),
    ...(access.canCoach ? [roleStories[1]] : []),
    ...(access.canAdmin ? [roleStories[2]] : [])
  ];
  const primaryHref = access.canParent
    ? "/parent"
    : access.canCoach
      ? "/coach"
      : access.canAdmin
        ? "/admin"
        : access.signedIn
          ? "/account"
          : "/auth";
  const primaryLabel = access.canParent || access.canCoach || access.canAdmin
    ? "Open my home"
    : access.signedIn
      ? "Check access"
      : "Sign in";

  return (
    <div className="landing-page">
      <div className="landing-soccer-ambient" aria-hidden="true">
        <span className="landing-soccer-ball" />
      </div>

      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-hero-copy">
          <span className="landing-kicker">Private youth sports operations</span>
          <h1 id="landing-title">Stop chasing families. Run the season.</h1>
          <p>Schedules, RSVPs, coach updates, and Parent Replay in one calm, role-aware home.</p>
          <div className="landing-actions">
            <Link className="button lg" href={primaryHref}>{primaryLabel}</Link>
            {!access.signedIn ? <Link className="button secondary lg" href="/registration">Request access</Link> : null}
          </div>
        </div>

        <figure className="landing-hero-media">
          <Image
            alt="A parent checks game-day details on a phone beside a youth sports field."
            height={887}
            priority
            sizes="(max-width: 900px) 100vw, 52vw"
            src="/images/leaguepilot-game-day-parent.png"
            width={1774}
          />
          <figcaption className="landing-photo-certainty">
            <span className="certainty-icon" aria-hidden="true">✓</span>
            <span>
              <strong>Game-day details in one place</strong>
              <small>Fast enough for the parking lot. Clear enough for the sideline.</small>
            </span>
          </figcaption>
        </figure>
      </section>

      <section className="landing-certainty-band" aria-label="LeaguePilot privacy">
        <span className="certainty-icon" aria-hidden="true">✓</span>
        <span>
          <strong>Private by default</strong>
          <small>Adults own child access. Team details appear only after league approval.</small>
        </span>
        <Link href="/schedule">View public calendar</Link>
      </section>

      <section className="landing-section landing-role-story" aria-labelledby="roles-title">
        <div className="landing-section-heading">
          <h2 id="roles-title">One season. Three clear views.</h2>
          <p>Each role opens on the decision that matters now.</p>
        </div>
        <div className="landing-role-stage">
          <article className="landing-role-feature">
            <span>{roleStories[0].role}</span>
            <h3>{roleStories[0].title}</h3>
            <p>{roleStories[0].body}</p>
            <div className="landing-next-event-demo" aria-label="Example parent next event">
              <div>
                <small>Saturday, 9:00 AM</small>
                <strong>Tiny Tigers vs Rookie Rockets</strong>
                <span>Arrive 8:40 AM at Field 1</span>
              </div>
              <span className="season-status state-needs_attention">RSVP needed</span>
            </div>
            {access.canParent ? <Link href={roleStories[0].href}>{roleStories[0].action}</Link> : null}
          </article>
          <div className="landing-role-secondary">
            {roleStories.slice(1).map((story) => (
              <article key={story.role}>
                <span>{story.role}</span>
                <h3>{story.title}</h3>
                <p>{story.body}</p>
                {(story.role === "Coach" ? access.canCoach : access.canAdmin) ? <Link href={story.href}>{story.action}</Link> : null}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-replay-section" aria-labelledby="replay-title">
        <div className="landing-replay-copy">
          <span className="landing-kicker">Signature feature</span>
          <h2 id="replay-title">Parent Replay carries practice home.</h2>
          <p>Coaches turn today&apos;s focus into simple family activities without automatic publishing or sending.</p>
          <Link className="button" href={access.canCoach ? "/coach/practice-recaps" : "/auth"}>
            {access.canCoach ? "Build a replay" : "See how access works"}
          </Link>
        </div>
        <div className="landing-replay-workflow">
          {replaySteps.map(([title, body], index) => (
            <article key={title}>
              <span>{index + 1}</span>
              <div>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            </article>
          ))}
          <div className="landing-replay-status">
            <span className="certainty-icon" aria-hidden="true">!</span>
            <span>
              <strong>Draft awaiting approval</strong>
              <small>External messages are not connected or sent from this preview.</small>
            </span>
          </div>
        </div>
      </section>

      <section className="landing-section landing-start" aria-labelledby="start-title">
        <div className="landing-section-heading">
          <h2 id="start-title">{access.signedIn ? "Continue in your approved role." : "Start with the right door."}</h2>
          <p>{access.signedIn ? "Only active role homes are shown below." : "Public calendar first, then league-reviewed access for private team details."}</p>
        </div>
        <div className="landing-start-list">
          {access.signedIn ? (
            roleLinks.length ? roleLinks.map((story) => (
              <Link href={story.href} key={story.role}>
                <span>{story.role}</span>
                <strong>{story.action}</strong>
                <small>{story.title}</small>
              </Link>
            )) : (
              <Link href="/account">
                <span>Access pending</span>
                <strong>Check account</strong>
                <small>Your private role is waiting for league approval.</small>
              </Link>
            )
          ) : (
            <>
              <Link href="/schedule">
                <span>Read-only</span>
                <strong>View calendar</strong>
                <small>See public event details before signing in.</small>
              </Link>
              <Link href="/registration">
                <span>Admin review</span>
                <strong>Request family access</strong>
                <small>Submitting a request does not open private team data.</small>
              </Link>
              <Link href="/auth">
                <span>Approved accounts</span>
                <strong>Sign in</strong>
                <small>Open the parent, coach, or admin home assigned to you.</small>
              </Link>
            </>
          )}
        </div>
      </section>

      <footer className="landing-footer">
        <strong>LeaguePilot</strong>
        <span>Little League HQ is the demo organization shown in sample data.</span>
      </footer>
    </div>
  );
}
