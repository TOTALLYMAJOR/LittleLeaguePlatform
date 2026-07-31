import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";
import type { ChildSaturdayReadiness, ReadinessLaneStatus } from "./readiness";
import { ReadinessStrip } from "./readiness-strip";
import { StatusChip, type StatusChipTone } from "./status-chip";

export function MultiChildReadiness({ summaries }: { summaries: ChildSaturdayReadiness[] }) {
  const unresolvedItems = summaries.flatMap((summary) => summary.unresolvedItems);
  return (
    <section className="family-multi-readiness" aria-labelledby="family-multi-readiness-title">
      <div className="family-multi-readiness-heading">
        <span className="parent-weekly-kicker">Everyone</span>
        <h2 id="family-multi-readiness-title">Saturday readiness by child</h2>
        <p>Each summary uses only this guardian’s linked child, team, event, and receipt records.</p>
      </div>
      <ReadinessStrip eventTitle="all linked children" items={unresolvedItems} />
      <div className="family-multi-readiness-list">
        {summaries.map((summary) => (
          <article className="family-child-readiness" key={summary.child.id}>
            <header>
              <div>
                <h3>{summary.child.label}</h3>
                <p>{summary.child.teamName}</p>
              </div>
              <StatusChip tone={summary.unresolvedItems.length ? "action" : summary.event ? "confirmed" : "neutral"}>
                {summary.unresolvedItems.length
                  ? `${summary.unresolvedItems.length} thing${summary.unresolvedItems.length === 1 ? "" : "s"} need you`
                  : summary.event
                    ? "Nothing unresolved"
                    : "No upcoming event"}
              </StatusChip>
            </header>
            {summary.event ? (
              <Link
                className="family-child-next-event"
                href={`/parent/schedule?eventId=${encodeURIComponent(summary.event.eventId)}&playerId=${encodeURIComponent(summary.child.id)}`}
              >
                <CalendarDays aria-hidden="true" size={18} strokeWidth={2.2} />
                <span>
                  <strong>{summary.event.title}</strong>
                  <small>{summary.event.dateLabel} at {summary.event.startLabel}</small>
                </span>
                <ArrowRight aria-hidden="true" size={16} />
              </Link>
            ) : (
              <p className="family-child-empty">No upcoming official Saturday event is visible for this child.</p>
            )}
            <ul aria-label={`Readiness evidence for ${summary.child.label}`}>
              {summary.lanes.map((lane) => (
                <li key={lane.id}>
                  <div>
                    <StatusChip tone={laneTone(lane.status)}>{lane.label}</StatusChip>
                    <span>{lane.detail}</span>
                  </div>
                  {lane.status === "unresolved" && lane.href ? (
                    <Link href={lane.href} aria-label={`${lane.detail} for ${summary.child.label}`}>
                      Review
                      <ArrowRight aria-hidden="true" size={15} />
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

function laneTone(status: ReadinessLaneStatus): StatusChipTone {
  if (status === "resolved") return "confirmed";
  if (status === "unresolved") return "action";
  return "neutral";
}
