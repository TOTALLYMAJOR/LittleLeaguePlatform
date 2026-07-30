"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import type { ParentCoachDashboardData } from "@/lib/supabase/dashboard-data";
import type { NotificationReceipt } from "@/lib/supabase/notification-receipts";
import type { TeamChatData } from "@/lib/supabase/team-chat";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { markLeaguePilotValueExperienced } from "@/app/providers";

type CommunicationLane = "critical" | "updates" | "conversation";

export interface CommunicationRoomProps {
  dashboardData: ParentCoachDashboardData;
  initialReceipts: NotificationReceipt[];
  receiptLoadOk: boolean;
  receiptMessage: string;
  teamChatData: TeamChatData;
  viewerUserId: string;
}

const criticalNotificationTypes = new Set(["event_cancelled", "weather_alert"]);

function formatDateTime(value?: string) {
  if (!value) return "Not recorded";
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return "Time unavailable";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(timestamp);
}

function formatEventDate(value: string) {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return "Date unavailable";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(timestamp);
}

function displayRole(role: string) {
  if (role === "coach") return "Coach";
  if (role === "admin") return "League administrator";
  return "Parent";
}

async function authenticatedJsonFetch(url: string, payload: unknown) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  try {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) headers.authorization = `Bearer ${data.session.access_token}`;
  } catch {
    // The private route returns an explicit 401 when a verified session is absent.
  }
  return fetch(url, { method: "POST", headers, body: JSON.stringify(payload) });
}

function SourceSummary({
  familyCurrent,
  chatCurrent,
  receiptsCurrent
}: {
  familyCurrent: boolean;
  chatCurrent: boolean;
  receiptsCurrent: boolean;
}) {
  const allCurrent = familyCurrent && chatCurrent && receiptsCurrent;
  return (
    <div className="communication-source-summary">
      <span className={`communication-source-status ${allCurrent ? "current" : "attention"}`}>
        <span aria-hidden="true" />
        {allCurrent ? "Family communication is current" : "Some communication sources are unavailable"}
      </span>
      <details>
        <summary>Source details</summary>
        <ul>
          <li>{familyCurrent ? "Family links current" : "Family links unavailable"}</li>
          <li>{chatCurrent ? "Conversation current" : "Conversation preview"}</li>
          <li>{receiptsCurrent ? "Message status current" : "Message status unavailable"}</li>
        </ul>
      </details>
    </div>
  );
}

function ReceiptStages({ receipt }: { receipt: NotificationReceipt }) {
  const publishedAt = receipt.officialRevision?.publishedAt ?? receipt.evidence.approvedAt;
  const stages = [
    {
      label: "Published",
      complete: Boolean(receipt.officialRevision || receipt.providerApprovalStatus === "approved"),
      detail: publishedAt ? formatDateTime(publishedAt) : "Time unavailable"
    },
    {
      label: "Delivered",
      complete: Boolean(receipt.evidence.deliveredAt),
      detail: receipt.evidence.deliveredAt ? formatDateTime(receipt.evidence.deliveredAt) : "Not confirmed"
    },
    {
      label: "Read",
      complete: Boolean(receipt.evidence.readAt ?? receipt.notificationReadAt),
      detail: receipt.evidence.readAt || receipt.notificationReadAt
        ? formatDateTime(receipt.evidence.readAt ?? receipt.notificationReadAt)
        : "Not confirmed"
    },
    {
      label: "Acknowledged",
      complete: Boolean(receipt.evidence.acknowledgedAt),
      detail: receipt.evidence.acknowledgedAt ? formatDateTime(receipt.evidence.acknowledgedAt) : "Not yet"
    }
  ];

  return (
    <ol className="communication-receipt-stages" aria-label={`Message status for ${receipt.title}`}>
      {stages.map((stage) => (
        <li className={stage.complete ? "complete" : "incomplete"} key={stage.label}>
          <span className="communication-stage-mark" aria-hidden="true" />
          <span>
            <strong>{stage.label}</strong>
            <small>{stage.detail}</small>
          </span>
        </li>
      ))}
    </ol>
  );
}

