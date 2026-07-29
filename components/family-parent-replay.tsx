"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, useTransition } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { FamilyReplayData, FamilyReplayStory } from "@/lib/supabase/family-replays";

function formatDate(value: string) {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp)
    ? "Date unavailable"
    : new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric"
    }).format(timestamp);
}

function durationLabel(value: string) {
  if (value === "30_seconds") return "30 seconds";
  if (value === "2_minutes") return "2 minutes";
  return "5 minutes";
}

function focusLabel(value: string) {
  return value.replaceAll("_", " ");
}

async function authenticatedAction(replayId: string, operation: "activity_completed" | "saved") {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  try {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) headers.authorization = `Bearer ${data.session.access_token}`;
  } catch {
    // The private route fails closed without a verified session.
  }
  return fetch(`/api/parent/replays/${replayId}/engagement`, {
    method: "POST",
    headers,
    body: JSON.stringify({ operation })
  });
}

function ReplayMedia({ replay }: { replay: FamilyReplayStory }) {
  if (!replay.media.length) {
    return (
      <aside className="family-replay-media-empty">
        <span aria-hidden="true">♥</span>
        <div>
          <strong>No child photo needed</strong>
          <p>This memory is carried by the coach&apos;s words and an activity you can do together.</p>
        </div>
      </aside>
    );
  }
  return (
    <div className="family-replay-media-grid">
      {replay.media.map((media) => (
        <figure key={media.id}>
          {media.mediaType === "photo" ? (
            <Image
              src={media.url}
              alt={media.altText}
              width={960}
              height={640}
              sizes="(max-width: 720px) 100vw, 50vw"
              unoptimized
            />
          ) : (
            <a className="family-replay-media-link" href={media.url} target="_blank" rel="noreferrer">
              <span aria-hidden="true">▶</span>
              Open reviewed {media.mediaType === "youtube" ? "coach video" : "team video"}
            </a>
          )}
          <figcaption>
            <p>{media.altText}</p>
            {media.transcript ? (
              <details>
                <summary>Read transcript</summary>
                <p>{media.transcript}</p>
              </details>
            ) : null}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

export function FamilyParentReplay({ data }: { data: FamilyReplayData }) {
  const [replays, setReplays] = useState(data.replays);
  const [teamId, setTeamId] = useState("all");
  const [selectedReplayId, setSelectedReplayId] = useState(data.replays[0]?.id ?? "");
  const [statusMessage, setStatusMessage] = useState(data.message);
  const [pendingAction, setPendingAction] = useState("");
  const [isOffline, setIsOffline] = useState(false);
  const [isPending, startTransition] = useTransition();
  const teams = useMemo(() => (
    [...new Map(replays.map((replay) => [replay.teamId, replay.teamName])).entries()]
  ), [replays]);
  const visibleReplays = replays.filter((replay) => teamId === "all" || replay.teamId === teamId);
  const selectedReplay = visibleReplays.find((replay) => replay.id === selectedReplayId) ?? visibleReplays[0];

  useEffect(() => {
    const sync = () => setIsOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  function changeTeam(nextTeamId: string) {
    setTeamId(nextTeamId);
    const nextReplay = replays.find((replay) => nextTeamId === "all" || replay.teamId === nextTeamId);
    setSelectedReplayId(nextReplay?.id ?? "");
  }

  function record(operation: "activity_completed" | "saved") {
    if (!selectedReplay || isOffline) return;
    setPendingAction(operation);
    startTransition(async () => {
      const response = await authenticatedAction(selectedReplay.id, operation);
      const result = await response.json().catch(() => ({
        ok: false,
        message: "Parent Replay response was unavailable."
      })) as {
        ok?: boolean;
        message?: string;
        activity_completed_at?: string;
        saved_at?: string;
      };
      setStatusMessage(result.message ?? "Parent Replay action could not be saved.");
      if (result.ok) {
        setReplays((current) => current.map((replay) => replay.id === selectedReplay.id ? {
          ...replay,
          activityCompletedAt: result.activity_completed_at ?? replay.activityCompletedAt,
          savedAt: result.saved_at ?? replay.savedAt
        } : replay));
      }
      setPendingAction("");
    });
  }

  return (
    <div className="page family-replay-page">
      <section className="hero family-replay-hero">
        <span className="eyebrow">Parent Replay</span>
        <h1>Bring one good moment from practice home.</h1>
        <p className="lead">Coach-reviewed stories turn what the team learned into a short activity, an encouraging phrase, and a memory your family can return to.</p>
        <div className="family-replay-privacy-promise">
          <span aria-hidden="true">●</span>
          <p><strong>Private by default.</strong> Only published Replays for your linked children appear here. Child media stays hidden unless safety review, family release, and every identified child&apos;s current guardian consent are all present.</p>
        </div>
      </section>

      {isOffline ? (
        <aside className="notice warning" role="status">
          You are offline. Replays already on this page remain readable; Save and Mark as tried wait for a connection.
        </aside>
      ) : null}
      <p className={`notice ${data.ok ? "ok" : "warning"}`} role="status" aria-live="polite">{statusMessage}</p>

      {replays.length ? (
        <>
          <section className="family-replay-toolbar" aria-label="Choose a family Replay">
            <label>
              Family view
              <select value={teamId} onChange={(event) => changeTeam(event.target.value)}>
                <option value="all">All linked children and teams</option>
                {teams.map(([id, name]) => <option value={id} key={id}>{name}</option>)}
              </select>
            </label>
            <div className="family-replay-count">
              <strong>{visibleReplays.length}</strong>
              <span>published {visibleReplays.length === 1 ? "memory" : "memories"}</span>
            </div>
          </section>

          {selectedReplay ? (
            <article className="family-replay-story">
              <header>
                <div>
                  <span className="eyebrow">{selectedReplay.teamName} · {selectedReplay.childLabels.join(" · ")}</span>
                  <h2>{selectedReplay.title}</h2>
                  <p>{selectedReplay.summary}</p>
                </div>
                <div className="family-replay-publisher">
                  <span className="badge ok">Coach approved</span>
                  <strong>{selectedReplay.coachName}</strong>
                  <time dateTime={selectedReplay.publishedAt}>{formatDate(selectedReplay.publishedAt)}</time>
                </div>
              </header>

              <ReplayMedia replay={selectedReplay} />

              <section className="family-replay-activity" aria-labelledby="family-replay-activity-title">
                <div className="family-replay-section-heading">
                  <div>
                    <span className="eyebrow">Try it together</span>
                    <h3 id="family-replay-activity-title">{selectedReplay.homeActivities[0]?.title ?? "Your next family activity"}</h3>
                  </div>
                  <span className="family-replay-duration">{durationLabel(selectedReplay.homeActivities[0]?.duration ?? "2_minutes")}</span>
                </div>
                {selectedReplay.homeActivities[0] ? (
                  <>
                    {selectedReplay.homeActivities[0].parentGoal ? <p className="family-replay-goal">{selectedReplay.homeActivities[0].parentGoal}</p> : null}
                    <ol>
                      {selectedReplay.homeActivities[0].steps.map((step) => <li key={step}>{step}</li>)}
                    </ol>
                    {selectedReplay.homeActivities[0].coachCue ? (
                      <blockquote><strong>Coach cue:</strong> “{selectedReplay.homeActivities[0].coachCue}”</blockquote>
                    ) : null}
                  </>
                ) : <p>The coach did not attach a home activity to this Replay.</p>}
                <div className="toolbar">
                  <button
                    type="button"
                    data-analytics-event="parent_replay_activity_completed"
                    disabled={isOffline || isPending || Boolean(selectedReplay.activityCompletedAt)}
                    onClick={() => record("activity_completed")}
                  >
                    {selectedReplay.activityCompletedAt ? "Marked as tried" : pendingAction === "activity_completed" ? "Saving…" : "We tried it"}
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    data-analytics-event="parent_replay_saved"
                    disabled={isOffline || isPending || Boolean(selectedReplay.savedAt)}
                    onClick={() => record("saved")}
                  >
                    {selectedReplay.savedAt ? "Saved to family shelf" : pendingAction === "saved" ? "Saving…" : "Save for later"}
                  </button>
                </div>
                <p className="muted">Trying or saving is private to your family. It does not score, rank, or evaluate your child.</p>
              </section>

              <section className="grid three family-replay-takeaways">
                <div>
                  <span className="eyebrow">Say this</span>
                  <h3>Tonight&apos;s coach cue</h3>
                  <p>{selectedReplay.parentTip}</p>
                </div>
                <div>
                  <span className="eyebrow">What they learned</span>
                  <h3>{selectedReplay.focusAreas.map(focusLabel).join(" · ")}</h3>
                  <p>{selectedReplay.parentEducation}</p>
                </div>
                <div>
                  <span className="eyebrow">Team quest</span>
                  <h3>Before next practice</h3>
                  <p>{selectedReplay.teamQuest}</p>
                </div>
              </section>
            </article>
          ) : null}

          <section className="family-replay-timeline" aria-labelledby="family-replay-timeline-title">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Season memory timeline</span>
                <h2 id="family-replay-timeline-title">The moments worth keeping</h2>
              </div>
            </div>
            <ol>
              {visibleReplays.map((replay) => (
                <li className={replay.id === selectedReplay?.id ? "current" : ""} key={replay.id}>
                  <button type="button" onClick={() => setSelectedReplayId(replay.id)}>
                    <time dateTime={replay.publishedAt}>{formatDate(replay.publishedAt)}</time>
                    <strong>{replay.title}</strong>
                    <span>{replay.teamName} · {replay.childLabels.join(" · ")}</span>
                    <small>{replay.savedAt ? "Saved" : replay.activityCompletedAt ? "Tried together" : "Ready to revisit"}</small>
                  </button>
                </li>
              ))}
            </ol>
          </section>
        </>
      ) : (
        <section className="card empty-state family-replay-empty">
          <span aria-hidden="true">♥</span>
          <h2>Your first Replay will land here.</h2>
          <p>After practice, a coach can review and publish one short story and activity. Drafts, unreviewed media, and other families&apos; records never appear here.</p>
        </section>
      )}
    </div>
  );
}
