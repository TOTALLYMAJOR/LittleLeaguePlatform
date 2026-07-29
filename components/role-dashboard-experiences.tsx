"use client";

import { useState, type CSSProperties } from "react";

export interface CoachAnnouncementItem {
  id: string;
  title: string;
  body: string;
  teamName?: string;
}

export function CoachAnnouncementTicker({
  announcements,
  label = "Coach announcements"
}: {
  announcements: CoachAnnouncementItem[];
  label?: string;
}) {
  const [paused, setPaused] = useState(false);
  const items = announcements.length
    ? announcements
    : [{ id: "no-announcement", title: "No coach announcement", body: "Team updates will appear here after a coach posts one." }];
  const tickerStyle = {
    "--announcement-duration": `${Math.max(22, items.length * 14)}s`
  } as CSSProperties;

  return (
    <section className={`coach-announcement-ticker ${paused ? "is-paused" : ""}`} aria-label={label}>
      <strong className="coach-announcement-label">{label}</strong>
      <div className="coach-announcement-window">
        <div className="coach-announcement-track" style={tickerStyle} aria-hidden="true">
          {["primary", "duplicate"].map((group) => (
            <span className="coach-announcement-group" key={group}>
              {items.map((announcement) => (
                <span className="coach-announcement-item" key={`${group}-${announcement.id}`}>
                  <strong>{announcement.title}</strong>
                  <span>{announcement.body}</span>
                  {announcement.teamName ? <small>{announcement.teamName}</small> : null}
                </span>
              ))}
            </span>
          ))}
        </div>
        <span className="sr-only">
          {items.map((announcement) => `${announcement.title}: ${announcement.body}`).join(" ")}
        </span>
      </div>
      <button
        className="coach-announcement-toggle"
        type="button"
        aria-label={paused ? "Resume coach announcements" : "Pause coach announcements"}
        aria-pressed={paused}
        title={paused ? "Resume coach announcements" : "Pause coach announcements"}
        onClick={() => setPaused((current) => !current)}
      >
        <span aria-hidden="true">{paused ? "▶" : "Ⅱ"}</span>
      </button>
    </section>
  );
}

export interface ParentSeasonStoryEntry {
  id: string;
  dateLabel: string;
  title: string;
  detail: string;
  meta: string;
  tone: "coach" | "event" | "next";
}

export function ParentSeasonStory({
  seasonName,
  teamName,
  childLabel,
  entries,
  nextEventTitle,
  nextEventMeta,
  location,
  rsvpCopy,
  weatherCopy,
  familyHelpCopy,
  primaryHref,
  primaryLabel
}: {
  seasonName: string;
  teamName: string;
  childLabel: string;
  entries: ParentSeasonStoryEntry[];
  nextEventTitle: string;
  nextEventMeta: string;
  location: string;
  rsvpCopy: string;
  weatherCopy: string;
  familyHelpCopy: string;
  primaryHref: string;
  primaryLabel: string;
}) {
  const externalPrimaryAction = primaryHref.startsWith("http");

  return (
    <section className="parent-season-story" aria-labelledby="parent-season-story-title">
      <header className="parent-season-story-header">
        <div>
          <span>Season story</span>
          <h2 id="parent-season-story-title">{teamName}</h2>
          <p>{seasonName} for {childLabel}</p>
        </div>
        <div className="parent-story-child-mark" aria-label={`Private family view for ${childLabel}`}>
          <span aria-hidden="true">{childLabel.slice(0, 1).toUpperCase()}</span>
          <small>Family view</small>
        </div>
      </header>

      <div className="parent-season-story-layout">
        <ol className="parent-season-timeline" aria-label="Season timeline">
          {entries.map((entry) => (
            <li data-tone={entry.tone} key={entry.id}>
              <time>{entry.dateLabel}</time>
              <span className="parent-season-node" aria-hidden="true" />
              <div>
                <span>{entry.meta}</span>
                <h2>{entry.title}</h2>
                <p>{entry.detail}</p>
              </div>
            </li>
          ))}
          {!entries.length ? (
            <li data-tone="event">
              <time>Next</time>
              <span className="parent-season-node" aria-hidden="true" />
              <div>
                <span>Season timeline</span>
                <h2>No season moments yet</h2>
                <p>Coach updates and scheduled events will appear here.</p>
              </div>
            </li>
          ) : null}
        </ol>

        <aside className="parent-season-next" aria-label="Next event">
          <span>Next up</span>
          <p>{nextEventMeta}</p>
          <h2>{nextEventTitle}</h2>
          <dl>
            <div><dt>Field</dt><dd>{location}</dd></div>
            <div><dt>RSVP</dt><dd>{rsvpCopy}</dd></div>
            <div><dt>Weather</dt><dd>{weatherCopy}</dd></div>
            <div><dt>Family help</dt><dd>{familyHelpCopy}</dd></div>
          </dl>
          <a
            className="button parent-season-primary-action"
            href={primaryHref}
            target={externalPrimaryAction ? "_blank" : undefined}
            rel={externalPrimaryAction ? "noreferrer" : undefined}
          >
            {primaryLabel}
          </a>
          <a className="parent-season-plan-link" href="#parent-game-day-plan">Open full game-day plan</a>
          <p className="parent-season-privacy">Schedule and coach updates only. Team media is not shown in this story.</p>
        </aside>
      </div>
    </section>
  );
}

