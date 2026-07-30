"use client";

import Link from "next/link";
import { ArrowRight, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import type { ParentEventChange } from "@/lib/supabase/event-change-log-reads";
import { StatusChip } from "./status-chip";

const STORAGE_UNAVAILABLE = "__leaguepilot_storage_unavailable__";

export function ChangeBand({
  changes,
  querySucceeded,
  storageKey,
  onVisibleChangeCount
}: {
  changes: ParentEventChange[];
  querySucceeded: boolean;
  storageKey: string;
  onVisibleChangeCount?: (count: number) => void;
}) {
  const watermark = useSyncExternalStore(
    () => () => undefined,
    () => readWatermark(storageKey),
    () => ""
  );
  const storageAvailable = watermark !== STORAGE_UNAVAILABLE;

  const visibleChanges = useMemo(() => {
    if (!watermark || watermark === STORAGE_UNAVAILABLE) return changes;
    const watermarkTime = Date.parse(watermark);
    if (Number.isNaN(watermarkTime)) return changes;
    return changes.filter((change) => Date.parse(change.changedAt) > watermarkTime);
  }, [changes, watermark]);

  useEffect(() => {
    onVisibleChangeCount?.(querySucceeded ? visibleChanges.length : changes.length);
    if (!querySucceeded || !visibleChanges.length) return;
    const latest = visibleChanges
      .map((change) => change.changedAt)
      .sort((left, right) => Date.parse(right) - Date.parse(left))[0];
    try {
      window.localStorage.setItem(storageKey, latest);
    } catch {
      // Device-local storage is presentation-only. Failure leaves state unchanged.
    }
  }, [changes.length, onVisibleChangeCount, querySucceeded, storageKey, visibleChanges]);

  if (!querySucceeded) {
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

  if (!visibleChanges.length) return null;

  return (
    <section className="family-change-band" aria-labelledby="parent-changes-title">
      <header>
        <RefreshCw aria-hidden="true" size={18} strokeWidth={2.2} />
        <div>
          <span className="parent-weekly-kicker">What changed</span>
          <h2 id="parent-changes-title">Changes since this page was last successfully loaded on this device.</h2>
        </div>
      </header>
      <ol>
        {visibleChanges.map((change) => (
          <li key={change.id}>
            <div className="family-change-band-title">
              <StatusChip tone="changed">{changeLabel(change.changeType)}</StatusChip>
              <strong>{change.eventTitle}</strong>
            </div>
            <p>{change.teamName}{change.childLabels.length ? ` · ${change.childLabels.join(", ")}` : ""} · by {change.actorLabel} · {formatTimestamp(change.changedAt)}</p>
            <dl>
              {change.diffs.map((diff) => (
                <div key={`${change.id}:${diff.field}:${diff.label}`}>
                  <dt>{diff.label}</dt>
                  <dd><span>{diff.previousValue}</span><strong aria-label={`changed to ${diff.currentValue}`}>{diff.currentValue}</strong></dd>
                </div>
              ))}
            </dl>
            <Link href={change.canonicalHref}>
              Open event
              <ArrowRight aria-hidden="true" size={15} />
            </Link>
          </li>
        ))}
      </ol>
      <p className="family-change-band-note">
        Viewing this list never creates acknowledgement, agreement, attendance, or RSVP state.
        {!storageAvailable ? " Device storage is unavailable, so changes may reappear here." : ""}
      </p>
    </section>
  );
}

function readWatermark(storageKey: string) {
  try {
    return window.localStorage.getItem(storageKey) ?? "";
  } catch {
    return STORAGE_UNAVAILABLE;
  }
}

function changeLabel(value: ParentEventChange["changeType"]) {
  if (value === "time_changed") return "Schedule changed";
  if (value === "location_changed") return "Location changed";
  if (value === "cancelled") return "Cancelled";
  if (value === "restored") return "Restored";
  if (value === "completed") return "Completed";
  return "New event";
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}
