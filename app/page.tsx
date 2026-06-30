import Link from "next/link";
import { FeatureTierHubClient } from "@/components/feature-panels";

const roleCards = [
  {
    title: "Parents",
    href: "/parent",
    action: "Parent view",
    body: "See the next event, RSVP, directions, snack duty, coach updates, and approved replay activities for linked children only.",
    proof: "Guardian-scoped access"
  },
  {
    title: "Coaches",
    href: "/coach/parent-replay",
    action: "Coach loop",
    body: "Check attendance, draft updates, adapt practice energy, and queue Parent Replay content after coach review.",
    proof: "Assigned-team scope"
  },
  {
    title: "Admins",
    href: "/admin/security",
    action: "Proof center",
    body: "Watch registration, team setup, RLS proof, provider readiness, audit events, and launch blockers from one operations layer.",
    proof: "Organization scope"
  }
] as const;

const replaySteps = [
  ["Practice", "Coach observes what the team worked on."],
  ["Review", "Coach picks two or three focus areas."],
  ["Replay", "The app drafts parent-ready activities."],
  ["Home", "Families get simple ways to help tonight."]
] as const;

const operatingSignals = [
  ["RSVP clarity", "Going, maybe, not going, and no-response families stay visible before game day."],
  ["Schedule changes", "Alert records can be queued for review without implying a provider send."],
  ["Team identity", "Team colors, mascot, and logo metadata carry across parent, coach, and admin surfaces."],
  ["Safety boundary", "Children do not log in; parent and guardian accounts own child access."]
] as const;

const platformLinks = [
  ["Parent Replay", "/coach/parent-replay", "Coach clicks practice focus areas and generates home activities, a coach video, parent tip, skill cards, and a team quest."],
  ["Team-specific portal", "/team-portal", "One team surface for weekly digest, Game Day Mode, field maps, learning, memories, volunteers, and skill progress."],
  ["Coach dashboard", "/coach", "Coach view for assigned teams, RSVP summaries, weather drafts, snacks, volunteers, and Parent Replay."],
  ["Admin dashboard", "/admin", "League operations view for teams, registration queue, sponsors, notifications, and launch readiness."],
  ["Archive vault", "/admin/archive", "Review archived seasons, export proof, and read-only boundaries."],
  ["Guardian links", "/admin/guardian-links", "Repair missing parent-player links and activate team access."],
  ["Admin operations", "/admin/operations", "Review organization settings, provider inventory, approval queues, and audit logs."],
  ["Team setup", "/admin/teams", "Manage organization-scoped team records by season and division."],
  ["Security proof", "/admin/security", "Track RLS, cross-team denial, archived read-only behavior, and production audit evidence."],
  ["Registration system", "/registration", "Parent self-registration request flow with admin review before account or child access."],
  ["CSV duplicate detection", "/admin/imports", "Validate roster imports, separate blocking errors from warnings, and simulate an audited commit."],
  ["Smart invite recovery", "/invite/recover", "Recover pending parent invites without exposing raw tokens or sending real provider messages."],
  ["Admin health dashboard", "/admin/health", "See launch readiness problems before families report them."],
  ["Parent dashboard", "/parent", "Show each parent the schedule, coach updates, RSVP needs, and recent media that matter."],
  ["One-tap RSVP", "/parent/rsvp", "Let parents answer going, not going, or maybe for linked children only."],
  ["Schedule change alerts", "/schedule", "Queue push, email, and urgent SMS notification records without real sends."],
  ["Team Chat", "/team-chat", "Give assigned parents and coaches a safe, private space for coach notes and game-day questions."]
] as const;

