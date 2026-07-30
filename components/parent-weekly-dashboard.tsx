"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Megaphone,
  MessageCircle,
  ShieldCheck
} from "lucide-react";
import { useState, type CSSProperties } from "react";
import type { RsvpResponse } from "@/lib/domain";
import type { FamilyMissionControlView, FamilyMissionEvent } from "@/lib/family-mission-control";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { ParentCoachDashboardData } from "@/lib/supabase/dashboard-data";
import type { ParentEventChangeLogReadResult } from "@/lib/supabase/event-change-log-reads";
import type { FamilyReplayData, FamilyReplayStory } from "@/lib/supabase/family-replays";
import type { NotificationReceipt } from "@/lib/supabase/notification-receipts";
import type { ParentTransportationData } from "@/lib/supabase/transportation";
import {
  buildChildSaturdayReadiness,
  ChangeBand,
  EventPassport,
  FamilyFilter,
  MultiChildReadiness,
  ReadinessStrip,
  StatusChip,
  responseLabel
} from "./family";

interface ParentWeeklyDashboardProps {
  view: FamilyMissionControlView;
  dashboardData: ParentCoachDashboardData;
  replayData: FamilyReplayData;
  notificationReceipts: NotificationReceipt[];
  notificationLoadOk: boolean;
  transportationData: ParentTransportationData;
  eventChangeData: ParentEventChangeLogReadResult;
}

interface LocalRsvp {
  response: RsvpResponse;
  lockVersion: number;
  confirmedScheduleVersion: number;
}

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