function RevisionTruth({ receipt }: { receipt: NotificationReceipt }) {
  const revision = receipt.officialRevision;
  if (!revision) return null;
  const priorVersions = revision.history.filter((entry) => entry.versionId !== revision.versionId);
  return (
    <aside className={`communication-revision-truth ${revision.action}`} aria-label="Official message revision">
      <div>
        <strong>
          {revision.action === "withdrawn"
            ? `Withdrawn · version ${revision.versionNumber}`
            : revision.action === "corrected"
              ? `Corrected · current version ${revision.versionNumber}`
              : `Published · version ${revision.versionNumber}`}
        </strong>
        <span>
          Event schedule version {revision.eventScheduleVersion}
          {" · "}
          {revision.approvedByName ? `Published by ${revision.approvedByName}` : "Publisher recorded"}
          {" · "}
          {formatDateTime(revision.publishedAt)}
        </span>
      </div>
      {revision.partialPropagation ? (
        <p className="notice warning" role="alert">
          This update has not reached every required family surface. League staff are correcting the mismatch.
        </p>
      ) : (
        <p className="communication-projection-ok">
          Same official event version ready on {revision.readyProjectionCount} of {revision.requiredProjectionCount} required surfaces.
        </p>
      )}
      {priorVersions.length ? (
        <details>
          <summary>See correction history</summary>
          <ol>
            {priorVersions.map((entry) => (
              <li key={entry.versionId}>
                <strong>Version {entry.versionNumber} · {entry.action}</strong>
                <span>{entry.title}</span>
                <p>{entry.body}</p>
                <small>
                  Reason: {entry.reason}
                  {" · "}
                  {entry.approvedByName ? `${entry.approvedByName} · ` : ""}
                  {formatDateTime(entry.publishedAt)}
                </small>
              </li>
            ))}
          </ol>
        </details>
      ) : null}
    </aside>
  );
}

function EventContext({
  eventId,
  teamChatData
}: {
  eventId?: string;
  teamChatData: TeamChatData;
}) {
  const event = teamChatData.events.find((item) => item.id === eventId);
  if (!event) return null;
  const team = teamChatData.teams.find((item) => item.id === event.teamId);

  return (
    <details className="communication-event-disclosure">
      <summary>Event details · {team?.name ?? "Team"} · {formatEventDate(event.startsAt)}</summary>
      <dl className="communication-event-context">
        <div><dt>Team</dt><dd>{team?.name ?? "Team"}</dd></div>
        <div><dt>Activity</dt><dd>{event.eventType === "game" ? "Game" : event.eventType === "practice" ? "Practice" : "Team event"}</dd></div>
        <div><dt>Date and time</dt><dd>{formatEventDate(event.startsAt)}</dd></div>
        <div><dt>Opponent</dt><dd>{event.opponent ?? "Not applicable"}</dd></div>
        <div><dt>Venue and field</dt><dd>{event.locationName}</dd></div>
        <div><dt>Status</dt><dd>{event.status}</dd></div>
      </dl>
    </details>
  );
}