export default function HomePage() {
  return (
    <div className="landing-page">
      <nav className="landing-nav" aria-label="Landing navigation">
        <Link className="landing-brand" href="/">
          <span className="landing-brand-mark" aria-hidden="true">LP</span>
          <span>
            <strong>LeaguePilot</strong>
            <small>Private youth sports operations</small>
          </span>
        </Link>
        <div className="landing-nav-links">
          <a href="#roles">Roles</a>
          <a href="#replay-loop">Parent Replay</a>
          <a href="#platform-map">Platform map</a>
        </div>
      </nav>

      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-hero-copy">
          <span className="landing-kicker">League operations for real families</span>
          <h1 id="landing-title">Stop chasing families.</h1>
          <p>
            Run the season from one private team home: schedules, RSVPs, coach updates, and Parent Replay.
          </p>
          <div className="landing-actions">
            <Link className="button lg" href="/coach/parent-replay">Coach loop</Link>
            <Link className="button secondary lg" href="/parent">Parent view</Link>
          </div>
        </div>

        <aside className="landing-season-board" aria-label="Season control preview">
          <div className="landing-board-header">
            <div>
              <span className="badge info">Role-scoped path</span>
              <h2>Saturday operations</h2>
            </div>
            <span className="landing-board-time">8:40 AM</span>
          </div>

          <div className="landing-feature-visual">
            <div className="landing-replay-mark" aria-hidden="true" />
            <div className="landing-signal-path" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>

          <div className="landing-board-card">
            <span className="muted">Next game</span>
            <strong>Riverside 6U vs Hawks</strong>
            <div className="landing-mini-grid">
              <span>RSVP 11 / 14</span>
              <span>Snack gap 1</span>
              <span>Field 3</span>
              <span>Replay draft</span>
            </div>
          </div>

          <div className="landing-phone-card">
            <span className="badge warning">Draft, not sent</span>
            <h3>Coach update</h3>
            <p>Arrive 20 minutes early. Bring water. Practice focus: first touch and spacing.</p>
          </div>
        </aside>
      </section>

      <section className="landing-proof-strip" aria-label="Product boundaries">
        <span><strong>Supabase-backed</strong> where signed-in rows exist.</span>
        <span><strong>Seed fallback</strong> where live rows or auth are unavailable.</span>
        <span><strong>Provider sends</strong> stay approval-gated and disconnected until configured.</span>
      </section>

      <section className="landing-section" id="roles" aria-labelledby="roles-title">
        <div className="landing-section-heading">
          <h2 id="roles-title">Three jobs, one season rhythm.</h2>
          <p>Parents need clarity, coaches need coverage, admins need proof before the league depends on a workflow.</p>
        </div>
        <div className="landing-role-grid">
          {roleCards.map((role) => (
            <Link className="landing-role-card" href={role.href} key={role.title}>
              <span className="badge neutral">{role.proof}</span>
              <h3>{role.title}</h3>
              <p>{role.body}</p>
              <strong>{role.action}</strong>
            </Link>
          ))}
        </div>
      </section>

      <section className="landing-replay-section" id="replay-loop" aria-labelledby="replay-title">
        <div className="landing-section-heading">
          <h2 id="replay-title">Parent Replay is the signature loop.</h2>
          <p>Practice does not end at the field. Coaches turn what happened into simple family activities without automatic publish or external sends.</p>
        </div>
        <div className="landing-replay-grid">
          {replaySteps.map(([title, body], index) => (
            <article className="landing-replay-step" key={title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-ops-section" aria-labelledby="ops-title">
        <div className="landing-section-heading">
          <h2 id="ops-title">The useful parts of the season stay connected.</h2>
          <p>RSVPs, schedules, weather drafts, snacks, volunteers, team chat, registration, and audit proof share one role-aware surface model.</p>
        </div>
        <div className="landing-signal-grid">
          {operatingSignals.map(([title, body]) => (
            <article className="card stack" key={title}>
              <span className="status-dot ok" aria-hidden="true" />
              <h3>{title}</h3>
              <p className="muted">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section" id="platform-map" aria-labelledby="platform-map-title">
        <div className="landing-section-heading">
          <h2 id="platform-map-title">Explore the product surfaces.</h2>
          <p>The route map stays here for builders and reviewers, below the buyer-facing story.</p>
        </div>
        <div className="grid three">
          {platformLinks.map(([title, href, body]) => (
            <Link className="card stack" href={href} key={href}>
              <h3>{title}</h3>
              <p className="muted">{body}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="notice landing-boundary">
        <strong>Production boundary:</strong> this app uses Supabase-backed paths when signed-in rows and roles exist, typed seed fallbacks when live context is unavailable, and no external email, SMS, push, Stripe, AI-provider, or native-app delivery unless explicitly approved and configured.
        The original static prototype remains available at <Link href="/prototype/index.html">/prototype/index.html</Link>.
      </section>

      <section className="landing-section" aria-labelledby="feature-tier-title">
        <div className="landing-section-heading">
          <h2 id="feature-tier-title">Feature tier workspace.</h2>
          <p>Use this lower workspace to inspect the current scaffold, provider boundaries, and feature inventory.</p>
        </div>
        <FeatureTierHubClient />
      </section>
    </div>
  );
}