function ProgressRow({
  label,
  value,
  detail
}: {
  label: string;
  value: number;
  detail: string;
}) {
  const safeValue = Math.min(100, Math.max(0, value));
  return (
    <li>
      <div>
        <strong>{label}</strong>
        <span>{detail}</span>
      </div>
      <div
        className="parent-weekly-progress"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={safeValue}
        style={{ "--parent-weekly-progress": `${safeValue}%` } as CSSProperties}
      >
        <span />
      </div>
    </li>
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

export function ParentWeeklyDashboard({
  view,
  dashboardData,
  replayData,
  notificationReceipts,
  notificationLoadOk,
  transportationData,
  eventChangeData
}: ParentWeeklyDashboardProps) {
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
  const [completedReplayIds, setCompletedReplayIds] = useState(() => (
    new Set(replayData.replays.filter((replay) => replay.activityCompletedAt).map((replay) => replay.id))
  ));
  const [pendingReplayId, setPendingReplayId] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [selectedChildId, setSelectedChildId] = useState("");
  const [visibleChanges, setVisibleChanges] = useState(eventChangeData.changes);

  const scopedEvents = selectedChildId
    ? view.events.filter((event) => event.childId === selectedChildId)
    : view.events;
  const primaryChild = view.children.find((child) => child.id === selectedChildId) ?? view.children[0];
  const primaryPlayer = dashboardData.state.players.find((player) => player.id === primaryChild?.id);
  const primaryTeam = dashboardData.state.teams.find((team) => team.id === primaryChild?.teamId);
  const parentUser = dashboardData.state.users.find((user) => user.id === dashboardData.parentUserId);
  const weeklyEvents = scopedEvents
    .filter((event) => Date.parse(event.startsAt) <= Date.parse(view.weekEndsAt))
    .slice(0, 8);
  const nextEvent = scopedEvents.find((event) => event.status === "scheduled") ?? scopedEvents[0];
  const announcements = [...dashboardData.state.announcements]
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
    .slice(0, 2);
  const recentReplays = replayData.replays.slice(0, 2);

  const getStoredRsvp = (event: FamilyMissionEvent) => localRsvps[rsvpKey(event.eventId, event.childId)];
  const getCurrentRsvp = (event: FamilyMissionEvent) => {
    const local = getStoredRsvp(event);
    if (!local || local.confirmedScheduleVersion < event.scheduleVersion) return undefined;
    return local.response;
  };
  const childReadiness = view.children.map((child) => {
    const childEvents = view.events.filter((event) => event.childId === child.id);
    const event = childEvents.find((item) => item.status === "scheduled") ?? childEvents[0];
    return buildChildSaturdayReadiness({
      child,
      event,
      currentRsvp: event ? getStoredRsvp(event)?.response : undefined,
      notificationReceipts,
      notificationLoadOk,
      transportationData,
      visibleChanges,
      eventChangeLoadOk: eventChangeData.ok,
      conflicts: view.conflicts
    });
  });
  const selectedReadiness = childReadiness.find((summary) => summary.child.id === selectedChildId)
    ?? childReadiness[0];
  const showAllChildren = !selectedChildId && childReadiness.length > 1;

  const answeredEvents = weeklyEvents.filter((event) => {
    const response = getCurrentRsvp(event);
    return response && response !== "cancelled";
  }).length;
  const goingEvents = weeklyEvents.filter((event) => getCurrentRsvp(event) === "going").length;
  const needsReply = weeklyEvents.filter((event) => !getCurrentRsvp(event) || getCurrentRsvp(event) === "cancelled").length;
  const rsvpCoverage = weeklyEvents.length ? Math.round((answeredEvents / weeklyEvents.length) * 100) : 0;
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
  const familyHeading = view.children.length > 1 && !selectedChildId
    ? "Your family week"
    : view.children.length > 1
      ? `${firstName}'s family week`
    : `${firstName}'s week`;
  const teamMark = initials(primaryTeam?.mascot || primaryTeam?.name || "LP");
  const storageKey = [
    "leaguepilot:event-change-watermark:v1",
    dashboardData.parentUserId || "signed-out",
    dashboardData.state.organization.id,
    dashboardData.state.activeSeason.id,
    selectedChildId || eventChangeData.scope.familyContextKey || "everyone"
  ].join(":");
  const snapshotRows = [
    {
      label: "RSVP coverage",
      value: rsvpCoverage,
      detail: weeklyEvents.length ? `${answeredEvents} of ${weeklyEvents.length} answered` : "No events this week"
    },
    {
      label: "Family help",
      value: Math.min(100, familyAssignments * 34),
      detail: familyAssignments ? `${familyAssignments} current assignment${familyAssignments === 1 ? "" : "s"}` : "No current assignments"
    },
    {
      label: "Published Replays",
      value: Math.min(100, replayData.replays.length * 25),
      detail: replayData.replays.length ? `${replayData.replays.length} ready for your family` : "None published yet"
    }
  ];

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
        <FamilyFilter childrenList={view.children} selectedChildId={selectedChildId} onSelect={setSelectedChildId} />
      </section>

      {statusMessage ? (
        <p className="parent-weekly-status" role="status" aria-live="polite">{statusMessage}</p>
      ) : null}

      <ChangeBand
        changes={selectedChildId
          ? eventChangeData.changes.filter((change) => change.childIds.includes(selectedChildId))
          : eventChangeData.changes}
        querySucceeded={eventChangeData.ok}
        storageKey={storageKey}
        timeZone={eventChangeData.scope.timeZone}
        onVisibleChanges={setVisibleChanges}
      />

      {showAllChildren ? (
        <MultiChildReadiness summaries={childReadiness} />
      ) : (
        <>
          <EventPassport
            event={nextEvent}
            currentResponse={nextEvent ? getStoredRsvp(nextEvent)?.response : undefined}
            currentLockVersion={nextEvent ? getStoredRsvp(nextEvent)?.lockVersion ?? 0 : 0}
            canWriteRsvp={canWriteRsvp}
            transportationLane={selectedReadiness?.lanes.find((lane) => lane.id === "transportation")}
            pending={false}
            onRsvpSaved={(result) => {
              if (!nextEvent) return;
              setLocalRsvps((existing) => ({
                ...existing,
                [rsvpKey(nextEvent.eventId, nextEvent.childId)]: {
                  response: result.response,
                  lockVersion: result.lockVersion,
                  confirmedScheduleVersion: result.scheduleVersion
                }
              }));
              setStatusMessage(result.message);
            }}
          />
          <ReadinessStrip
            eventTitle={selectedReadiness?.event?.title}
            items={selectedReadiness?.unresolvedItems ?? []}
          />
        </>
      )}

      <div className="parent-weekly-layout">
        <div className="parent-weekly-primary">
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
                  const response = getCurrentRsvp(event);
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
                      <StatusChip tone={response && response !== "cancelled" ? "confirmed" : "action"} className="parent-weekly-response-badge">
                        {responseLabel(response)}
                      </StatusChip>
                      {event.status === "scheduled" && (!response || event.rsvpOutdated) ? (
                        <Link className="parent-weekly-row-action" href={`/parent/rsvp?eventId=${encodeURIComponent(event.eventId)}&playerId=${encodeURIComponent(event.childId)}`}>
                          RSVP
                          <ArrowRight aria-hidden="true" size={14} />
                        </Link>
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
                {announcements.map((announcement) => {
                  const receipt = notificationReceipts.find((item) => (
                    item.teamId === announcement.teamId &&
                    (item.title === announcement.title || item.body.includes(announcement.title))
                  ));
                  return (
                    <li key={announcement.id}>
                      <div className="parent-weekly-update-icon" aria-hidden="true">
                        <Megaphone size={17} />
                      </div>
                      <div>
                        <span>{formatAnnouncementDate(announcement.createdAt)}</span>
                        <h3>{announcement.title}</h3>
                        <p>{announcement.body}</p>
                        {receipt ? (
                          <StatusChip tone={receipt.evidence.acknowledgedAt ? "confirmed" : "action"}>
                            {receipt.evidence.acknowledgedAt ? `Acknowledged ${formatAnnouncementDate(receipt.evidence.acknowledgedAt)}` : "Needs acknowledgement"}
                          </StatusChip>
                        ) : (
                          <StatusChip tone="neutral">No receipt evidence</StatusChip>
                        )}
                      </div>
                    </li>
                  );
                })}
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

          <section className="parent-weekly-card parent-weekly-readiness" aria-labelledby="parent-readiness-title">
            <header className="parent-weekly-section-heading">
              <div>
                <span className="parent-weekly-kicker">Family readiness</span>
                <h2 id="parent-readiness-title">This season at home</h2>
              </div>
              <ShieldCheck aria-hidden="true" size={20} />
            </header>
            <ul>
              {snapshotRows.map((row) => <ProgressRow key={row.label} {...row} />)}
            </ul>
            <p>
              <ShieldCheck aria-hidden="true" size={15} />
              Family logistics only. This view does not evaluate athlete performance.
            </p>
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
