"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  CarFront,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  CircleX,
  Clock3,
  MapPin,
  Megaphone,
  MessageCircle,
  ShieldCheck,
  TriangleAlert,
  UsersRound,
  Utensils
} from "lucide-react";
import { useState, type CSSProperties } from "react";
import { markLeaguePilotValueExperienced } from "@/app/providers";
import type { RsvpResponse } from "@/lib/domain";
import type { FamilyMissionControlView, FamilyMissionEvent } from "@/lib/family-mission-control";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { ParentCoachDashboardData } from "@/lib/supabase/dashboard-data";
import type { FamilyReplayData, FamilyReplayStory } from "@/lib/supabase/family-replays";

interface ParentWeeklyDashboardProps {
  view: FamilyMissionControlView;
  dashboardData: ParentCoachDashboardData;
  replayData: FamilyReplayData;
}

interface LocalRsvp {
  response: RsvpResponse;
  lockVersion: number;
  confirmedScheduleVersion: number;
}

const rsvpOptions: Array<{
  response: Extract<RsvpResponse, "going" | "maybe" | "not_going">;
  label: string;
  Icon: typeof Check;
}> = [
  { response: "going", label: "Going", Icon: Check },
  { response: "maybe", label: "Maybe", Icon: CircleHelp },
  { response: "not_going", label: "Can’t go", Icon: CircleX }
];

function rsvpKey(eventId: string, playerId: string) {
  return `${eventId}:${playerId}`;
}

function formatAnnouncementDate(value: string) {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return "Date unavailable";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(timestamp);
}

function formatPublishedDate(value: string) {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return "Recently published";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(timestamp);
}

function durationLabel(value: string) {
  if (value === "30_seconds") return "30 sec";
  if (value === "2_minutes") return "2 min";
  return "5 min";
}

function responseLabel(response?: RsvpResponse) {
  if (response === "going") return "Going";
  if (response === "maybe") return "Maybe";
  if (response === "not_going") return "Can’t go";
  if (response === "cancelled") return "Cancelled";
  return "Needs reply";
}

function initials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

async function authenticatedPost(url: string, payload: unknown, extraHeaders?: Record<string, string>) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...extraHeaders
  };
  try {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) headers.authorization = `Bearer ${data.session.access_token}`;
  } catch {
    // Private routes fail closed if the browser session cannot be confirmed.
  }
  return fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });
}

function RsvpButtons({
  event,
  response,
  pending,
  disabled,
  onSave
}: {
  event: FamilyMissionEvent;
  response?: RsvpResponse;
  pending: boolean;
  disabled: boolean;
  onSave: (event: FamilyMissionEvent, response: Extract<RsvpResponse, "going" | "maybe" | "not_going">) => void;
}) {
  return (
    <div className="parent-weekly-rsvp" aria-label={`RSVP for ${event.childLabel} at ${event.title}`}>
      {rsvpOptions.map(({ response: option, label, Icon }) => (
        <button
          type="button"
          key={option}
          className={response === option ? "is-selected" : ""}
          data-response={option}
          aria-pressed={response === option}
          disabled={disabled || pending}
          onClick={() => onSave(event, option)}
        >
          <Icon aria-hidden="true" size={16} strokeWidth={2.4} />
          <span>{pending && response === option ? "Saving" : label}</span>
        </button>
      ))}
    </div>
  );
}