export function CommunicationRoom({
  dashboardData,
  initialReceipts,
  receiptLoadOk,
  receiptMessage,
  teamChatData,
  viewerUserId
}: CommunicationRoomProps) {
  const [lane, setLane] = useState<CommunicationLane>("critical");
  const [selectedTeamId, setSelectedTeamId] = useState("all");
  const [composerTeamId, setComposerTeamId] = useState(teamChatData.teams[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [receipts, setReceipts] = useState(initialReceipts);
  const [messages, setMessages] = useState(teamChatData.messages);
  const [draft, setDraft] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [pendingAckId, setPendingAckId] = useState("");
  const [isOffline, setIsOffline] = useState(false);
  const [isPending, startTransition] = useTransition();

  const children = dashboardData.state.players.map((player) => ({
    ...player,
    team: teamChatData.teams.find((team) => team.id === player.teamId)
  }));
  const publishedReceipts = receipts.filter((receipt) => (
    Boolean(receipt.officialRevision) || receipt.providerApprovalStatus === "approved"
  ));
  const pendingOfficialCount = receipts.filter((receipt) => (
    !receipt.officialRevision && receipt.providerApprovalStatus !== "approved"
  )).length;
  const criticalReceipts = publishedReceipts.filter((receipt) => (
    criticalNotificationTypes.has(receipt.notificationType) ||
    receipt.officialRevision?.priority === "critical" ||
    receipt.officialRevision?.priority === "disruption"
  ));
  const updateReceipts = publishedReceipts.filter((receipt) => !criticalReceipts.includes(receipt));
  const announcements = messages.filter((message) => message.kind === "announcement" && message.moderationStatus === "visible");
  const conversationMessages = messages.filter((message) => message.kind === "message" && message.moderationStatus === "visible");
  const unreadCriticalCount = criticalReceipts.filter((receipt) => !receipt.evidence.acknowledgedAt).length;
  const unreadConversationCount = conversationMessages.filter((message) => (
    message.authorUserId !== viewerUserId && !message.readByUserIds.includes(viewerUserId)
  )).length;
  const chatIsCurrent = teamChatData.isSupabaseBacked === true;
  const familyDataIsCurrent = dashboardData.isSupabaseBacked;
  const nextEvent = teamChatData.events
    .filter((event) => selectedTeamId === "all" || event.teamId === selectedTeamId)
    .filter((event) => event.status === "scheduled")
    .sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt))[0];

  const visibleCritical = useMemo(() => criticalReceipts.filter((receipt) => (
    (selectedTeamId === "all" || receipt.teamId === selectedTeamId) &&
    `${receipt.title} ${receipt.body}`.toLowerCase().includes(query.trim().toLowerCase())
  )), [criticalReceipts, query, selectedTeamId]);

  const visibleUpdates = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const receiptItems = updateReceipts
      .filter((receipt) => selectedTeamId === "all" || receipt.teamId === selectedTeamId)
      .filter((receipt) => `${receipt.title} ${receipt.body}`.toLowerCase().includes(normalizedQuery))
      .map((receipt) => ({ kind: "receipt" as const, createdAt: receipt.createdAt, receipt }));
    const announcementItems = announcements
      .filter((message) => selectedTeamId === "all" || message.teamId === selectedTeamId)
      .filter((message) => message.body.toLowerCase().includes(normalizedQuery))
      .map((message) => ({ kind: "announcement" as const, createdAt: message.createdAt, message }));
    return [...receiptItems, ...announcementItems]
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
  }, [announcements, query, selectedTeamId, updateReceipts]);

  const visibleConversation = useMemo(() => conversationMessages
    .filter((message) => selectedTeamId === "all" || message.teamId === selectedTeamId)
    .filter((message) => message.body.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt)), [
    conversationMessages,
    query,
    selectedTeamId
  ]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setIsOffline(!navigator.onLine));
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    if (!chatIsCurrent) return;
    const unreadMessageIds = messages
      .filter((message) => (
        message.authorUserId !== viewerUserId &&
        !message.readByUserIds.includes(viewerUserId) &&
        message.moderationStatus === "visible"
      ))
      .map((message) => message.id);
    if (!unreadMessageIds.length) return;
    void authenticatedJsonFetch("/api/team-chat/read-receipts", { messageIds: unreadMessageIds });
  }, [chatIsCurrent, messages, viewerUserId]);

  function selectChild(teamId: string) {
    setSelectedTeamId(teamId);
    setComposerTeamId(teamId);
  }

  function selectLane(nextLane: CommunicationLane) {
    setLane(nextLane);
    window.requestAnimationFrame(() => {
      document.getElementById(`communication-${nextLane}`)?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });
  }

  function acknowledge(receipt: NotificationReceipt) {
    setPendingAckId(receipt.notificationId);
    setStatusMessage("");
    startTransition(async () => {
      try {
        const response = await authenticatedJsonFetch("/api/notifications/acknowledge", {
          notificationId: receipt.notificationId
        });
        const result = await response.json().catch(() => null) as {
          ok?: boolean;
          message?: string;
          acknowledgedAt?: string;
        } | null;
        if (result?.ok) {
          const acknowledgedAt = result.acknowledgedAt ?? new Date().toISOString();
          setReceipts((current) => current.map((item) => item.notificationId === receipt.notificationId ? {
            ...item,
            notificationStatus: "read",
            evidence: { ...item.evidence, acknowledgedAt }
          } : item));
          setStatusMessage("Receipt confirmed. This does not record attendance, agreement, or completion.");
          markLeaguePilotValueExperienced("critical_message_acknowledged");
        } else {
          setStatusMessage(result?.message ?? "We could not confirm your receipt. Please try again.");
        }
      } catch {
        setStatusMessage("We could not reach team records. Your acknowledgment was not recorded.");
      } finally {
        setPendingAckId("");
      }
    });
  }

  function sendReply() {
    const body = draft.trim();
    if (!body || !composerTeamId || isOffline || !chatIsCurrent) return;
    setStatusMessage("");
    startTransition(async () => {
      try {
        const response = await authenticatedJsonFetch("/api/team-chat/messages", {
          teamId: composerTeamId,
          body,
          kind: "message"
        });
        const result = await response.json().catch(() => null) as {
          ok?: boolean;
          message?: string;
          createdMessage?: TeamChatData["messages"][number];
        } | null;
        if (result?.ok && result.createdMessage) {
          setMessages((current) => current.some((item) => item.id === result.createdMessage!.id)
            ? current
            : [...current, result.createdMessage!]);
          setDraft("");
          setStatusMessage("Your reply is saved in the team conversation.");
        } else {
          setStatusMessage(result?.message ?? "Your reply was not saved. Your draft is still here.");
        }
      } catch {
        setStatusMessage("Your reply was not saved. Reconnect and try again; your draft is still here.");
      }
    });
  }

  return (
    <div className="page communication-room" data-analytics-surface="parent_communication_room">
      <header className="communication-room-header">
        <div>
          <span className="eyebrow">Family communication</span>
          <h1>Communication Room</h1>
          <p>Critical instructions, official team updates, and family conversation stay clearly separated.</p>
        </div>
        <div className="communication-freshness" aria-label="Information freshness">
          <SourceSummary
            familyCurrent={familyDataIsCurrent}
            chatCurrent={chatIsCurrent}
            receiptsCurrent={receiptLoadOk}
          />
        </div>
      </header>

      <section className="communication-family-strip" aria-labelledby="family-context-title">
        <div>
          <span className="eyebrow" id="family-context-title">Your family</span>
          <p>Switch children or see every linked team without changing accounts.</p>
        </div>
        <div className="communication-family-filters">
          <button
            aria-pressed={selectedTeamId === "all"}
            className={selectedTeamId === "all" ? "active" : ""}
            data-analytics-context="all"
            data-analytics-event="communication_context_changed"
            onClick={() => setSelectedTeamId("all")}
            type="button"
          >
            All teams
            <small>{teamChatData.teams.length} linked</small>
          </button>
          {children.map((child) => (
            <button
              aria-pressed={selectedTeamId === child.teamId}
              className={selectedTeamId === child.teamId ? "active" : ""}
              data-analytics-context={child.teamId}
              data-analytics-event="communication_context_changed"
              key={child.id}
              onClick={() => selectChild(child.teamId)}
              type="button"
            >
              {child.firstName} {child.lastInitial}.
              <small>{child.team?.name ?? "Team unavailable"}</small>
            </button>
          ))}
        </div>
        {!children.length ? (
          <p className="communication-inline-alert">No active child-team link is available. Visit Family Access to check what is pending.</p>
        ) : null}
      </section>

      <aside className="communication-global-context" aria-label="Current communication context">
        <section>
          <span className="eyebrow">Current event</span>
          {nextEvent ? (
            <div className="stack-sm">
              <h3>{nextEvent.title}</h3>
              <p>{formatEventDate(nextEvent.startsAt)}</p>
              <p>{nextEvent.locationName}</p>
              <p className="muted">Arrival appears only when team staff publish it. Start time is not treated as arrival time.</p>
              <Link className="button secondary" href="/parent/schedule">Open family schedule</Link>
            </div>
          ) : <p className="muted">No scheduled event is available for this family view.</p>}
        </section>
        <details className="communication-authority-detail">
          <summary>What this room can confirm</summary>
          <div className="stack-sm">
            <p><strong>Acknowledgment</strong> proves you reviewed this message version. It does not prove attendance, agreement, compliance, safety completion, or ride responsibility.</p>
            <p><strong>Human authority</strong> controls schedule changes, cancellations, permissions, attendance, rides, and emergency instructions.</p>
          </div>
        </details>
      </aside>

      <nav className="communication-lanes" aria-label="Jump to a communication lane">
        <button
          aria-controls="communication-critical"
          aria-pressed={lane === "critical"}
          className={lane === "critical" ? "active critical" : "critical"}
          data-analytics-event="communication_lane_selected"
          data-analytics-lane="critical"
          onClick={() => selectLane("critical")}
          type="button"
        >
          <span>Critical</span>
          <small>Action and safety</small>
          <strong>{unreadCriticalCount}</strong>
        </button>
        <button
          aria-controls="communication-updates"
          aria-pressed={lane === "updates"}
          className={lane === "updates" ? "active updates" : "updates"}
          data-analytics-event="communication_lane_selected"
          data-analytics-lane="updates"
          onClick={() => selectLane("updates")}
          type="button"
        >
          <span>Updates</span>
          <small>Published team news</small>
          <strong>{updateReceipts.length + announcements.length}</strong>
        </button>
        <button
          aria-controls="communication-conversation"
          aria-pressed={lane === "conversation"}
          className={lane === "conversation" ? "active conversation" : "conversation"}
          data-analytics-event="communication_lane_selected"
          data-analytics-lane="conversation"
          onClick={() => selectLane("conversation")}
          type="button"
        >
          <span>Conversation</span>
          <small>Family and coach replies</small>
          <strong>{unreadConversationCount}</strong>
        </button>
      </nav>

      <div className="communication-toolbar">
        <label>
          <span className="sr-only">Search family communication</span>
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search messages"
            type="search"
            value={query}
          />
        </label>
        <Link className="button secondary" href="/parent/settings">Language and alerts</Link>
      </div>

      {isOffline ? (
        <aside className="communication-offline-notice" role="status">
          You are offline. Information already on this page remains visible, but refresh, acknowledgment, and replies wait for a connection.
        </aside>
      ) : null}
      {!receiptLoadOk ? (
        <aside className="communication-inline-alert" role="status">{receiptMessage}</aside>
      ) : null}
      {pendingOfficialCount > 0 ? (
        <aside className="communication-pending-notice" role="status">
          {pendingOfficialCount} {pendingOfficialCount === 1 ? "message is" : "messages are"} awaiting team review. Draft wording is not shown to families.
        </aside>
      ) : null}
      <p className="sr-only" aria-live="polite">{statusMessage}</p>
      {statusMessage ? <p className="communication-action-status" role="status">{statusMessage}</p> : null}

      <section
        aria-labelledby="communication-critical-title"
        className={`communication-lane-panel critical ${lane === "critical" ? "is-active" : ""}`}
        id="communication-critical"
      >
        <div className="communication-lane-heading">
          <div>
            <span className="eyebrow">Needs clear receipt</span>
            <h2 id="communication-critical-title">Critical · Requires you</h2>
          </div>
          <p>Acknowledging confirms that you reviewed the message. It does not confirm attendance, agreement, transportation, or completion.</p>
        </div>

        <div className="communication-message-stack">
            {visibleCritical.map((receipt) => (
              <article
                className="communication-message-card critical"
                id={`communication-message-${encodeURIComponent(receipt.notificationId)}`}
                key={receipt.notificationId}
              >
                <header>
                  <div>
                    <span className="communication-authority-label">
                      {receipt.officialRevision?.action === "withdrawn" ? "Withdrawn official instruction" : "Critical team instruction"}
                    </span>
                    <h3>{receipt.title}</h3>
                  </div>
                  <span className="communication-team-label">
                    {teamChatData.teams.find((team) => team.id === receipt.teamId)?.name ?? "Linked team"}
                  </span>
                </header>
                <div className="communication-publisher">
                  <strong>
                    {receipt.officialRevision?.approvedByName
                      ? `Published by ${receipt.officialRevision.approvedByName}`
                      : receipt.approvedByName
                        ? `Approved by ${receipt.approvedByName}`
                        : "Approved team message"}
                  </strong>
                  <span>
                    {receipt.officialRevision
                      ? `Official message version ${receipt.officialRevision.versionNumber}`
                      : receipt.approvedByName ? "Team review recorded" : "Publisher name is unavailable"}
                    {" · "}
                    {formatDateTime(receipt.officialRevision?.publishedAt ?? receipt.evidence.approvedAt ?? receipt.createdAt)}
                  </span>
                </div>
                <p className="communication-message-body">{receipt.body}</p>
                <RevisionTruth receipt={receipt} />
                <EventContext eventId={receipt.eventId} teamChatData={teamChatData} />
                <div className="communication-language-label">Original team message · Change language in settings</div>
                <ReceiptStages receipt={receipt} />
                <footer>
                  <div>
                    <strong>Confirm receipt only</strong>
                    <span>This does not change RSVP, attendance, rides, or family permissions.</span>
                  </div>
                  <button
                    className="danger"
                    data-analytics-event="message_acknowledged"
                    disabled={isOffline || isPending || !receipt.evidence.attemptId || Boolean(receipt.evidence.acknowledgedAt)}
                    onClick={() => acknowledge(receipt)}
                    type="button"
                  >
                    {receipt.evidence.acknowledgedAt
                      ? "Receipt confirmed"
                      : pendingAckId === receipt.notificationId
                        ? "Confirming..."
                        : "I reviewed this"}
                  </button>
                </footer>
              </article>
            ))}
            {!visibleCritical.length ? (
              <div className="communication-empty-state">
                <span className="eyebrow">No unresolved critical messages</span>
                <h3>You are clear for this family view.</h3>
                <p>New cancellations, relocations, weather instructions, or emergency directions will appear here after staff publication.</p>
              </div>
            ) : null}
        </div>
      </section>

      <section
        aria-labelledby="communication-updates-title"
        className={`communication-lane-panel updates ${lane === "updates" ? "is-active" : ""}`}
        id="communication-updates"
      >
        <div className="communication-lane-heading">
          <div>
            <span className="eyebrow">Official team record</span>
            <h2 id="communication-updates-title">Recent from Updates</h2>
          </div>
          <p>Schedule changes and safety instructions only become official after a team publisher reviews and publishes them.</p>
        </div>
        <div className="communication-message-stack">
            {visibleUpdates.map((item) => {
              if (item.kind === "receipt") {
                const receipt = item.receipt;
                return (
                  <article className="communication-message-card update" key={receipt.notificationId}>
                    <header>
                      <div>
                        <span className="communication-authority-label">Published update</span>
                        <h3>{receipt.title}</h3>
                      </div>
                      <span className="communication-team-label">
                        {teamChatData.teams.find((team) => team.id === receipt.teamId)?.name ?? "Linked team"}
                      </span>
                    </header>
                    <div className="communication-publisher">
                      <strong>
                        {receipt.officialRevision?.approvedByName
                          ? `Published by ${receipt.officialRevision.approvedByName}`
                          : receipt.approvedByName
                            ? `Approved by ${receipt.approvedByName}`
                            : "Approved team message"}
                      </strong>
                      <span>
                        {receipt.officialRevision ? `Official message version ${receipt.officialRevision.versionNumber} · ` : ""}
                        {formatDateTime(receipt.officialRevision?.publishedAt ?? receipt.evidence.approvedAt ?? receipt.createdAt)}
                      </span>
                    </div>
                    <p className="communication-message-body">{receipt.body}</p>
                    <RevisionTruth receipt={receipt} />
                    <EventContext eventId={receipt.eventId} teamChatData={teamChatData} />
                    <div className="communication-language-label">Original team message · Change language in settings</div>
                    <ReceiptStages receipt={receipt} />
                  </article>
                );
              }
              const message = item.message;
              const author = teamChatData.users.find((user) => user.id === message.authorUserId);
              return (
                <article className="communication-message-card update" key={message.id}>
                  <header>
                    <div>
                      <span className="communication-authority-label">Coach update</span>
                      <h3>{message.topic ? message.topic.replaceAll("_", " ") : "Team update"}</h3>
                    </div>
                    <span className="communication-team-label">
                      {teamChatData.teams.find((team) => team.id === message.teamId)?.name ?? "Linked team"}
                    </span>
                  </header>
                  <div className="communication-publisher">
                    <strong>{author?.name ?? "Team staff"}</strong>
                    <span>{displayRole(message.authorRole)} · Published {formatDateTime(message.createdAt)}</span>
                  </div>
                  <p className="communication-message-body">{message.body}</p>
                  <EventContext eventId={message.eventId} teamChatData={teamChatData} />
                  <div className="communication-language-label">Original team message · Current version</div>
                </article>
              );
            })}
            {!visibleUpdates.length ? (
              <div className="communication-empty-state">
                <span className="eyebrow">No published updates</span>
                <h3>Nothing matches this family view.</h3>
                <p>Reviewed schedule notes, team reminders, and published changes will appear here with their team and author.</p>
              </div>
            ) : null}
        </div>
      </section>

      <section
        aria-labelledby="communication-conversation-title"
        className={`communication-lane-panel conversation ${lane === "conversation" ? "is-active" : ""}`}
        id="communication-conversation"
      >
        <div className="communication-lane-heading">
          <div>
            <span className="eyebrow">Private team thread</span>
            <h2 id="communication-conversation-title">Conversation preview</h2>
          </div>
          <p>Children do not have accounts or direct messages. Only assigned family members and team staff can participate.</p>
        </div>
        <div className="communication-conversation-layout">
            <div className="communication-thread">
              {visibleConversation.map((message) => {
                const author = teamChatData.users.find((user) => user.id === message.authorUserId);
                const team = teamChatData.teams.find((item) => item.id === message.teamId);
                const outbound = message.authorUserId === viewerUserId;
                return (
                  <article className={`communication-chat-row ${outbound ? "outbound" : "inbound"}`} key={message.id}>
                    <div className="communication-chat-meta">
                      <strong>{outbound ? "You" : author?.name ?? displayRole(message.authorRole)}</strong>
                      <span>{team?.name ?? "Linked team"} · {formatDateTime(message.createdAt)}</span>
                    </div>
                    <p>{message.body}</p>
                    <small>
                      {message.readByUserIds.length > 1
                        ? `Read by ${message.readByUserIds.length} team members`
                        : outbound ? "Saved to team conversation" : "Team conversation"}
                    </small>
                  </article>
                );
              })}
              {!visibleConversation.length ? (
                <div className="communication-empty-state">
                  <span className="eyebrow">No conversation yet</span>
                  <h3>Start with a practical team question.</h3>
                  <p>Replies remain separate from official schedules, attendance, transportation, permissions, and emergency instructions.</p>
                </div>
              ) : null}
            </div>

            <aside className="communication-context-rail">
              <span className="eyebrow">Next linked event</span>
              {teamChatData.events
                .filter((event) => selectedTeamId === "all" || event.teamId === selectedTeamId)
                .filter((event) => event.status === "scheduled")
                .sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt))
                .slice(0, 1)
                .map((event) => (
                  <div className="stack-sm" key={event.id}>
                    <h3>{event.title}</h3>
                    <p>{formatEventDate(event.startsAt)}</p>
                    <p>{event.locationName}</p>
                    <p className="muted">Arrival time is only shown when team staff publish it. Start time is not treated as arrival time.</p>
                    <Link className="button secondary" href="/parent/schedule">Open family schedule</Link>
                  </div>
                ))}
              {!teamChatData.events.some((event) => (
                (selectedTeamId === "all" || event.teamId === selectedTeamId) &&
                event.status === "scheduled"
              )) ? <p className="muted">No scheduled event is available for this team view.</p> : null}
            </aside>

            <form
              className="communication-composer"
              onSubmit={(event) => {
                event.preventDefault();
                sendReply();
              }}
            >
              <div>
                <label>
                  Team
                  <select
                    disabled={!teamChatData.teams.length}
                    onChange={(event) => setComposerTeamId(event.target.value)}
                    value={composerTeamId}
                  >
                    {teamChatData.teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
                  </select>
                </label>
                <label>
                  Reply
                  <textarea
                    disabled={!chatIsCurrent}
                    maxLength={2000}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder={chatIsCurrent ? "Ask a team question..." : "Conversation is read-only until current team records are available."}
                    rows={3}
                    value={draft}
                  />
                </label>
              </div>
              <div className="communication-composer-actions">
                <p>
                  Replies cannot change the official schedule, attendance, rides, family permissions, care details, or emergency instructions.
                </p>
                <button
                  data-analytics-event="conversation_reply_sent"
                  disabled={isOffline || isPending || !chatIsCurrent || !composerTeamId || !draft.trim()}
                  type="submit"
                >
                  {isPending ? "Sending..." : "Send reply"}
                </button>
              </div>
            </form>
        </div>
      </section>
    </div>
  );
}
