"use client";

import { useEffect, useState } from "react";
import { getOfflineStatusSummary, type OfflineStatusSummary } from "@/lib/offline/game-day-outbox";

const emptySummary: OfflineStatusSummary = {
  queued: 0,
  retrying: 0,
  conflict: 0,
  signInRequired: 0,
  reviewRequired: 0,
  synced: 0
};

export function OfflineSyncStatus({ actorId, contextKey }: { actorId?: string; contextKey?: string }) {
  const [summary, setSummary] = useState(emptySummary);

  useEffect(() => {
    if (!actorId) {
      setSummary(emptySummary);
      return;
    }
    let current = true;
    const refresh = () => {
      void getOfflineStatusSummary({ actorId, contextKey }).then((next) => {
        if (current) setSummary(next);
      }).catch(() => {
        if (current) setSummary(emptySummary);
      });
    };
    refresh();
    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);
    window.addEventListener("leaguepilot:offline-status", refresh);
    return () => {
      current = false;
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", refresh);
      window.removeEventListener("leaguepilot:offline-status", refresh);
    };
  }, [actorId, contextKey]);

  if (!actorId) return null;

  const total = summary.queued + summary.retrying + summary.conflict
    + summary.signInRequired + summary.reviewRequired + summary.synced;

  return (
    <section className="offline-sync-status" aria-label="Offline sync status" role="status" aria-live="polite">
      <strong>Offline sync</strong>
      {total === 0 ? <span>No saved actions or recent sync receipts.</span> : (
        <ul>
          <li>Queued: {summary.queued}</li>
          <li>Retrying: {summary.retrying}</li>
          <li>Conflict: {summary.conflict}</li>
          <li>Sign-in required: {summary.signInRequired}</li>
          <li>Review required: {summary.reviewRequired}</li>
          <li>Synced: {summary.synced}</li>
        </ul>
      )}
      <small>Counts only. Saved action contents and private player details are never shown here.</small>
    </section>
  );
}
