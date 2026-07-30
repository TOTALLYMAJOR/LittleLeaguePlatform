"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type {
  ParentTransportationData,
  TransportationDirection,
  TransportationRequestView
} from "@/lib/supabase/transportation";

async function authenticatedFetch(path: string, body: unknown) {
  const supabase = createSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    return new Response(JSON.stringify({ ok: false, message: "Sign in again before changing transportation." }), {
      status: 401,
      headers: { "content-type": "application/json" }
    });
  }
  return fetch(path, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

export function ParentTransportationClient({ data }: { data: ParentTransportationData }) {
  const router = useRouter();
  const [projectionId, setProjectionId] = useState(data.events[0]?.projectionId ?? "");
  const [direction, setDirection] = useState<TransportationDirection>("outbound");
  const [requestConfirmed, setRequestConfirmed] = useState(false);
  const [offerConfirmed, setOfferConfirmed] = useState<Record<string, boolean>>({});
  const [acceptConfirmed, setAcceptConfirmed] = useState<Record<string, boolean>>({});
  const [seats, setSeats] = useState<Record<string, number>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [messageOk, setMessageOk] = useState(false);
  const [isPending, startTransition] = useTransition();
  const selectedEvent = useMemo(
    () => data.events.find((event) => event.projectionId === projectionId),
    [data.events, projectionId]
  );
  const nextEvent = data.events[0];
  const nextEventRequests = nextEvent
    ? data.requests.filter((request) => request.eventId === nextEvent.eventId && request.playerId === nextEvent.playerId)
    : [];

  function run(path: string, body: unknown, fallback: string) {
    setMessage("");
    startTransition(async () => {
      const response = await authenticatedFetch(path, body);
      const result = await response.json().catch(() => null) as { ok?: boolean; message?: string } | null;
      setMessageOk(Boolean(result?.ok));
      setMessage(result?.message ?? fallback);
      if (result?.ok) router.refresh();
    });
  }

  function createRequest() {
    if (!selectedEvent) return;
    run("/api/parent/transportation/request", {
      eventId: selectedEvent.eventId,
      playerId: selectedEvent.playerId,
      direction,
      expectedScheduleVersion: selectedEvent.scheduleVersion
    }, "Transportation request could not be saved.");
  }

  return (
    <div className="page transportation-page" data-analytics-surface="family_transportation">
      <header className="transportation-hero">
        <div>
          <span className="eyebrow">Transportation responsibility</span>
          <h1>Who is getting this child there and home?</h1>
          <p>
            Outbound and return are separate. A request is not an assignment, and responsibility stays
            unassigned until the driver and requesting guardian both accept at the current event version.
          </p>
        </div>
        <span className="status-pill warning">Mutual acceptance required</span>
      </header>

      {!data.ok ? <p className="notice warning" role="status">{data.message}</p> : null}
      {message ? <p className={`notice ${messageOk ? "ok" : "warning"}`} aria-live="polite">{message}</p> : null}

      <ol className="transportation-step-rail" aria-label="Transportation coordination steps">
        <li>
          <span>1</span>
          <div><strong>Ask for help</strong><small>Choose there or home for one child and event.</small></div>
        </li>
        <li>
          <span>2</span>
          <div><strong>Someone offers</strong><small>Another active guardian accepts the driver side.</small></div>
        </li>
        <li>
          <span>3</span>
          <div><strong>You confirm</strong><small>Responsibility changes only after mutual acceptance.</small></div>
        </li>
      </ol>

      <section className="transportation-next" aria-labelledby="transportation-next-title">
        <div className="mission-section-heading">
          <div>
            <span className="eyebrow">Next Event Passport</span>
            <h2 id="transportation-next-title">{nextEvent ? `${nextEvent.childLabel} · ${nextEvent.title}` : "No upcoming event"}</h2>
          </div>
          {nextEvent ? <time dateTime={nextEvent.startsAt}>{formatEventDate(nextEvent.startsAt)}</time> : null}
        </div>
        <div className="responsibility-pair">
          {(["outbound", "return"] as const).map((itemDirection) => {
            const request = nextEventRequests.find((item) => item.direction === itemDirection);
            return (
              <article className={`responsibility-card state-${request?.state ?? "unassigned"}`} key={itemDirection}>
                <span>{itemDirection === "outbound" ? "Outbound · getting there" : "Return · getting home"}</span>
                <strong>{request?.stateLabel ?? "Not assigned"}</strong>
                <p>{request?.explanation ?? "No mutually accepted responsibility is current."}</p>
                {request?.driverLabel ? <small>Proposed/assigned adult: {request.driverLabel}</small> : null}
              </article>
            );
          })}
        </div>
        <p className="transportation-boundary">
          No home address is displayed or requested here. Recorded pickup restrictions stop assignment and
          route the family to league review without revealing private restriction details.
        </p>
      </section>

      <section className="transportation-workspace">
        <article className="card stack">
          <span className="eyebrow">Step 1 · Ask for help</span>
          <h2>Request one direction</h2>
          <label>
            Child and event
            <select
              disabled={!data.ok || !data.events.length}
              onChange={(event) => {
                setProjectionId(event.target.value);
                setRequestConfirmed(false);
              }}
              value={projectionId}
            >
              {!data.events.length ? <option value="">No upcoming linked events</option> : null}
              {data.events.map((event) => (
                <option key={event.projectionId} value={event.projectionId}>
                  {event.childLabel} · {event.teamName} · {event.title} · {formatEventDate(event.startsAt)}
                </option>
              ))}
            </select>
          </label>
          <fieldset>
            <legend>Direction</legend>
            <div className="segmented-control">
              <label>
                <input checked={direction === "outbound"} name="transportation-direction" onChange={() => setDirection("outbound")} type="radio" />
                Outbound · getting there
              </label>
              <label>
                <input checked={direction === "return"} name="transportation-direction" onChange={() => setDirection("return")} type="radio" />
                Return · getting home
              </label>
            </div>
          </fieldset>
          <label className="check-row">
            <input checked={requestConfirmed} onChange={(event) => setRequestConfirmed(event.target.checked)} type="checkbox" />
            I understand this creates a team-visible request only. It does not assign a driver or send an external message.
          </label>
          <button
            data-analytics-event="ride_requested"
            disabled={!data.ok || !selectedEvent || !requestConfirmed || isPending}
            onClick={createRequest}
            type="button"
          >
            Request {direction === "outbound" ? "outbound" : "return"} help
          </button>
        </article>

        <article className="card stack">
          <span className="eyebrow">Steps 2 and 3</span>
          <h2>Offer, then confirm</h2>
          <ol className="plain-list">
            <li>A linked guardian requests outbound or return help for one child and event version.</li>
            <li>Another active team guardian offers seats and accepts the driver side.</li>
            <li>The requesting guardian reviews the named adult, direction, seats, and event version.</li>
            <li>Only that second acceptance changes the Event Passport to assigned.</li>
          </ol>
          <p className="notice">
            A schedule change makes earlier acceptance need review. Withdrawal is attributed and returns
            responsibility to unassigned. No automation, coach note, or chat reply can assign a driver.
          </p>
        </article>
      </section>

      <section className="transportation-board" aria-labelledby="transportation-board-title">
        <div>
          <span className="eyebrow">Current team coordination</span>
          <h2 id="transportation-board-title">Status and history</h2>
        </div>
        {!data.requests.length ? (
          <article className="card empty-state">
            <h3>No transportation records yet</h3>
            <p>Outbound and return will stay “Not assigned” until a request and mutual acceptance exist.</p>
          </article>
        ) : data.requests.map((request) => (
          <TransportationRequestCard
            acceptConfirmed={Boolean(acceptConfirmed[request.id])}
            isPending={isPending}
            key={request.id}
            offerConfirmed={Boolean(offerConfirmed[request.id])}
            reason={reasons[request.assignmentId ?? request.id] ?? ""}
            request={request}
            seats={seats[request.id] ?? 1}
            setAcceptConfirmed={(value) => setAcceptConfirmed((current) => ({ ...current, [request.id]: value }))}
            setOfferConfirmed={(value) => setOfferConfirmed((current) => ({ ...current, [request.id]: value }))}
            setReason={(value) => setReasons((current) => ({ ...current, [request.assignmentId ?? request.id]: value }))}
            setSeats={(value) => setSeats((current) => ({ ...current, [request.id]: value }))}
            run={run}
          />
        ))}
      </section>
    </div>
  );
}

function TransportationRequestCard({
  request,
  seats,
  reason,
  offerConfirmed,
  acceptConfirmed,
  isPending,
  setSeats,
  setReason,
  setOfferConfirmed,
  setAcceptConfirmed,
  run
}: {
  request: TransportationRequestView;
  seats: number;
  reason: string;
  offerConfirmed: boolean;
  acceptConfirmed: boolean;
  isPending: boolean;
  setSeats: (value: number) => void;
  setReason: (value: string) => void;
  setOfferConfirmed: (value: boolean) => void;
  setAcceptConfirmed: (value: boolean) => void;
  run: (path: string, body: unknown, fallback: string) => void;
}) {
  const directionLabel = request.direction === "outbound" ? "Outbound · getting there" : "Return · getting home";
  const canWithdraw = request.canWithdrawRequest || request.canWithdrawAssignment;
  return (
    <article
      className="card transportation-request-card"
      id={`transportation-request-${encodeURIComponent(request.id)}`}
    >
      <header>
        <div>
          <span className="eyebrow">{request.teamName} · {directionLabel}</span>
          <h3>{request.childLabel} · {request.eventTitle}</h3>
          <time dateTime={request.startsAt}>{formatEventDate(request.startsAt)}</time>
        </div>
        <span className={`status-pill ${request.state === "assigned" ? "ok" : "warning"}`}>{request.stateLabel}</span>
      </header>
      <p>{request.explanation}</p>
      <dl className="transportation-facts">
        <div><dt>Requested by</dt><dd>{request.requestedByLabel}</dd></div>
        <div><dt>Driver</dt><dd>{request.driverLabel ?? "Not assigned"}</dd></div>
        <div><dt>Seats</dt><dd>{request.seats ?? "Not offered"}</dd></div>
        <div><dt>Event version</dt><dd>v{request.scheduleVersion}{request.currentScheduleVersion !== request.scheduleVersion ? ` · current v${request.currentScheduleVersion}` : ""}</dd></div>
      </dl>

      {request.canOffer ? (
        <div className="transportation-action-box">
          <label>
            Seats available
            <input max={8} min={1} onChange={(event) => setSeats(Number(event.target.value))} type="number" value={seats} />
          </label>
          <label className="check-row">
            <input checked={offerConfirmed} onChange={(event) => setOfferConfirmed(event.target.checked)} type="checkbox" />
            I accept the driver side for this direction and event version. The requesting guardian must still accept.
          </label>
          <button
            data-analytics-event="ride_offered"
            disabled={!offerConfirmed || isPending || seats < 1 || seats > 8}
            onClick={() => run(`/api/parent/transportation/${request.id}/offer`, { seats }, "Transportation offer could not be saved.")}
            type="button"
          >
            Offer seats
          </button>
        </div>
      ) : null}

      {request.canAccept && request.assignmentId ? (
        <div className="transportation-action-box">
          <label className="check-row">
            <input checked={acceptConfirmed} onChange={(event) => setAcceptConfirmed(event.target.checked)} type="checkbox" />
            I accept {request.driverLabel ?? "this team guardian"} for {directionLabel.toLowerCase()}, {request.seats ?? 1} seat(s), at event version {request.currentScheduleVersion}.
          </label>
          <button
            data-analytics-event="ride_assignment_accepted"
            disabled={!acceptConfirmed || isPending}
            onClick={() => run(
              `/api/parent/transportation/assignments/${request.assignmentId}/accept`,
              { expectedScheduleVersion: request.currentScheduleVersion },
              "Transportation acceptance could not be saved."
            )}
            type="button"
          >
            Accept and assign responsibility
          </button>
        </div>
      ) : null}

      {canWithdraw ? (
        <div className="transportation-withdrawal">
          <label>
            Reason for correction
            <textarea
              maxLength={500}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Explain the change without home address, custody, or medical details."
              rows={3}
              value={reason}
            />
          </label>
          <button
            className="button secondary"
            data-analytics-event="ride_assignment_withdrawn"
            disabled={reason.trim().length < 10 || isPending}
            onClick={() => run(
              request.canWithdrawAssignment && request.assignmentId
                ? `/api/parent/transportation/assignments/${request.assignmentId}/withdraw`
                : `/api/parent/transportation/${request.id}/withdraw`,
              { reason },
              "Transportation withdrawal could not be saved."
            )}
            type="button"
          >
            {request.canWithdrawAssignment ? "Withdraw current assignment" : "Withdraw request"}
          </button>
        </div>
      ) : null}
    </article>
  );
}

function formatEventDate(value: string) {
  return new Date(value).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}
