"use client";

import Link from "next/link";
import { ArrowRight, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ParentEventChange } from "@/lib/supabase/event-change-log-reads";
import { StatusChip } from "./status-chip";

type ReceiptOperation = "seen" | "acknowledged";

interface ReceiptResult {
  ok: boolean;
  message: string;
  seenAt: string | null;
  acknowledgedAt: string | null;
}

export function ChangeBand({
  changes,
  querySucceeded,
  timeZone,
  onVisibleChanges,
  onAcknowledge
}: {
  changes: ParentEventChange[];
  querySucceeded: boolean;
  timeZone: string;
  onVisibleChanges?: (changes: ParentEventChange[]) => void;
  onAcknowledge: (eventChangeLogId: string, operation: ReceiptOperation) => Promise<ReceiptResult>;
}) {
  const [networkState, setNetworkState] = useState<"checking" | "online" | "offline">("checking");
  const [pendingIds, setPendingIds] = useState(() => new Set<string>());
  const [failedIds, setFailedIds] = useState(() => new Set<string>());
  const [rowMessages, setRowMessages] = useState<Record<string, string>>({});
  const seenAttempts = useRef(new Set<string>());

  const unresolvedChanges = useMemo(() => changes.filter((change) => (
    change.requiresAcknowledgment ? !change.acknowledgedAt : !change.seenAt
  )), [changes]);

  useEffect(() => {
    onVisibleChanges?.(querySucceeded ? unresolvedChanges : changes);
  }, [changes, onVisibleChanges, querySucceeded, unresolvedChanges]);

  useEffect(() => {
    const sync = () => setNetworkState(navigator.onLine ? "online" : "offline");
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  useEffect(() => {
    if (!querySucceeded || networkState !== "online") return;
    for (const change of changes) {
      if (change.seenAt || seenAttempts.current.has(change.id)) continue;
      seenAttempts.current.add(change.id);
      void onAcknowledge(change.id, "seen").then((result) => {
        if (result.ok) return;
        setRowMessages((current) => ({
          ...current,
          [change.id]: "Receipt could not be confirmed. The change remains visible."
        }));
      });
    }
  }, [changes, networkState, onAcknowledge, querySucceeded]);

  if (!querySucceeded && !changes.length) {
    return (
      <section className="family-change-band family-change-band-warning" aria-labelledby="parent-changes-title">
        <header>
          <RefreshCw aria-hidden="true" size={18} strokeWidth={2.2} />
          <div>
            <span className="parent-weekly-kicker">What changed</span>
            <h2 id="parent-changes-title">Changes could not be checked</h2>
          </div>
        </header>
        <p>No review, acknowledgement, attendance, or RSVP state changed.</p>
      </section>
    );
  }

  if (!changes.length) return null;

  async function acknowledge(change: ParentEventChange) {
    if (networkState !== "online" || pendingIds.has(change.id)) return;
    setPendingIds((current) => new Set([...current, change.id]));
    setFailedIds((current) => without(current, change.id));
    setRowMessages((current) => ({ ...current, [change.id]: "" }));
    const result = await onAcknowledge(change.id, "acknowledged");
    setPendingIds((current) => without(current, change.id));
    setRowMessages((current) => ({ ...current, [change.id]: result.message }));
    if (!result.ok) setFailedIds((current) => new Set([...current, change.id]));
  }

  return (
    <section className={`family-change-band${querySucceeded ? "" : " family-change-band-warning"}`} aria-labelledby="parent-changes-title">
      <header>
        <RefreshCw aria-hidden="true" size={18} strokeWidth={2.2} />
        <div>
          <span className="parent-weekly-kicker">What changed</span>
          <h2 id="parent-changes-title">
            {querySucceeded ? "Recent event changes for your family" : "Receipt state could not be confirmed"}
          </h2>
        </div>
      </header>
      {!querySucceeded ? (
        <p>No review, acknowledgment, attendance, or RSVP state changed. Changes remain visible as unconfirmed.</p>
      ) : null}
      <ol>
        {changes.map((change) => (
          <li key={change.id}>
            <div className="family-change-band-title">
              <StatusChip tone="changed">{changeLabel(change.changeType)}</StatusChip>
              {receiptChip(change, querySucceeded)}
              <strong>{change.eventTitle}</strong>
            </div>
            <p>{change.teamName}{change.childLabels.length ? ` · ${change.childLabels.join(", ")}` : ""} · by {change.actorLabel} · {formatTimestamp(change.changedAt, timeZone)}</p>
            <dl>
              {change.diffs.map((diff) => (
                <div key={`${change.id}:${diff.field}:${diff.label}`}>
                  <dt>{diff.label}</dt>
                  <dd><span>{diff.previousValue}</span><strong aria-label={`changed to ${diff.currentValue}`}>{diff.currentValue}</strong></dd>
                </div>
              ))}
            </dl>
            <div className="family-change-band-actions">
              <Link href={change.canonicalHref}>
                Open event
                <ArrowRight aria-hidden="true" size={15} />
              </Link>
              {change.requiresAcknowledgment && !change.acknowledgedAt && querySucceeded ? (
                <button
                  type="button"
                  disabled={networkState !== "online" || pendingIds.has(change.id)}
                  onClick={() => acknowledge(change)}
                >
                  {pendingIds.has(change.id)
                    ? "Saving acknowledgment"
                    : networkState === "offline"
                      ? "Connect to acknowledge"
                      : networkState === "checking"
                        ? "Checking connection"
                        : failedIds.has(change.id)
                          ? "Retry acknowledgment"
                          : "Acknowledge change"}
                </button>
              ) : null}
            </div>
            {change.requiresAcknowledgment && !change.acknowledgedAt && networkState === "offline" && querySucceeded ? (
              <p className="family-change-band-row-note">Reconnect before acknowledging. Nothing is saved optimistically.</p>
            ) : null}
            {rowMessages[change.id] ? (
              <p className="family-change-band-row-note" role="status" aria-live="polite">
                {rowMessages[change.id]}
              </p>
            ) : null}
          </li>
        ))}
      </ol>
      <p className="family-change-band-note">
        Viewing records awareness only. Acknowledgment requires the button and never changes attendance or RSVP.
      </p>
    </section>
  );
}

function receiptChip(change: ParentEventChange, querySucceeded: boolean) {
  if (!querySucceeded) return <StatusChip tone="waiting">Receipt unconfirmed</StatusChip>;
  if (change.acknowledgedAt) return <StatusChip tone="confirmed">Acknowledged</StatusChip>;
  if (change.requiresAcknowledgment) return <StatusChip tone="action">Acknowledgment needed</StatusChip>;
  if (change.seenAt) return <StatusChip tone="confirmed">Seen</StatusChip>;
  return <StatusChip tone="waiting">Recording view</StatusChip>;
}

function without(values: Set<string>, value: string) {
  const next = new Set(values);
  next.delete(value);
  return next;
}

function changeLabel(value: ParentEventChange["changeType"]) {
  if (value === "time_changed") return "Schedule changed";
  if (value === "location_changed") return "Location changed";
  if (value === "cancelled") return "Cancelled";
  if (value === "restored") return "Restored";
  if (value === "completed") return "Completed";
  return "New event";
}

function formatTimestamp(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone
  }).format(new Date(value));
}
