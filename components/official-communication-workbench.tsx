"use client";

import { useMemo, useState, useTransition } from "react";
import type { LeagueEvent, Team } from "@/lib/domain";
import {
  type OfficialCommunicationAction,
  type OfficialCommunicationCategory,
  type OfficialCommunicationPriority,
  type OfficialCommunicationReviewData,
  type OfficialCommunicationThreadView
} from "@/lib/supabase/official-communications";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

interface OfficialCommunicationWorkbenchProps {
  events: LeagueEvent[];
  teams: Team[];
  initialData: OfficialCommunicationReviewData;
}

function actionReceipt() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `official-message-${crypto.randomUUID()}`
    : `official-message-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function authenticatedJsonFetch(payload: unknown) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Idempotency-Key": actionReceipt()
  };
  try {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) headers.authorization = `Bearer ${data.session.access_token}`;
  } catch {
    // The route fails closed when a verified session is absent.
  }
  return fetch("/api/official-communications/publish", {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });
}

function formatDateTime(value: string) {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp)
    ? "Time unavailable"
    : new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }).format(timestamp);
}

function categoryLabel(category: OfficialCommunicationCategory) {
  if (category === "official_disruption") return "Schedule disruption";
  if (category === "critical_instruction") return "Critical instruction";
  return "Official update";
}

export function OfficialCommunicationWorkbench({
  events,
  teams,
  initialData
}: OfficialCommunicationWorkbenchProps) {
  const firstEvent = events[0];
  const [threads, setThreads] = useState(initialData.threads);
  const [selectedThreadId, setSelectedThreadId] = useState("");
  const [eventId, setEventId] = useState(firstEvent?.id ?? "");
  const [action, setAction] = useState<OfficialCommunicationAction>("published");
  const [category, setCategory] = useState<OfficialCommunicationCategory>("official_update");
  const [priority, setPriority] = useState<OfficialCommunicationPriority>("action_required");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [reason, setReason] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [statusMessage, setStatusMessage] = useState(initialData.message);
  const [isPending, startTransition] = useTransition();
  const selectedThread = threads.find((thread) => thread.id === selectedThreadId);
  const selectedEvent = events.find((event) => event.id === eventId);
  const selectedTeam = teams.find((team) => team.id === selectedEvent?.teamId);
  const eventOptions = useMemo(
    () => [...events].sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt)),
    [events]
  );

  function beginRevision(thread: OfficialCommunicationThreadView, nextAction: "corrected" | "withdrawn") {
    setSelectedThreadId(thread.id);
    setEventId(thread.eventId);
    setAction(nextAction);
    setCategory(thread.category);
    setPriority(thread.priority);
    setTitle(nextAction === "withdrawn" ? `Withdrawn: ${thread.title}` : thread.title);
    setBody(nextAction === "withdrawn" ? "This message is no longer current. Follow the latest official team information." : thread.body);
    setReason("");
    setReviewed(false);
    document.getElementById("official-message-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function beginNew() {
    setSelectedThreadId("");
    setAction("published");
    setCategory("official_update");
    setPriority("action_required");
    setTitle("");
    setBody("");
    setReason("");
    setReviewed(false);
  }

  function publish() {
    if (!selectedEvent || !reviewed) return;
    const payload = {
      threadId: selectedThread?.id,
      eventId: selectedEvent.id,
      action,
      category,
      priority,
      title,
      body,
      reason,
      expectedThreadVersion: selectedThread?.currentVersionNumber ?? 0,
      expectedScheduleVersion: selectedEvent.scheduleVersion ?? 1
    };
    startTransition(async () => {
      const response = await authenticatedJsonFetch(payload);
      const result = await response.json().catch(() => ({
        ok: false,
        message: "Official message response was unavailable."
      })) as {
        ok: boolean;
        message: string;
        threadId?: string;
        versionId?: string;
        versionNumber?: number;
        eventScheduleVersion?: number;
      };
      setStatusMessage(result.message);
      if (!result.ok || !result.threadId || !result.versionId || !result.versionNumber || !result.eventScheduleVersion) return;
      const nextThread: OfficialCommunicationThreadView = {
        id: result.threadId,
        organizationId: selectedEvent.organizationId,
        teamId: selectedEvent.teamId,
        eventId: selectedEvent.id,
        category,
        state: action === "withdrawn" ? "withdrawn" : "published",
        currentVersionNumber: result.versionNumber,
        currentVersionId: result.versionId,
        title,
        body,
        reason,
        priority,
        approvedByUserId: selectedThread?.approvedByUserId ?? "",
        approvedByName: "You",
        publishedAt: new Date().toISOString(),
        eventScheduleVersion: result.eventScheduleVersion,
        requiredProjectionCount: 4,
        readyProjectionCount: 4,
        openIncident: false
      };
      setThreads((current) => [nextThread, ...current.filter((thread) => thread.id !== nextThread.id)]);
      setSelectedThreadId(nextThread.id);
      setReviewed(false);
    });
  }

  return (
    <div className="page official-communication-workbench">
      <section className="hero">
        <span className="eyebrow">Communication readiness</span>
        <h1>Publish one official message version everywhere families look.</h1>
        <p className="lead">Review the exact event version, wording, priority, and reason. Publishing creates recipient records and an audit trail; external email, text, and push delivery still require separate review.</p>
        <div className="toolbar">
          <button type="button" onClick={beginNew}>Draft a new official message</button>
          <a className="button secondary" href="/admin/message-delivery-review">Review external delivery</a>
        </div>
      </section>

      <section className="grid three" aria-label="Communication safety boundaries">
        <article className="card metric"><span className="muted">Official history</span><strong>Immutable</strong><small>Correct with a new version</small></article>
        <article className="card metric"><span className="muted">Family surfaces</span><strong>4 required</strong><small>Same event version</small></article>
        <article className="card metric"><span className="muted">Provider delivery</span><strong>Separate</strong><small>Never started by publish</small></article>
      </section>

      <section className="grid two official-communication-layout">
        <article className="card stack" id="official-message-editor">
          <div className="card-header">
            <div>
              <span className="eyebrow">{selectedThread ? `Message version ${selectedThread.currentVersionNumber + 1}` : "New official message"}</span>
              <h2>{action === "corrected" ? "Publish a correction" : action === "withdrawn" ? "Withdraw the current message" : "Review before publishing"}</h2>
            </div>
            <span className={`badge ${priority === "critical" ? "danger" : priority === "disruption" ? "warning" : ""}`}>{priority.replace("_", " ")}</span>
          </div>

          <label>
            Event
            <select value={eventId} disabled={Boolean(selectedThread)} onChange={(event) => setEventId(event.target.value)}>
              {!eventOptions.length ? <option value="">No events available</option> : null}
              {eventOptions.map((event) => {
                const team = teams.find((item) => item.id === event.teamId);
                return <option value={event.id} key={event.id}>{team?.name ?? "Team"} · {event.title} · v{event.scheduleVersion ?? 1}</option>;
              })}
            </select>
          </label>
          {selectedEvent ? (
            <div className="notice official-event-version">
              <strong>{selectedTeam?.name ?? "Team"} · official event version {selectedEvent.scheduleVersion ?? 1}</strong>
              <span>{formatDateTime(selectedEvent.startsAt)} · {selectedEvent.locationName} · {selectedEvent.status}</span>
            </div>
          ) : null}
          <div className="grid two">
            <label>
              Message type
              <select
                value={category}
                disabled={Boolean(selectedThread)}
                onChange={(event) => {
                  const nextCategory = event.target.value as OfficialCommunicationCategory;
                  setCategory(nextCategory);
                  setPriority(nextCategory === "critical_instruction"
                    ? "critical"
                    : nextCategory === "official_disruption"
                      ? "disruption"
                      : "action_required");
                }}
              >
                <option value="official_update">Official update</option>
                <option value="official_disruption">Schedule disruption</option>
                <option value="critical_instruction">Critical instruction</option>
              </select>
            </label>
            <label>
              Priority
              <select value={priority} onChange={(event) => setPriority(event.target.value as OfficialCommunicationPriority)}>
                {category === "official_update" ? <option value="routine">Routine</option> : null}
                {category === "official_update" ? <option value="action_required">Action required</option> : null}
                {category === "official_disruption" ? <option value="disruption">Disruption</option> : null}
                {category !== "official_update" ? <option value="critical">Critical</option> : null}
              </select>
            </label>
          </div>
          <label>
            Family-facing title
            <input value={title} maxLength={160} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label>
            Family-facing message
            <textarea value={body} maxLength={3000} rows={6} onChange={(event) => setBody(event.target.value)} />
          </label>
          <label>
            Why this is being published or changed
            <textarea value={reason} maxLength={1000} rows={3} onChange={(event) => setReason(event.target.value)} />
            <small>This reason remains in the version history and audit record.</small>
          </label>
          <label className="check-row official-human-review">
            <input type="checkbox" checked={reviewed} onChange={(event) => setReviewed(event.target.checked)} />
            <span>I reviewed the event version, family wording, priority, and affected team.</span>
          </label>
          <button
            type="button"
            data-analytics-event="official_message_published"
            data-analytics-action={action}
            disabled={isPending || !selectedEvent || !reviewed || title.trim().length < 3 || body.trim().length < 3 || reason.trim().length < 10}
            onClick={publish}
          >
            {isPending ? "Recording reviewed message…" : action === "corrected" ? "Publish correction" : action === "withdrawn" ? "Publish withdrawal" : "Publish official message"}
          </button>
          <p className="notice" role="status">{statusMessage}</p>
        </article>

        <div className="stack">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Current official truth</span>
              <h2>Published message history</h2>
            </div>
            <span className="badge">{threads.length} thread(s)</span>
          </div>
          {threads.map((thread) => {
            const event = events.find((item) => item.id === thread.eventId);
            const team = teams.find((item) => item.id === thread.teamId);
            return (
              <article className={`card official-thread-card ${thread.openIncident ? "has-incident" : ""}`} key={thread.id}>
                <div className="card-header">
                  <div>
                    <span className="eyebrow">{categoryLabel(thread.category)} · version {thread.currentVersionNumber}</span>
                    <h3>{thread.title}</h3>
                  </div>
                  <span className={`badge ${thread.state === "withdrawn" ? "danger" : thread.openIncident ? "warning" : "ok"}`}>
                    {thread.state === "withdrawn" ? "Withdrawn" : thread.openIncident ? "Needs attention" : "Current"}
                  </span>
                </div>
                <p>{thread.body}</p>
                <dl className="official-thread-facts">
                  <div><dt>Event</dt><dd>{team?.name ?? "Team"} · {event?.title ?? "Event"} · v{thread.eventScheduleVersion}</dd></div>
                  <div><dt>Published</dt><dd>{thread.approvedByName ?? "Publisher recorded"} · {formatDateTime(thread.publishedAt)}</dd></div>
                  <div><dt>Propagation</dt><dd>{thread.readyProjectionCount} of {thread.requiredProjectionCount} required surfaces ready</dd></div>
                  <div><dt>Reason</dt><dd>{thread.reason}</dd></div>
                </dl>
                {thread.openIncident ? <p className="notice warning" role="alert">A required family surface does not match this version. Correct the propagation record before closing the incident.</p> : null}
                <div className="toolbar">
                  <button type="button" className="secondary" data-analytics-event="official_message_revision_started" data-analytics-action="corrected" disabled={thread.state === "withdrawn"} onClick={() => beginRevision(thread, "corrected")}>Correct</button>
                  <button type="button" className="secondary danger" data-analytics-event="official_message_revision_started" data-analytics-action="withdrawn" disabled={thread.state === "withdrawn"} onClick={() => beginRevision(thread, "withdrawn")}>Withdraw</button>
                </div>
              </article>
            );
          })}
          {!threads.length ? <article className="card empty-state"><h3>No official messages yet</h3><p>Choose an event and publish only after a staff member reviews the exact family wording.</p></article> : null}
        </div>
      </section>
    </div>
  );
}