function ReplayActivity({
  replay,
  completed,
  pending,
  onComplete
}: {
  replay: FamilyReplayStory;
  completed: boolean;
  pending: boolean;
  onComplete: (replay: FamilyReplayStory) => void;
}) {
  const activity = replay.homeActivities[0];
  return (
    <article className="parent-weekly-replay-item">
      <div className="parent-weekly-replay-icon" aria-hidden="true">
        <BookOpenCheck size={18} strokeWidth={2.2} />
      </div>
      <div>
        <div className="parent-weekly-replay-meta">
          <span>{replay.teamName}</span>
          <span>{formatPublishedDate(replay.publishedAt)}</span>
          {activity ? <span>{durationLabel(activity.duration)}</span> : null}
        </div>
        <h3>{activity?.title ?? replay.title}</h3>
        <p>{activity?.parentGoal ?? replay.summary}</p>
        <div className="parent-weekly-replay-actions">
          <button
            type="button"
            className={completed ? "is-complete" : ""}
            disabled={completed || pending || !activity}
            onClick={() => onComplete(replay)}
          >
            <CheckCircle2 aria-hidden="true" size={16} />
            {completed ? "Tried together" : pending ? "Saving" : "Mark as tried"}
          </button>
          <Link href="/parent/practice-recaps">
            Open Replay
            <ChevronRight aria-hidden="true" size={15} />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function ParentWeeklyDashboard({ view, dashboardData, replayData }: ParentWeeklyDashboardProps) {
  const [localRsvps, setLocalRsvps] = useState<Record<string, LocalRsvp>>(() => (
    Object.fromEntries(dashboardData.state.rsvps.map((rsvp) => [
      rsvpKey(rsvp.eventId, rsvp.playerId),
      {
        response: rsvp.response,
        lockVersion: rsvp.lockVersion ?? 0,
        confirmedScheduleVersion: rsvp.confirmedScheduleVersion ?? 1
      }
    ]))
  ));
  const [pendingProjection, setPendingProjection] = useState("");
  const [completedReplayIds, setCompletedReplayIds] = useState(() => (
    new Set(replayData.replays.filter((replay) => replay.activityCompletedAt).map((replay) => replay.id))
  ));
  const [pendingReplayId, setPendingReplayId] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const primaryChild = view.children[0];
  const primaryPlayer = dashboardData.state.players.find((player) => player.id === primaryChild?.id);
  const primaryTeam = dashboardData.state.teams.find((team) => team.id === primaryChild?.teamId);
  const parentUser = dashboardData.state.users.find((user) => user.id === dashboardData.parentUserId);
  const weeklyEvents = view.events
    .filter((event) => Date.parse(event.startsAt) <= Date.parse(view.weekEndsAt))
    .slice(0, 8);
  const nextEvent = view.nextEvent;
  const announcements = [...dashboardData.state.announcements]
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
    .slice(0, 2);
  const recentReplays = replayData.replays.slice(0, 2);

  const getRsvp = (event: FamilyMissionEvent) => {
    const local = localRsvps[rsvpKey(event.eventId, event.childId)];
    if (!local || local.confirmedScheduleVersion < event.scheduleVersion) return undefined;
    return local.response;
  };

  const answeredEvents = weeklyEvents.filter((event) => {
    const response = getRsvp(event);
    return response && response !== "cancelled";
  }).length;
  const goingEvents = weeklyEvents.filter((event) => getRsvp(event) === "going").length;
  const needsReply = weeklyEvents.filter((event) => !getRsvp(event) || getRsvp(event) === "cancelled").length;
  const assignedSnack = nextEvent
    ? dashboardData.state.snackScheduleSlots.find((slot) => (
      slot.eventId === nextEvent.eventId &&
      slot.assignedParentUserId === dashboardData.parentUserId &&
      slot.status === "assigned"
    ))
    : undefined;
  const assignedVolunteer = nextEvent
    ? dashboardData.state.volunteerSignups.find((signup) => (
      signup.eventId === nextEvent.eventId &&
      signup.assignedUserId === dashboardData.parentUserId &&
      signup.status === "filled"
    ))
    : undefined;
  const familyAssignments = dashboardData.state.snackScheduleSlots.filter((slot) => (
    slot.assignedParentUserId === dashboardData.parentUserId && slot.status === "assigned"
  )).length + dashboardData.state.volunteerSignups.filter((signup) => (
    signup.assignedUserId === dashboardData.parentUserId && signup.status === "filled"
  )).length;
  const canWriteRsvp = dashboardData.isSupabaseBacked
    && dashboardData.accessStatus === "live"
    && dashboardData.state.activeSeason.status !== "archived";

  const firstName = primaryPlayer?.firstName
    ?? primaryChild?.label.split(" ")[0]
    ?? "Your family";
  const familyHeading = view.children.length > 1
    ? `${firstName}'s family week`
    : `${firstName}'s week`;
  const teamMark = initials(primaryTeam?.mascot || primaryTeam?.name || "LP");

  const readinessItems = [
    ...(needsReply ? [{
      id: "rsvp",
      label: `${needsReply} ${needsReply === 1 ? "RSVP needs" : "RSVPs need"} your answer`,
      detail: weeklyEvents.length ? `${answeredEvents} of ${weeklyEvents.length} answered this week` : "No events this week",
      href: "/parent/rsvp",
      cta: "Answer RSVP",
      Icon: CalendarDays
    }] : []),
    ...(nextEvent && !nextEvent.transportationAssigned ? [{
      id: "ride",
      label: "Ride plan not set",
      detail: `${nextEvent.childLabel} at ${nextEvent.title}`,
      href: "/parent/transportation",
      cta: "Open rides",
      Icon: CarFront
    }] : []),
    ...(view.criticalChange ? [{
      id: "change",
      label: "Schedule change needs review",
      detail: view.criticalChange.summary,
      href: nextEvent?.primaryAction?.href?.startsWith("/") ? nextEvent.primaryAction.href : "/parent/schedule",
      cta: "Review change",
      Icon: TriangleAlert
    }] : []),
    ...(view.conflicts.length ? [{
      id: "conflict",
      label: `${view.conflicts.length} schedule ${view.conflicts.length === 1 ? "conflict" : "conflicts"}`,
      detail: view.conflicts[0]?.summary ?? "Review overlapping family events.",
      href: "/parent/schedule",
      cta: "Check schedule",
      Icon: TriangleAlert
    }] : [])
  ];

  async function saveRsvp(
    event: FamilyMissionEvent,
    response: Extract<RsvpResponse, "going" | "maybe" | "not_going">
  ) {
    if (!canWriteRsvp || event.status !== "scheduled") return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setStatusMessage("Connect to update this RSVP here. The full RSVP center keeps the league’s offline-write rules.");
      return;
    }

    const key = rsvpKey(event.eventId, event.childId);
    const current = localRsvps[key];
    const actionId = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `rsvp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setPendingProjection(event.projectionId);
    setStatusMessage("");

    try {
      const apiResponse = await authenticatedPost("/api/rsvps", {
        eventId: event.eventId,
        playerId: event.childId,
        response,
        expectedLockVersion: current?.lockVersion ?? 0,
        expectedScheduleVersion: event.scheduleVersion
      }, { "Idempotency-Key": actionId });
      const result = await apiResponse.json().catch(() => null) as {
        ok?: boolean;
        code?: string;
        message?: string;
        currentResponse?: RsvpResponse;
        lockVersion?: number;
        lock_version?: number;
      } | null;

      if (!result?.ok) {
        if (apiResponse.status === 409) {
          setStatusMessage(result?.code === "schedule_changed"
            ? "This event changed. Review the current details, then confirm again."
            : `Another guardian updated this RSVP${result?.currentResponse ? ` to ${responseLabel(result.currentResponse)}` : ""}. Review before retrying.`);
        } else {
          setStatusMessage(result?.message ?? "RSVP could not be saved.");
        }
        return;
      }

      const nextLockVersion = result.lockVersion ?? result.lock_version ?? ((current?.lockVersion ?? 0) + 1);
      setLocalRsvps((existing) => ({
        ...existing,
        [key]: {
          response,
          lockVersion: nextLockVersion,
          confirmedScheduleVersion: event.scheduleVersion
        }
      }));
      markLeaguePilotValueExperienced("parent_rsvp_confirmed");
      setStatusMessage(`${event.childLabel} is marked ${responseLabel(response).toLowerCase()} for ${event.title}.`);
    } catch {
      setStatusMessage("Team records could not be reached. No RSVP change was confirmed.");
    } finally {
      setPendingProjection("");
    }
  }

  async function completeReplay(replay: FamilyReplayStory) {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setStatusMessage("Connect to mark this Parent Replay as tried.");
      return;
    }
    setPendingReplayId(replay.id);
    setStatusMessage("");
    try {
      const response = await authenticatedPost(`/api/parent/replays/${replay.id}/engagement`, {
        operation: "activity_completed"
      });
      const result = await response.json().catch(() => null) as { ok?: boolean; message?: string } | null;
      if (!result?.ok) {
        setStatusMessage(result?.message ?? "Parent Replay response could not be saved.");
        return;
      }
      setCompletedReplayIds((current) => new Set([...current, replay.id]));
      setStatusMessage(result.message ?? "Marked as tried together.");
    } catch {
      setStatusMessage("Parent Replay could not reach family records.");
    } finally {
      setPendingReplayId("");
    }
  }

  return (
    <div
      className="parent-weekly-dashboard"
      data-analytics-surface="parent_weekly_dashboard"
      data-family-state={view.state}
    >
      <section className="parent-weekly-player" aria-labelledby="parent-weekly-title">
        <div className="parent-weekly-player-identity">
          <div
            className="parent-weekly-team-mark"
            aria-label={`${primaryTeam?.name ?? "Linked team"} mark`}
            style={{
              "--parent-team-primary": primaryTeam?.primaryColor ?? "#1f3a63",
              "--parent-team-secondary": primaryTeam?.secondaryColor ?? "#fff2e4"
            } as CSSProperties}
          >
            {teamMark}
          </div>
          <div>
            <span className="parent-weekly-kicker">Family home</span>
            <h1 id="parent-weekly-title">{familyHeading}</h1>
            <p>
              {primaryTeam?.name ?? primaryChild?.teamName ?? "Linked team"}
              {primaryTeam?.division ? ` · ${primaryTeam.division}` : ""}
              {primaryPlayer?.jersey ? ` · #${primaryPlayer.jersey}` : ""}
            </p>
          </div>
        </div>
        <div className="parent-weekly-player-stats" aria-label="This week at a glance">
          <div>
            <CheckCircle2 aria-hidden="true" size={19} />
            <strong>{goingEvents}</strong>
            <span>confirmed</span>
          </div>
          <div className={needsReply ? "needs-reply" : ""}>
            <CalendarDays aria-hidden="true" size={19} />
            <strong>{needsReply}</strong>
            <span>need{needsReply === 1 ? "s" : ""} reply</span>
          </div>
        </div>
        <div className="parent-weekly-privacy">
          <ShieldCheck aria-hidden="true" size={16} />
          <span>Guardian-scoped view for {parentUser?.name ?? "this signed-in family"}</span>
        </div>
      </section>

      {statusMessage ? (
        <p className="parent-weekly-status" role="status" aria-live="polite">{statusMessage}</p>
      ) : null}

      {view.criticalChange || view.conflicts.length ? (
        <section className="parent-weekly-changes" aria-labelledby="parent-changes-title">
          <header>
            <TriangleAlert aria-hidden="true" size={18} />
            <div>
              <span className="parent-weekly-kicker">Since you last checked</span>
              <h2 id="parent-changes-title">What changed</h2>
            </div>
          </header>
          <ul>
            {view.criticalChange ? (
              <li key={view.criticalChange.eventId}>
                <strong>{view.criticalChange.title}</strong>
                <p>{view.criticalChange.summary}</p>
              </li>
            ) : null}
            {view.conflicts.map((conflict) => (
              <li key={conflict.id}>
                <strong>Schedule conflict</strong>
                <p>{conflict.summary} {conflict.evidence}</p>
              </li>
            ))}
          </ul>
          {nextEvent?.primaryAction ? (
            nextEvent.primaryAction.href.startsWith("http") ? (
              <a
                className="parent-weekly-changes-action"
                href={nextEvent.primaryAction.href}
                target="_blank"
                rel="noreferrer"
              >
                {nextEvent.primaryAction.label}
                <ArrowRight aria-hidden="true" size={16} />
              </a>
            ) : (
              <Link className="parent-weekly-changes-action" href={nextEvent.primaryAction.href}>
                {nextEvent.primaryAction.label}
                <ArrowRight aria-hidden="true" size={16} />
              </Link>
            )
          ) : null}
        </section>
      ) : null}

      <div className="parent-weekly-layout">
        <div className="parent-weekly-primary">
          <section className="parent-weekly-card parent-weekly-next" aria-labelledby="parent-next-title">
            <header className="parent-weekly-section-heading">
              <div>
                <span className="parent-weekly-kicker">Next up</span>
                <h2 id="parent-next-title">{nextEvent ? "Your next team moment" : "The week is clear"}</h2>
              </div>
              <Link href="/parent/schedule">
                Full schedule
                <ArrowRight aria-hidden="true" size={16} />
              </Link>
            </header>

            {nextEvent ? (
              <div className="parent-weekly-next-scene">
                <div className="parent-weekly-field-image">
                  <Image
                    src="/images/leaguepilot-baseball-field-overhead.webp"
                    alt=""
                    fill
                    priority
                    sizes="(max-width: 1023px) 100vw, 66vw"
                  />
                  <span className="parent-weekly-field-overlay" />
                  <div className="parent-weekly-event-copy">
                    <span>Next up · {nextEvent.dateLabel} · {nextEvent.childLabel}</span>
                    <h3>{nextEvent.title}</h3>
                    <p>
                      <Clock3 aria-hidden="true" size={17} />
                      {nextEvent.dateLabel} at {nextEvent.startLabel}
                    </p>
                    <p>
                      <MapPin aria-hidden="true" size={17} />
                      {nextEvent.venueLabel}
                    </p>
                  </div>
                </div>
                <div className="parent-weekly-next-details">
                  <div className="parent-weekly-duty-row">
                    {assignedSnack ? (
                      <span><Utensils aria-hidden="true" size={15} /> Snack duty: {assignedSnack.item}</span>
                    ) : null}
                    {assignedVolunteer ? (
                      <span><UsersRound aria-hidden="true" size={15} /> {assignedVolunteer.role}</span>
                    ) : null}
                    {!assignedSnack && !assignedVolunteer ? (
                      <span><ShieldCheck aria-hidden="true" size={15} /> No family help assignment for this event</span>
                    ) : null}
                    {nextEvent.transportationAssigned ? (
                      <span><CarFront aria-hidden="true" size={15} /> {nextEvent.responsibleAdultLabel}</span>
                    ) : (
                      <Link className="parent-weekly-duty-link" href="/parent/transportation">
                        <CarFront aria-hidden="true" size={15} /> Ride plan not set · coordinate
                      </Link>
                    )}
                    {nextEvent.handoffLabel ? (
                      <span><UsersRound aria-hidden="true" size={15} /> Handoff: {nextEvent.handoffLabel}</span>
                    ) : null}
                  </div>
                  {nextEvent.status === "cancelled" ? (
                    <p className="parent-weekly-cancelled">This event is cancelled in the official schedule.</p>
                  ) : (
                    <>
                      <div className="parent-weekly-rsvp-heading">
                        <span>Will {nextEvent.childLabel} be there?</span>
                        <strong>{responseLabel(getRsvp(nextEvent))}</strong>
                      </div>
                      <RsvpButtons
                        event={nextEvent}
                        response={getRsvp(nextEvent)}
                        pending={pendingProjection === nextEvent.projectionId}
                        disabled={!canWriteRsvp}
                        onSave={saveRsvp}
                      />
                      {!canWriteRsvp ? (
                        <p className="parent-weekly-write-boundary">
                          RSVP updates are available after live family access is confirmed.{" "}
                          <Link href="/parent/rsvp">Open RSVP center</Link>
                        </p>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="parent-weekly-next-scene parent-weekly-next-empty-scene">
                <div className="parent-weekly-field-image">
                  <Image
                    src="/images/leaguepilot-baseball-field-overhead.webp"
                    alt=""
                    fill
                    priority
                    sizes="(max-width: 1023px) 100vw, 66vw"
                  />
                  <span className="parent-weekly-field-overlay" />
                  <div className="parent-weekly-event-copy">
                    <span>This week · Official schedule</span>
                    <h3>No upcoming official events</h3>
                    <p>
                      <CalendarDays aria-hidden="true" size={17} />
                      {view.message}
                    </p>
                  </div>
                </div>
                <div className="parent-weekly-next-details parent-weekly-next-empty-actions">
                  <Link href="/parent/schedule">
                    Open full schedule
                    <ArrowRight aria-hidden="true" size={16} />
                  </Link>
                </div>
              </div>
            )}
          </section>

          <section
            className={`parent-weekly-card parent-weekly-readiness ${readinessItems.length ? "has-actions" : "is-clear"}`}
            aria-labelledby="parent-readiness-title"
          >
            <header className="parent-weekly-section-heading">
              <div>
                <span className="parent-weekly-kicker">Ready for Saturday</span>
                <h2 id="parent-readiness-title">
                  {readinessItems.length
                    ? `${readinessItems.length} ${readinessItems.length === 1 ? "thing needs" : "things need"} you`
                    : "Nothing unresolved for Saturday"}
                </h2>
              </div>
              <ShieldCheck aria-hidden="true" size={20} />
            </header>
            {readinessItems.length ? (
              <ol className="parent-weekly-readiness-actions">
                {readinessItems.map(({ id, label, detail, href, cta, Icon }) => (
                  <li key={id}>
                    <Icon aria-hidden="true" size={18} />
                    <span>
                      <strong>{label}</strong>
                      <small>{detail}</small>
                    </span>
                    <Link href={href}>
                      {cta}
                      <ArrowRight aria-hidden="true" size={15} />
                    </Link>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="parent-weekly-readiness-clear">
                <CheckCircle2 aria-hidden="true" size={17} />
                RSVP, ride, changes, and family assignments do not show unresolved items for the next event.
              </p>
            )}
          </section>

          <section className="parent-weekly-card parent-weekly-replay" aria-labelledby="parent-replay-title">
            <header className="parent-weekly-section-heading">
              <div>
                <span className="parent-weekly-kicker">Parent Replay</span>
                <h2 id="parent-replay-title">A small win to bring home</h2>
              </div>
              <Link href="/parent/practice-recaps">
                View all
                <ArrowRight aria-hidden="true" size={16} />
              </Link>
            </header>
            {recentReplays.length ? (
              <div className="parent-weekly-replay-list">
                {recentReplays.map((replay) => (
                  <ReplayActivity
                    key={replay.id}
                    replay={replay}
                    completed={completedReplayIds.has(replay.id)}
                    pending={pendingReplayId === replay.id}
                    onComplete={completeReplay}
                  />
                ))}
              </div>
            ) : (
              <div className="parent-weekly-empty parent-weekly-empty-compact">
                <BookOpenCheck aria-hidden="true" size={25} />
                <div>
                  <h3>Your first published Replay will appear here</h3>
                  <p>Coach drafts and unreviewed family media stay hidden.</p>
                </div>
                <Link href="/parent/practice-recaps">How Parent Replay works</Link>
              </div>
            )}
            <p className="parent-weekly-boundary-note">
              Replays are coach-reviewed and private to linked families. Trying an activity never scores or ranks a child.
            </p>
          </section>

          <section className="parent-weekly-card parent-weekly-schedule" aria-labelledby="parent-schedule-title">
            <header className="parent-weekly-section-heading">
              <div>
                <span className="parent-weekly-kicker">This week</span>
                <h2 id="parent-schedule-title">Family schedule</h2>
              </div>
              <Link href="/parent/schedule">
                Calendar
                <ArrowRight aria-hidden="true" size={16} />
              </Link>
            </header>
            {weeklyEvents.length ? (
              <ol>
                {weeklyEvents.slice(0, 5).map((event) => {
                  const response = getRsvp(event);
                  return (
                    <li key={event.projectionId}>
                      <div className="parent-weekly-date-tile" aria-hidden="true">
                        <span>{event.dateLabel.split(" ")[0]}</span>
                        <strong>{event.dateLabel.match(/\d+/)?.[0] ?? "•"}</strong>
                      </div>
                      <div className="parent-weekly-schedule-copy">
                        <span>{event.childLabel} · {event.teamName}</span>
                        <h3>{event.title}</h3>
                        <p>{event.startLabel} · {event.venueLabel}</p>
                      </div>
                      <span
                        className={`parent-weekly-response-badge response-${response ?? "needed"}`}
                        data-status={response ?? "needed"}
                      >
                        {responseLabel(response)}
                      </span>
                      {event.status === "scheduled" ? (
                        <RsvpButtons
                          event={event}
                          response={response}
                          pending={pendingProjection === event.projectionId}
                          disabled={!canWriteRsvp}
                          onSave={saveRsvp}
                        />
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            ) : (
              <div className="parent-weekly-empty parent-weekly-empty-compact">
                <CalendarDays aria-hidden="true" size={24} />
                <div>
                  <h3>No events in the next seven days</h3>
                  <p>Your coach and league admin publish the official schedule. New events appear here automatically.</p>
                </div>
              </div>
            )}
          </section>
        </div>

        <aside className="parent-weekly-secondary" aria-label="Family updates and readiness">
          <section className="parent-weekly-card parent-weekly-updates" aria-labelledby="parent-updates-title">
            <header className="parent-weekly-section-heading">
              <div>
                <span className="parent-weekly-kicker">Coach updates</span>
                <h2 id="parent-updates-title">From the team</h2>
              </div>
              <Link href="/parent/messages" aria-label="Open family messages">
                <MessageCircle aria-hidden="true" size={18} />
              </Link>
            </header>
            {announcements.length ? (
              <ol>
                {announcements.map((announcement) => (
                  <li key={announcement.id}>
                    <div className="parent-weekly-update-icon" aria-hidden="true">
                      <Megaphone size={17} />
                    </div>
                    <div>
                      <span>{formatAnnouncementDate(announcement.createdAt)}</span>
                      <h3>{announcement.title}</h3>
                      <p>{announcement.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="parent-weekly-empty parent-weekly-empty-compact">
                <Megaphone aria-hidden="true" size={23} />
                <div>
                  <h3>No current coach updates</h3>
                  <p>When your coach publishes an announcement, it lands here — no group texts to chase.</p>
                </div>
              </div>
            )}
            <Link className="parent-weekly-message-link" href="/parent/messages">
              Open Communication Room
              <ArrowRight aria-hidden="true" size={16} />
            </Link>
          </section>

          <Link className="parent-weekly-access-link" href="/parent/family-access">
            <ShieldCheck aria-hidden="true" size={18} />
            <span>
              <strong>Family access</strong>
              <small>See who can view your family’s records, and revoke access anytime.</small>
            </span>
            <ArrowRight aria-hidden="true" size={16} />
          </Link>
        </aside>
      </div>
    </div>
  );
}
