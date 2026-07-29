"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAppState } from "@/app/providers";
import {
  NOW,
  buildNextLevelCommandCenter,
  type AppState,
  type DrillVideo,
  type NextLevelRole,
  type NextLevelStatus
} from "@/lib/domain";

interface NextLevelCommandCenterProps {
  role: NextLevelRole;
  state?: AppState;
  userId?: string;
  drillVideos?: DrillVideo[];
  compact?: boolean;
}

function statusClass(status: NextLevelStatus) {
  if (status === "ready") return "ok";
  if (status === "needs_action") return "warning";
  if (status === "review") return "info";
  return "neutral";
}

function statusLabel(status: NextLevelStatus) {
  return status.replace("_", " ");
}

export function NextLevelCommandCenter({ role, state, userId, drillVideos, compact = false }: NextLevelCommandCenterProps) {
  const appState = useAppState();
  const sourceState = state ?? appState.state;
  const center = useMemo(() => buildNextLevelCommandCenter(sourceState, {
    role,
    now: NOW,
    userId,
    drillVideos
  }), [drillVideos, role, sourceState, userId]);
  const openModules = center.modules.filter((module) => module.status !== "ready").length;
  const doneOnboarding = center.onboarding.filter((item) => item.done).length;

  return (
    <section className={`next-level-command next-level-command-${role}${compact ? " compact" : ""}`} aria-labelledby={`next-level-${role}-title`}>
      <div className="next-level-hero">
        <div className="next-level-copy">
          <span className="next-level-kicker">Next-level operating layer</span>
          <h2 id={`next-level-${role}-title`}>{center.title}</h2>
          <p>{center.summary}</p>
        </div>
        <div className="next-level-score" aria-label="Top 12 upgrade status">
          <strong>{center.modules.length - openModules}</strong>
          <span>of {center.modules.length} ready</span>
          <Link className="button secondary" href={center.primaryHref}>Open next action</Link>
        </div>
      </div>

      <div className="next-level-grid">
        <article className="next-level-panel today">
          <div className="card-header">
            <div>
              <span className="eyebrow">Today</span>
              <h3>Do this first</h3>
            </div>
            <span className="badge">{center.today.length} actions</span>
          </div>
          {center.today.map((action) => (
            <Link className="next-level-action" href={action.href} key={action.id}>
              <span className={`badge ${statusClass(action.status)}`}>{statusLabel(action.status)}</span>
              <strong>{action.label}</strong>
              <small>{action.detail}</small>
            </Link>
          ))}
        </article>

        <article className="next-level-panel onboarding">
          <div className="card-header">
            <div>
              <span className="eyebrow">Onboarding</span>
              <h3>Setup checklist</h3>
            </div>
            <span className="badge">{doneOnboarding}/{center.onboarding.length}</span>
          </div>
          {center.onboarding.map((item) => (
            <Link className="next-level-check" href={item.href} data-done={item.done ? "true" : "false"} key={item.id}>
              <span aria-hidden="true">{item.done ? "OK" : "GO"}</span>
              <strong>{item.label}</strong>
              <small>{item.detail}</small>
            </Link>
          ))}
        </article>

        <article className="next-level-panel provider">
          <div className="card-header">
            <div>
              <span className="eyebrow">Messaging</span>
              <h3>Notification readiness</h3>
            </div>
            <span className={`badge ${center.pwaInstall.status === "ready" ? "ok" : "warning"}`}>PWA {statusLabel(center.pwaInstall.status)}</span>
          </div>
          {center.notificationChannels.map((channel) => (
            <p key={channel.channel}>
              <span className={`badge ${channel.status}`}>{channel.channel}</span>{" "}
              <strong>{channel.label}</strong><br />
              <span className="muted">{channel.detail}</span>
            </p>
          ))}
          <p className="notice">{center.providerBoundary}</p>
        </article>
      </div>

      <div className="next-level-module-grid" aria-label="Top 12 improvement modules">
        {center.modules.map((module) => (
          <Link className={`next-level-module status-${module.status}`} href={module.route} key={module.id}>
            <span className="next-level-rank">{String(module.rank).padStart(2, "0")}</span>
            <span className={`badge ${statusClass(module.status)}`}>{statusLabel(module.status)}</span>
            <h3>{module.title}</h3>
            <strong>{module.metric}</strong>
            <p>{module.detail}</p>
            <small>{module.boundary}</small>
          </Link>
        ))}
      </div>

      {center.drillCollections.length || center.scheduleConflicts.total ? (
        <div className="next-level-detail-grid">
          {center.drillCollections.length ? (
            <article className="next-level-panel">
              <div className="card-header">
                <div>
                  <span className="eyebrow">Drill collections</span>
                  <h3>Coach library groups</h3>
                </div>
                <span className="badge">{center.drillCollections.length}</span>
              </div>
              {center.drillCollections.slice(0, 4).map((collection) => (
                <p key={collection.key}>
                  <strong>{collection.label}</strong><br />
                  <span className="muted">{collection.approvedCount} approved, {collection.beginnerCount} beginner-friendly, {collection.count} total.</span>
                </p>
              ))}
            </article>
          ) : null}

          {center.scheduleConflicts.total ? (
            <article className="next-level-panel">
              <div className="card-header">
                <div>
                  <span className="eyebrow">Schedule conflicts</span>
                  <h3>Needs human edit</h3>
                </div>
                <span className="badge warning">{center.scheduleConflicts.total}</span>
              </div>
              {center.scheduleConflicts.conflicts.slice(0, 4).map((conflict) => (
                <p key={conflict.id}>
                  <strong>{conflict.leftEvent.title}</strong> and <strong>{conflict.rightEvent.title}</strong><br />
                  <span className="muted">{conflict.reasons.join(", ")}</span>
                </p>
              ))}
            </article>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
