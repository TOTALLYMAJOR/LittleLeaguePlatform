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
    href: "/coach/practice-recaps",
    action: "Coach updates",
    body: "Check attendance, draft updates, adapt practice energy, and queue practice recap content after coach review.",
    proof: "Assigned-team scope"
  },
  {
    title: "Admins",
    href: "/admin/security-audit",
    action: "Review & Safety",
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
  ["Practice Recaps", "/coach/practice-recaps", "Coach clicks practice focus areas and generates home activities, a coach video, parent tip, skill cards, and a team quest."],
  ["Team-specific portal", "/team-portal", "One team surface for weekly digest, Game Day Mode, field maps, learning, memories, volunteers, and skill progress."],
  ["Coach home", "/coach", "Coach view for assigned teams, RSVP summaries, weather drafts, snacks, volunteers, and practice recaps."],
  ["Admin overview", "/admin", "League operations view for teams, registration queue, sponsors, notifications, and launch readiness."],
  ["Reports & Archive", "/admin/reports-archive", "Review archived seasons, export proof, and read-only boundaries."],
  ["Family Access", "/admin/family-access", "Repair missing parent-player links and activate team access."],
  ["Admin operations", "/admin/operations", "Review organization settings, provider inventory, approval queues, and audit logs."],
  ["Team setup", "/admin/teams", "Manage organization-scoped team records by season and division."],
  ["Review & Safety", "/admin/security-audit", "Track RLS, cross-team denial, archived read-only behavior, and production audit evidence."],
  ["Registration system", "/registration", "Parent self-registration request flow with admin review before account or child access."],
  ["CSV duplicate detection", "/admin/imports", "Validate roster imports, separate blocking errors from warnings, and simulate an audited commit."],
  ["Smart invite recovery", "/invite/recover", "Recover pending parent invites without exposing raw tokens or sending real provider messages."],
  ["Admin health", "/admin/health", "See launch readiness problems before families report them."],
  ["Parent home", "/parent", "Show each parent the schedule, coach updates, RSVP needs, and recent media that matter."],
  ["One-tap RSVP", "/parent/rsvp", "Let parents answer going, not going, or maybe for linked children only."],
  ["Schedule change alerts", "/schedule", "Queue push, email, and urgent SMS notification records without real sends."],
  ["Team Chat", "/team-chat", "Give assigned parents and coaches a safe, private space for coach notes and game-day questions."]
] as const;

const platformDrawerGroups = [
  {
    title: "Parent game-day tools",
    body: "The short path for families: what is next, where to go, who needs an RSVP, and what coach approved.",
    label: "5 surfaces",
    links: platformLinks.filter(([title]) => ["Parent home", "One-tap RSVP", "Team-specific portal", "Team Chat", "Schedule change alerts"].includes(title))
  },
  {
    title: "Coach workflow tools",
    body: "The coaching layer: attendance, practice recaps, weather drafts, family coverage, and team communication.",
    label: "4 surfaces",
    links: platformLinks.filter(([title]) => ["Coach home", "Practice Recaps", "Team Chat", "Team-specific portal"].includes(title))
  },
  {
    title: "League operations tools",
    body: "The admin layer for setup, registration, imports, invites, reporting, and readiness checks.",
    label: "7 surfaces",
    links: platformLinks.filter(([title]) => ["Admin overview", "Registration system", "CSV duplicate detection", "Smart invite recovery", "Admin health", "Team setup", "Reports & Archive"].includes(title))
  },
  {
    title: "Safety and proof tools",
    body: "The controls that keep access, audit evidence, provider boundaries, and family links reviewable.",
    label: "4 surfaces",
    links: platformLinks.filter(([title]) => ["Review & Safety", "Family Access", "Admin operations", "Schedule change alerts"].includes(title))
  }
] as const;

export default function HomePage() {
  return (
    <div className="landing-page">
      <div className="landing-soccer-ambient" aria-hidden="true">
        <span className="landing-soccer-ball" />
      </div>
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
          <a href="#replay-loop">Practice Recaps</a>
          <a href="#platform-map">Team Tools</a>
          <Link className="landing-sign-in" href="/auth">Sign in</Link>
        </div>
      </nav>

      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-hero-copy">
          <span className="landing-kicker">League operations for real families</span>
          <h1 id="landing-title">Stop chasing families.</h1>
          <p>
            Run the season from one private team home: schedules, RSVPs, coach updates, and practice recaps.
          </p>
          <div className="landing-actions">
            <Link className="button lg" href="/auth">Sign in</Link>
            <Link className="button secondary lg" href="/parent">Parent view</Link>
            <Link className="button secondary lg" href="/coach/practice-recaps">Coach updates</Link>
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
          <h2 id="roles-title">Three jobs for a ready Saturday.</h2>
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
          <h2 id="replay-title">Practice recaps carry coaching home.</h2>
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
          <h2 id="platform-map-title">Explore the team tools.</h2>
          <p>Open only the route family you need. The full surface map stays available without taking over the page.</p>
        </div>
        <div className="landing-drawer-stack">
          {platformDrawerGroups.map((group, index) => (
            <details className="landing-glass-drawer" key={group.title} open={index === 0}>
              <summary>
                <span>
                  <strong>{group.title}</strong>
                  <small>{group.body}</small>
                </span>
                <em>{group.label}</em>
              </summary>
              <div className="landing-drawer-panel">
                {group.links.map(([title, href, body]) => (
                  <Link className="landing-tool-link" href={href} key={`${group.title}-${href}`}>
                    <span>
                      <strong>{title}</strong>
                      <small>{body}</small>
                    </span>
                  </Link>
                ))}
              </div>
            </details>
          ))}
        </div>
      </section>

      <section className="notice landing-boundary">
        <strong>Production boundary:</strong> this app uses Supabase-backed paths when signed-in rows and roles exist, typed seed fallbacks when live context is unavailable, and no external email, SMS, push, Stripe, AI-provider, or native-app delivery unless explicitly approved and configured.
      </section>

      <section className="landing-section" aria-labelledby="feature-tier-title">
        <div className="landing-section-heading">
          <h2 id="feature-tier-title">Feature inventory.</h2>
          <p>Open this drawer only when you want the detailed scaffold ledger, provider boundaries, and feature tiers.</p>
        </div>
        <details className="landing-glass-drawer landing-feature-drawer">
          <summary>
            <span>
              <strong>Current scaffold inventory</strong>
              <small>Detailed tiers, implementation labels, planned boundaries, and signature feature status.</small>
            </span>
            <em>Open ledger</em>
          </summary>
          <div className="landing-drawer-panel landing-feature-panel">
            <FeatureTierHubClient />
          </div>
        </details>
      </section>
    </div>
  );
}