function clampProgress(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function RadarRing({ label, progress, className }: { label: string; progress: number; className: string }) {
  const style = { "--radar-progress": `${clampProgress(progress)}%` } as CSSProperties;
  return (
    <div className={`coach-radar-ring ${className}`} style={style} aria-label={`${label} readiness ${clampProgress(progress)} percent`}>
      <span>{label}</span>
    </div>
  );
}

export function CoachGameDayRadar({
  teamName,
  eventTitle,
  eventMeta,
  location,
  respondedRsvpCount,
  rosterCount,
  coachCount,
  missingRsvpCount,
  snackCount,
  volunteerCount,
  weatherReviewCount,
  reviewCount,
  weatherSummary,
  isPending,
  canDraftWeather,
  onNudgeRsvp,
  onDraftWeather,
  onSaveWeeklyUpdate
}: {
  teamName: string;
  eventTitle: string;
  eventMeta: string;
  location: string;
  respondedRsvpCount: number;
  rosterCount: number;
  coachCount: number;
  missingRsvpCount: number;
  snackCount: number;
  volunteerCount: number;
  weatherReviewCount: number;
  reviewCount: number;
  weatherSummary: string;
  isPending: boolean;
  canDraftWeather: boolean;
  onNudgeRsvp: () => void;
  onDraftWeather: () => void;
  onSaveWeeklyUpdate: () => void;
}) {
  const peopleProgress = rosterCount ? (respondedRsvpCount / rosterCount) * 100 : 0;
  const placeProgress = ((location !== "Location pending" ? 1 : 0) + (weatherReviewCount === 0 ? 1 : 0)) * 50;
  const planGapCount = snackCount + volunteerCount;
  const planProgress = planGapCount === 0 ? 100 : Math.max(20, 100 - planGapCount * 25);
  const groupedActionCount = Number(missingRsvpCount > 0) + Number(planGapCount > 0) + Number(weatherReviewCount > 0);

  return (
    <section className="coach-game-day-radar" aria-labelledby="coach-game-day-radar-title">
      <header className="coach-radar-header">
        <div>
          <span>Game-day radar</span>
          <h1 id="coach-game-day-radar-title">{teamName}</h1>
          <p>Your 15-minute sideline check for people, place, and plan.</p>
        </div>
        <strong>{reviewCount ? `${reviewCount} items need attention` : "Next event ready"}</strong>
      </header>

      <div className="coach-radar-layout">
        <div className="coach-radar-board">
          <div className="coach-radar-facts coach-radar-facts-left">
            <p><span>RSVP</span><strong>{respondedRsvpCount}/{rosterCount}</strong></p>
            <p><span>Weather</span><strong>{weatherSummary}</strong></p>
            <p><span>Field</span><strong>{location !== "Location pending" ? "Confirmed" : "Pending"}</strong></p>
          </div>

          <div className="coach-radar-stage">
            <RadarRing className="coach-radar-ring-people" label="People" progress={peopleProgress} />
            <RadarRing className="coach-radar-ring-place" label="Place" progress={placeProgress} />
            <RadarRing className="coach-radar-ring-plan" label="Plan" progress={planProgress} />
            <div className="coach-radar-event">
              <small>Next event</small>
              <h2>{eventTitle}</h2>
              <p>{eventMeta}</p>
              <strong>{groupedActionCount ? `Ready with ${groupedActionCount} action${groupedActionCount === 1 ? "" : "s"}` : "Ready"}</strong>
            </div>
          </div>

          <div className="coach-radar-facts coach-radar-facts-right">
            <p><span>Coaches</span><strong>{coachCount} assigned</strong></p>
            <p><span>Family help</span><strong>{planGapCount ? `${planGapCount} open` : "Covered"}</strong></p>
            <p><span>Weather drafts</span><strong>{weatherReviewCount ? `${weatherReviewCount} review` : "Clear"}</strong></p>
          </div>
        </div>

        <aside className="coach-radar-actions" aria-label="Action queue">
          <header>
            <div><span>Action queue</span><h2>{groupedActionCount} grouped action{groupedActionCount === 1 ? "" : "s"}</h2></div>
            <strong>{reviewCount}</strong>
          </header>

          <div className={missingRsvpCount ? "coach-radar-action needs-action" : "coach-radar-action is-clear"}>
            <span>People</span>
            <h3>{missingRsvpCount ? `${missingRsvpCount} RSVP response${missingRsvpCount === 1 ? "" : "s"} missing` : "RSVP responses covered"}</h3>
            <button className="secondary" disabled={isPending || missingRsvpCount === 0} onClick={onNudgeRsvp}>Draft RSVP nudge</button>
          </div>

          <div className={planGapCount ? "coach-radar-action needs-action" : "coach-radar-action is-clear"}>
            <span>Plan</span>
            <h3>{planGapCount ? `${snackCount} snack and ${volunteerCount} volunteer gap${planGapCount === 1 ? "" : "s"}` : "Family help covered"}</h3>
            <a className="button secondary" href="/coach/snacks-volunteers">Open family help</a>
          </div>

          <div className={weatherReviewCount ? "coach-radar-action needs-action" : "coach-radar-action"}>
            <span>Place</span>
            <h3>{weatherReviewCount ? `${weatherReviewCount} weather draft${weatherReviewCount === 1 ? "" : "s"} need review` : "No weather draft needs review"}</h3>
            {weatherReviewCount ? (
              <a className="button secondary" href="/coach/weather-fields">Review weather draft</a>
            ) : (
              <button className="secondary" disabled={isPending || !canDraftWeather} onClick={onDraftWeather}>Draft weather alert</button>
            )}
          </div>

          <button disabled={isPending} onClick={onSaveWeeklyUpdate}>Save weekly update</button>
          <p>These actions save drafts for review. They do not send external messages.</p>
        </aside>
      </div>
    </section>
  );
}

export interface SponsorProofLedgerRow {
  id: string;
  name: string;
  level: string;
  status: string;
  placementLabel: string;
  billingLabel: string;
  logoLabel: string;
  evidenceCount: number;
}

export function SponsorCommunityProofLedger({
  rows,
  selectedSponsorId,
  publicRecapCount,
  onSelectSponsor
}: {
  rows: SponsorProofLedgerRow[];
  selectedSponsorId: string;
  publicRecapCount: number;
  onSelectSponsor: (sponsorId: string) => void;
}) {
  const selected = rows.find((row) => row.id === selectedSponsorId) ?? rows[0];

  return (
    <section className="sponsor-community-proof" aria-labelledby="sponsor-community-proof-title">
      <header className="sponsor-proof-header">
        <div>
          <span>Community proof</span>
          <h1 id="sponsor-community-proof-title">Sponsor evidence ledger</h1>
          <p>Record, placement, public recap inventory, and billing evidence remain separate.</p>
        </div>
        <strong>Admin only</strong>
      </header>

      {selected ? (
        <div className="sponsor-proof-layout">
          <div className="sponsor-ledger-wrap">
            <table className="sponsor-proof-table">
              <thead>
                <tr>
                  <th>Sponsor</th>
                  <th>Record</th>
                  <th>Public placement</th>
                  <th>Billing evidence</th>
                  <th>Record signals</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr className={row.id === selected.id ? "is-selected" : ""} key={row.id}>
                    <td>
                      <button type="button" onClick={() => onSelectSponsor(row.id)}>
                        <strong>{row.name}</strong>
                        <small>{row.level}</small>
                      </button>
                    </td>
                    <td><span data-state={row.status}>{row.status}</span></td>
                    <td>{row.placementLabel}</td>
                    <td>{row.billingLabel}</td>
                    <td>{row.evidenceCount} recorded</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <aside className="sponsor-proof-receipt" aria-label={`Evidence receipt for ${selected.name}`}>
            <span>Community evidence receipt</span>
            <h2>{selected.name}</h2>
            <p>{selected.level}</p>
            <dl>
              <div><dt>Sponsor record</dt><dd>{selected.status}</dd></div>
              <div><dt>Public placement</dt><dd>{selected.placementLabel}</dd></div>
              <div><dt>Logo asset</dt><dd>{selected.logoLabel}</dd></div>
              <div><dt>Billing evidence</dt><dd>{selected.billingLabel}</dd></div>
              <div><dt>Approved public recap inventory</dt><dd>{publicRecapCount}</dd></div>
              <div><dt>Player data</dt><dd>Not included</dd></div>
            </dl>
            <p className="sponsor-proof-boundary">This receipt summarizes existing league records. It does not prove payment, contract execution, placement delivery, or sponsor-attributed impact.</p>
            <a className="button" href="#sponsor-record-editor">Open sponsor record</a>
          </aside>
        </div>
      ) : (
        <div className="sponsor-proof-empty">
          <h2>No sponsor records yet</h2>
          <p>Create a sponsor record below before placement or billing evidence can appear.</p>
          <a className="button" href="#sponsor-record-editor">Create sponsor record</a>
        </div>
      )}
    </section>
  );
}
