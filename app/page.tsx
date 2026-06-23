import Link from "next/link";
import { FeatureTierHubClient } from "@/components/feature-panels";

const featureLinks = [
  ["Parent Replay", "/coach/parent-replay", "Coach clicks practice focus areas and generates home activities, a coach video, parent tip, skill cards, and a team quest."],
  ["Team-specific portal", "/team-portal", "One team surface for weekly digest, Game Day Mode, field maps, learning, memories, volunteers, and skill progress."],
  ["Coach dashboard", "/coach", "Coach view for assigned teams, RSVP summaries, weather drafts, snacks, volunteers, and Parent Replay."],
  ["Admin dashboard", "/admin", "League operations view for teams, registration queue, sponsors, notifications, and launch readiness."],
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
    <div className="page">
      <section className="hero">
        <span className="eyebrow">Production scaffold</span>
        <h1>Private youth sports operations, with Parent Replay as the coaching loop.</h1>
        <p className="lead">
          This root Next.js app implements MVP feature slices with typed local data. Parent Replay is the signature feature: it helps parents support their kids between practices, not just manage schedules.
          The original static prototype remains available as a reference at <Link href="/prototype/index.html">/prototype/index.html</Link>.
        </p>
      </section>

      <section className="grid three">
        {featureLinks.map(([title, href, body]) => (
          <Link className="card stack" href={href} key={href}>
            <h2>{title}</h2>
            <p className="muted">{body}</p>
          </Link>
        ))}
      </section>

      <section className="notice">
        <strong>Production boundary:</strong> this scaffold uses session-only local state. It does not send email, SMS, or push notifications, does not grant real access, and does not persist production data.
      </section>

      <FeatureTierHubClient />
    </div>
  );
}
