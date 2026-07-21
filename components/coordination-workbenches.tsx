"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useAppState } from "@/app/providers";
import { ParentReplayClient } from "@/components/feature-panels";
import type { AppState, LeagueEvent, RosterImportAnalysis } from "@/lib/domain";
import { analyzeRosterCsv, sampleRosterCsv } from "@/lib/domain";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { FamilyEventHandoff } from "@/lib/supabase/family-flight-plan";
import type { CoachInjuryContact } from "@/lib/supabase/coach-injury-contacts";
import type { GameDayDecision, GameDayResolutionReview } from "@/lib/supabase/game-day-resolution";
import type { NotificationReceipt } from "@/lib/supabase/notification-receipts";
import type {
  PracticeRunObservations,
  PracticeRunPlan,
  PracticeRunReceipt
} from "@/lib/supabase/practice-runs";
import type { SeasonLaunchData, SeasonLaunchImport } from "@/lib/supabase/season-launch";
import type { ParentCoachDashboardData } from "@/lib/supabase/dashboard-data";
import type { DrillVideoLibraryData } from "@/lib/supabase/drill-videos";
import { familyEventGear, findFamilyFlightConflicts } from "@/lib/services/family-flight-plan";
import {
  formatWaterBreakCountdown,
  remainingWaterBreakSeconds,
  waterBreakMinutePresets
} from "@/lib/services/practice-safety";

async function authenticatedJsonFetch(url: string, payload: unknown, extraHeaders?: Record<string, string>) {
  const headers: Record<string, string> = { "Content-Type": "application/json", ...extraHeaders };
  try {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) headers.authorization = `Bearer ${data.session.access_token}`;
  } catch {
    // Private routes return an explicit 401 when no verified session is present.
  }
  return fetch(url, { method: "POST", headers, body: JSON.stringify(payload) });
}

function actionReceipt(prefix: string) {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `${prefix}-${crypto.randomUUID()}`
    : `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function shortDate(value?: string) {
  if (!value) return "Not recorded";
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp)
    ? value
    : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(timestamp);
}

function responseBadge(value: string) {
  if (["delivered", "read", "acknowledged", "approved", "completed", "confirmed"].includes(value)) return "ok";
  if (["failed", "rejected", "cancelled", "blocked"].includes(value)) return "danger";
  return "warning";
}

export function NotificationEvidenceRail({ receipt }: { receipt: NotificationReceipt }) {
  const milestones = [
    { label: "Draft", at: receipt.createdAt, detail: receipt.notificationStatus },
    { label: "Approved", at: receipt.evidence.approvedAt, detail: receipt.providerApprovalStatus },
    { label: "Provider accepted", at: receipt.evidence.providerAcceptedAt, detail: receipt.evidence.attemptStatus },
    { label: "Delivered", at: receipt.evidence.deliveredAt, detail: receipt.evidence.deliveredAt ? "webhook evidence" : "not proved" },
    { label: "Read", at: receipt.evidence.readAt ?? receipt.notificationReadAt, detail: receipt.evidence.readAt || receipt.notificationReadAt ? "read receipt" : "not proved" },
    { label: "Acknowledged", at: receipt.evidence.acknowledgedAt, detail: receipt.evidence.acknowledgedAt ? "recipient action" : "not proved" }
  ];
  return (
    <ol className="evidence-rail" aria-label={`Delivery evidence for ${receipt.title}`}>
      {milestones.map((milestone) => (
        <li className={milestone.at ? "proved" : "unproved"} key={milestone.label}>
          <span aria-hidden="true" />
          <strong>{milestone.label}</strong>
          <small>{milestone.at ? shortDate(milestone.at) : milestone.detail}</small>
        </li>
      ))}
    </ol>
  );
}

export function AdminDeliveryReviewClient({ initialReceipts, message }: {
  initialReceipts: NotificationReceipt[];
  message: string;
}) {
  const [receipts, setReceipts] = useState(initialReceipts);
  const [filter, setFilter] = useState<"all" | "pending" | "failed" | "proved">("all");
  const [statusMessage, setStatusMessage] = useState(message);
  const [pendingId, setPendingId] = useState("");
  const [isPending, startTransition] = useTransition();
  const visible = receipts.filter((receipt) => {
    if (filter === "pending") return receipt.providerApprovalStatus === "pending";
    if (filter === "failed") return receipt.evidence.attemptStatus === "failed" || receipt.notificationStatus === "failed";
    if (filter === "proved") return Boolean(receipt.evidence.deliveredAt || receipt.evidence.acknowledgedAt);
    return true;
  });
  const evidenceCount = receipts.filter((receipt) => receipt.evidence.deliveredAt).length;
  const acknowledgmentCount = receipts.filter((receipt) => receipt.evidence.acknowledgedAt).length;

  function review(receipt: NotificationReceipt, decision: "approved" | "rejected") {
    setPendingId(receipt.notificationId);
    setStatusMessage("");
    startTransition(async () => {
      const provider = receipt.channel === "push" ? "web_push" : receipt.channel;
      const response = await authenticatedJsonFetch("/api/provider-delivery/review", {
        notificationId: receipt.notificationId,
        provider,
        decision
      });
      const result = await response.json().catch(() => null) as {
        ok?: boolean;
        message?: string;
        notification?: { provider_approval_status?: NotificationReceipt["providerApprovalStatus"]; approved_at?: string };
        attempt?: { id?: string; provider?: "email" | "sms" | "web_push"; status?: NotificationReceipt["evidence"]["attemptStatus"]; attempted_at?: string };
      } | null;
      if (result?.ok) {
        setReceipts((current) => current.map((item) => item.notificationId === receipt.notificationId ? {
          ...item,
          providerApprovalStatus: result.notification?.provider_approval_status ?? decision,
          evidence: {
            ...item.evidence,
            attemptId: result.attempt?.id,
            provider: result.attempt?.provider,
            attemptStatus: result.attempt?.status ?? (decision === "rejected" ? "suppressed" : "queued"),
            approvedAt: decision === "approved" ? result.notification?.approved_at ?? new Date().toISOString() : undefined
          }
        } : item));
      }
      setStatusMessage(result?.message ?? "Delivery review could not be saved.");
      setPendingId("");
    });
  }

  return (
    <div className="page coordination-workbench">
      <section className="hero">
        <span className="eyebrow">Provable communications</span>
        <h1>Know what was drafted, approved, accepted, delivered, read, and acknowledged.</h1>
        <p className="lead">Every stage stays separate. A queued attempt is not called sent, provider acceptance is not called delivery, and a delivery webhook is not called a parent acknowledgment.</p>
      </section>
      <p className="notice">{statusMessage}</p>
      <section className="grid three">
        <article className="card metric"><span className="muted">Draft records</span><strong>{receipts.length}</strong></article>
        <article className="card metric"><span className="muted">Delivery proved</span><strong>{evidenceCount}</strong></article>
        <article className="card metric"><span className="muted">Acknowledged</span><strong>{acknowledgmentCount}</strong></article>
      </section>
      <div className="pill-row" aria-label="Delivery evidence filters">
        {(["all", "pending", "failed", "proved"] as const).map((item) => (
          <button className={filter === item ? "" : "secondary"} key={item} onClick={() => setFilter(item)}>{item}</button>
        ))}
      </div>
      <section className="stack">
        {visible.map((receipt) => (
          <article className="card stack" key={receipt.notificationId}>
            <div className="card-header">
              <div>
                <span className="eyebrow">{receipt.channel} · {receipt.notificationType.replaceAll("_", " ")}</span>
                <h2>{receipt.title}</h2>
              </div>
              <span className={`badge ${responseBadge(receipt.evidence.attemptStatus)}`}>{receipt.evidence.attemptStatus.replaceAll("_", " ")}</span>
            </div>
            <p>{receipt.body}</p>
            <NotificationEvidenceRail receipt={receipt} />
            {receipt.evidence.errorMessage ? <p className="notice warning">{receipt.evidence.errorMessage}</p> : null}
            <div className="button-row">
              <button
                disabled={isPending || pendingId === receipt.notificationId || receipt.providerApprovalStatus !== "pending"}
                onClick={() => review(receipt, "approved")}
              >
                Approve provider attempt
              </button>
              <button
                className="secondary"
                disabled={isPending || pendingId === receipt.notificationId || receipt.providerApprovalStatus !== "pending"}
                onClick={() => review(receipt, "rejected")}
              >
                Reject
              </button>
            </div>
          </article>
        ))}
        {!visible.length ? <article className="card"><p className="muted">No notification records match this evidence filter.</p></article> : null}
      </section>
    </div>
  );
}

export function ParentNotificationReceiptsClient({ initialReceipts, message }: {
  initialReceipts: NotificationReceipt[];
  message: string;
}) {
  const [receipts, setReceipts] = useState(initialReceipts);
  const [statusMessage, setStatusMessage] = useState(message);
  const [isPending, startTransition] = useTransition();

  function acknowledge(receipt: NotificationReceipt) {
    startTransition(async () => {
      const response = await authenticatedJsonFetch("/api/notifications/acknowledge", {
        notificationId: receipt.notificationId
      });
      const result = await response.json().catch(() => null) as { ok?: boolean; message?: string; acknowledgedAt?: string } | null;
      if (result?.ok) {
        setReceipts((current) => current.map((item) => item.notificationId === receipt.notificationId ? {
          ...item,
          notificationStatus: "read",
          evidence: { ...item.evidence, acknowledgedAt: result.acknowledgedAt ?? new Date().toISOString() }
        } : item));
      }
      setStatusMessage(result?.message ?? "Notification acknowledgment could not be saved.");
    });
  }

  return (
    <div className="page coordination-workbench parent-receipts">
      <section className="hero compact-hero">
        <span className="eyebrow">Message receipts</span>
        <h1>Your team updates, with honest delivery evidence.</h1>
        <p className="lead">Acknowledge only after you have reviewed an update. This records your action; it does not rewrite provider delivery history.</p>
      </section>
      <p className="notice">{statusMessage}</p>
      <section className="grid two">
        {receipts.slice(0, 6).map((receipt) => (
          <article className="card stack" key={receipt.notificationId}>
            <div className="card-header">
              <div><span className="eyebrow">{receipt.channel}</span><h2>{receipt.title}</h2></div>
              <span className={`badge ${responseBadge(receipt.evidence.acknowledgedAt ? "acknowledged" : receipt.evidence.attemptStatus)}`}>
                {receipt.evidence.acknowledgedAt ? "acknowledged" : receipt.evidence.attemptStatus.replaceAll("_", " ")}
              </span>
            </div>
            <p>{receipt.body}</p>
            <NotificationEvidenceRail receipt={receipt} />
            <button
              disabled={isPending || !receipt.evidence.attemptId || Boolean(receipt.evidence.acknowledgedAt)}
              onClick={() => acknowledge(receipt)}
            >
              {receipt.evidence.acknowledgedAt ? "Acknowledged" : "I reviewed this update"}
            </button>
          </article>
        ))}
        {!receipts.length ? <article className="card"><p className="muted">No provider-reviewed team updates are available yet.</p></article> : null}
      </section>
    </div>
  );
}

function importStatus(importRecord: SeasonLaunchImport) {
  if (importRecord.rolledBackAt) return "rolled back";
  return importRecord.status;
}

export function SeasonLaunchWizardClient({ data }: { data: SeasonLaunchData }) {
  const { state } = useAppState();
  const [tenantIndex, setTenantIndex] = useState(0);
  const tenant = data.tenants[tenantIndex] ?? data.tenants[0];
  const [csv, setCsv] = useState(sampleRosterCsv);
  const [stagedImportId, setStagedImportId] = useState("");
  const [confirmWarnings, setConfirmWarnings] = useState(false);
  const [rollbackReason, setRollbackReason] = useState("Imported roster was approved against the wrong source file.");
  const [statusMessage, setStatusMessage] = useState(data.message);
  const [imports, setImports] = useState(tenant?.imports ?? []);
  const [isPending, startTransition] = useTransition();
  const analysisState = useMemo(() => tenant ? {
    ...state,
    organization: { ...state.organization, id: tenant.organizationId, name: tenant.organizationName },
    activeSeason: { ...state.activeSeason, id: tenant.seasonId, organizationId: tenant.organizationId, name: tenant.seasonName },
    teams: tenant.teams
  } : state, [state, tenant]);
  const analysis = useMemo(() => analyzeRosterCsv(csv, analysisState, new Date().toISOString()), [analysisState, csv]);
  const readiness = tenant ? [
    { label: "Teams created", ready: tenant.teams.length > 0, href: "/admin/teams" },
    { label: "Coaches assigned", ready: tenant.teams.length > 0 && tenant.assignedCoachCount === tenant.teams.length, href: "/admin/memberships" },
    { label: "Roster validated", ready: Boolean(stagedImportId) || imports.some((item) => item.status === "validated" || item.status === "committed"), href: "#season-launch-roster" },
    { label: "Schedule ready", ready: tenant.scheduledEventCount > 0, href: "/admin/schedule-venues" },
    { label: "Provider gate enabled", ready: tenant.providerSendsEnabled, href: "/admin/message-delivery-review" }
  ] : [];

  function selectTenant(index: number) {
    setTenantIndex(index);
    setImports(data.tenants[index]?.imports ?? []);
    setStagedImportId("");
    setConfirmWarnings(false);
  }

  function stageImport() {
    if (!tenant) return;
    setStatusMessage("");
    startTransition(async () => {
      const response = await authenticatedJsonFetch("/api/admin/roster-imports/audit", {
        organizationId: tenant.organizationId,
        seasonId: tenant.seasonId,
        filename: "season-launch-roster.csv",
        analysis
      });
      const result = await response.json().catch(() => null) as {
        ok?: boolean;
        message?: string;
        rosterImportId?: string;
        rosterImport?: { id?: string; created_at?: string };
      } | null;
      const nextId = result?.rosterImportId ?? result?.rosterImport?.id ?? "";
      if (result?.ok && nextId) {
        setStagedImportId(nextId);
        setImports((current) => [{
          id: nextId,
          organizationId: tenant.organizationId,
          seasonId: tenant.seasonId,
          filename: "season-launch-roster.csv",
          status: "validated",
          totalRows: analysis.totalRows,
          warningRows: analysis.warningRows,
          errorRows: analysis.errorRows,
          manifest: {},
          createdAt: result.rosterImport?.created_at ?? new Date().toISOString()
        }, ...current]);
      }
      setStatusMessage(result?.message ?? "Roster validation could not be staged.");
    });
  }

  function approveImport() {
    const rosterImportId = stagedImportId || imports.find((item) => item.status === "validated")?.id;
    if (!rosterImportId) return;
    startTransition(async () => {
      const response = await authenticatedJsonFetch("/api/admin/season-launch/commit", {
        rosterImportId,
        confirmWarnings
      });
      const result = await response.json().catch(() => null) as { ok?: boolean; message?: string; manifest?: Record<string, unknown> } | null;
      if (result?.ok) {
        setImports((current) => current.map((item) => item.id === rosterImportId ? {
          ...item,
          status: "committed",
          committedAt: new Date().toISOString(),
          manifest: result.manifest ?? {}
        } : item));
      }
      setStatusMessage(result?.message ?? "Roster approval could not be completed.");
    });
  }

  function rollbackImport(importRecord: SeasonLaunchImport) {
    startTransition(async () => {
      const response = await authenticatedJsonFetch("/api/admin/season-launch/rollback", {
        rosterImportId: importRecord.id,
        reason: rollbackReason
      });
      const result = await response.json().catch(() => null) as { ok?: boolean; message?: string } | null;
      if (result?.ok) {
        setImports((current) => current.map((item) => item.id === importRecord.id ? {
          ...item,
          rolledBackAt: new Date().toISOString()
        } : item));
      }
      setStatusMessage(result?.message ?? "Roster rollback could not be completed.");
    });
  }

  return (
    <div className="page coordination-workbench">
      <section className="hero">
        <span className="eyebrow">Season Launch Wizard</span>
        <h1>Go from league setup to family-ready without silent side effects.</h1>
        <p className="lead">Validate the source file, review warnings, approve a traced roster commit, then complete coaches, schedules, and communications as separate launch gates.</p>
      </section>
      <p className="notice">{statusMessage}</p>
      {data.tenants.length > 1 ? (
        <label>Organization and season
          <select value={tenantIndex} onChange={(event) => selectTenant(Number(event.target.value))}>
            {data.tenants.map((item, index) => <option key={`${item.organizationId}-${item.seasonId}`} value={index}>{item.organizationName} · {item.seasonName}</option>)}
          </select>
        </label>
      ) : null}
      {tenant ? (
        <>
          <section className="grid three">
            <article className="card metric"><span className="muted">Active teams</span><strong>{tenant.teams.length}</strong></article>
            <article className="card metric"><span className="muted">Coaches assigned</span><strong>{tenant.assignedCoachCount}/{tenant.teams.length}</strong></article>
            <article className="card metric"><span className="muted">Launch gates ready</span><strong>{readiness.filter((item) => item.ready).length}/{readiness.length}</strong></article>
          </section>
          <section className="launch-gates" aria-label="Season launch gates">
            {readiness.map((item, index) => (
              <a className={`card launch-gate ${item.ready ? "ready" : ""}`} href={item.href} key={item.label}>
                <span>{index + 1}</span><strong>{item.label}</strong><small>{item.ready ? "Ready" : "Needs review"}</small>
              </a>
            ))}
          </section>
          <section className="grid two" id="season-launch-roster">
            <article className="card stack">
              <div className="card-header"><div><span className="eyebrow">Gate 3</span><h2>Roster source and dry run</h2></div><span className="badge warning">Admin review</span></div>
              <textarea aria-label="Season launch roster CSV" value={csv} onChange={(event) => setCsv(event.target.value)} />
              <div className="grid three">
                <p><strong>{analysis.validRows}</strong><br /><span className="muted">valid</span></p>
                <p><strong>{analysis.warningRows}</strong><br /><span className="muted">warning</span></p>
                <p><strong>{analysis.errorRows}</strong><br /><span className="muted">error</span></p>
              </div>
              <button disabled={isPending || analysis.totalRows === 0} onClick={stageImport}>Validate and stage evidence</button>
              <label className="clubhouse-checkbox">
                <input type="checkbox" checked={confirmWarnings} onChange={(event) => setConfirmWarnings(event.target.checked)} />
                I reviewed every warning row
              </label>
              <button
                disabled={isPending || analysis.errorRows > 0 || (!stagedImportId && !imports.some((item) => item.status === "validated")) || (analysis.warningRows > 0 && !confirmWarnings)}
                onClick={approveImport}
              >
                Approve traced roster commit
              </button>
              <p className="muted">Approval creates players and guardian/invite records with import provenance. It executes zero email, SMS, or push sends.</p>
            </article>
            <article className="card stack">
              <div className="card-header"><div><span className="eyebrow">Import receipts</span><h2>Commit and rollback evidence</h2></div><span className="badge">{imports.length}</span></div>
              <label>Rollback reason<input value={rollbackReason} onChange={(event) => setRollbackReason(event.target.value)} /></label>
              {imports.slice(0, 8).map((item) => (
                <div className="notice" key={item.id}>
                  <div className="card-header">
                    <div><strong>{item.filename}</strong><p className="muted">{shortDate(item.createdAt)} · {item.totalRows} row(s)</p></div>
                    <span className={`badge ${responseBadge(importStatus(item))}`}>{importStatus(item)}</span>
                  </div>
                  {Object.keys(item.manifest).length ? <p className="muted">{Object.entries(item.manifest).map(([key, value]) => `${key}: ${String(value)}`).join(" · ")}</p> : null}
                  {item.status === "committed" && !item.rolledBackAt ? (
                    <button className="secondary" disabled={isPending || rollbackReason.trim().length < 10} onClick={() => rollbackImport(item)}>Rollback provenance-created rows</button>
                  ) : null}
                </div>
              ))}
              {!imports.length ? <p className="muted">No staged roster evidence exists for this season yet.</p> : null}
            </article>
          </section>
          <section className="card stack">
            <h2>Row-by-row review</h2>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Row</th><th>Player</th><th>Team</th><th>Contact</th><th>Status</th><th>Issues</th></tr></thead>
                <tbody>{analysis.rows.map((row) => (
                  <tr key={row.rowNumber}>
                    <td>{row.rowNumber}</td><td>{row.normalized.firstName} {row.normalized.lastInitial}.</td><td>{row.normalized.teamName || "Missing"}</td>
                    <td>{row.normalized.parentEmail || row.normalized.parentPhone || "Missing"}</td>
                    <td><span className={`badge ${responseBadge(row.status)}`}>{row.status}</span></td>
                    <td>{row.issues.map((issue) => issue.code).join(", ") || "None"}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </section>
        </>
      ) : <section className="card"><p>No active organization-season context is available to this admin.</p></section>}
    </div>
  );
}

export function PracticeRunLoopClient({ state, initialReceipts, onReceiptsChange }: {
  state: AppState;
  initialReceipts: PracticeRunReceipt[];
  onReceiptsChange?: (receipts: PracticeRunReceipt[]) => void;
}) {
  const [receipts, setReceipts] = useState(initialReceipts);
  const [teamId, setTeamId] = useState(state.teams[0]?.id ?? "");
  const practices = state.events.filter((event) => event.teamId === teamId && event.eventType === "practice");
  const [eventId, setEventId] = useState(practices[0]?.id ?? "");
  const [title, setTitle] = useState("Confidence, throwing, and teamwork");
  const [focusText, setFocusText] = useState("throwing, teamwork, confidence");
  const [workedWell, setWorkedWell] = useState("Players used the ready position and encouraged teammates.");
  const [needsWork, setNeedsWork] = useState("Short throws still need a quieter finish.");
  const [familyNote, setFamilyNote] = useState("Try five soft tosses tonight and praise a calm ready position.");
  const [activeReceiptId, setActiveReceiptId] = useState(initialReceipts.find((item) => !item.completedAt)?.id ?? "");
  const [message, setMessage] = useState("Plan, run, and observations stay coach-only until a Parent Replay is separately reviewed.");
  const [isPending, startTransition] = useTransition();
  const activeReceipt = receipts.find((item) => item.id === activeReceiptId);
  const plan: PracticeRunPlan = {
    title,
    focusAreas: focusText.split(",").map((item) => item.trim()).filter(Boolean),
    blocks: [
      { title: "Warm-up", duration: "8 min", activity: "Movement game and ready-position checks", coachCue: "Praise eyes up and safe spacing." },
      { title: "Skill station", duration: "18 min", activity: "Partner throwing with short-distance progressions", coachCue: "Quiet feet, point, and finish." },
      { title: "Team game", duration: "15 min", activity: "Small-sided relay with shared scoring", coachCue: "Celebrate communication, not speed alone." },
      { title: "Close", duration: "4 min", activity: "Name one win and one next step", coachCue: "Capture the family replay note." }
    ]
  };

  function updateReceipts(receipt: PracticeRunReceipt) {
    setReceipts((current) => {
      const next = current.some((item) => item.id === receipt.id)
        ? current.map((item) => item.id === receipt.id ? receipt : item)
        : [receipt, ...current];
      onReceiptsChange?.(next);
      return next;
    });
    setActiveReceiptId(receipt.id);
  }

  function submit(action: "plan" | "start" | "complete") {
    startTransition(async () => {
      const receiptId = activeReceipt?.id ?? activeReceiptId;
      const response = await authenticatedJsonFetch("/api/coach/practice-runs", action === "plan" ? {
        action,
        teamId,
        eventId: eventId || undefined,
        plan
      } : {
        action,
        receiptId,
        observations: action === "complete" ? { workedWell, needsWork, familyNote } satisfies PracticeRunObservations : undefined
      }, action === "plan" ? { "Idempotency-Key": actionReceipt("practice-plan") } : undefined);
      const result = await response.json().catch(() => null) as { ok?: boolean; message?: string; receipt?: PracticeRunReceipt } | null;
      if (result?.ok && result.receipt) updateReceipts(result.receipt);
      setMessage(result?.message ?? `Practice ${action} could not be saved.`);
    });
  }

  return (
    <section className="practice-run-loop">
      <div className="card-header">
        <div><span className="eyebrow">Plan → Practice → Parent Replay</span><h2>Capture what actually happened before writing the family recap.</h2></div>
        <span className={`badge ${activeReceipt?.completedAt ? "ok" : "warning"}`}>{activeReceipt?.completedAt ? "evidence ready" : activeReceipt?.startedAt ? "practice running" : "plan stage"}</span>
      </div>
      <p className="notice">{message}</p>
      <div className="grid two">
        <article className="card stack">
          <div className="grid two">
            <label>Team<select value={teamId} onChange={(event) => {
              const nextTeam = event.target.value;
              setTeamId(nextTeam);
              setEventId(state.events.find((item) => item.teamId === nextTeam && item.eventType === "practice")?.id ?? "");
              setActiveReceiptId("");
            }}>{state.teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
            <label>Practice<select value={eventId} onChange={(event) => setEventId(event.target.value)}><option value="">Team plan only</option>{practices.map((event) => <option key={event.id} value={event.id}>{event.title} · {shortDate(event.startsAt)}</option>)}</select></label>
          </div>
          <label>Plan title<input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
          <label>Focus areas<input value={focusText} onChange={(event) => setFocusText(event.target.value)} /></label>
          <div className="practice-blocks">{plan.blocks.map((block) => <p key={block.title}><strong>{block.duration} · {block.title}</strong><br /><span>{block.activity}</span><br /><small className="muted">{block.coachCue}</small></p>)}</div>
          <div className="button-row">
            <button disabled={isPending || Boolean(activeReceipt)} onClick={() => submit("plan")}>Save reviewed plan</button>
            <button disabled={isPending || !activeReceipt || Boolean(activeReceipt.startedAt)} onClick={() => submit("start")}>Start practice</button>
          </div>
        </article>
        <article className="card stack">
          <span className="eyebrow">Post-practice receipt</span>
          <h2>Coach observations</h2>
          <label>What worked<textarea value={workedWell} onChange={(event) => setWorkedWell(event.target.value)} /></label>
          <label>What needs work<textarea value={needsWork} onChange={(event) => setNeedsWork(event.target.value)} /></label>
          <label>Family-safe note<textarea value={familyNote} onChange={(event) => setFamilyNote(event.target.value)} /></label>
          <button disabled={isPending || !activeReceipt?.startedAt || Boolean(activeReceipt.completedAt)} onClick={() => submit("complete")}>Complete and unlock Replay seed</button>
          <p className="muted">Completion does not publish anything. It creates evidence that a separately reviewed Parent Replay draft may reference.</p>
        </article>
      </div>
    </section>
  );
}

function WaterBreakTimer() {
  const [selectedMinutes, setSelectedMinutes] = useState<number>(5);
  const [remainingSeconds, setRemainingSeconds] = useState(5 * 60);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [status, setStatus] = useState("Choose an interval, then start the next hydration reminder.");
  const running = endsAt !== null;

  useEffect(() => {
    if (!endsAt) return;
    const timer = window.setInterval(() => {
      const next = remainingWaterBreakSeconds(endsAt, Date.now());
      setRemainingSeconds(next);
      if (next === 0) {
        window.clearInterval(timer);
        setEndsAt(null);
        setStatus("Water break due now. Pause activity and confirm every player has water.");
        if ("vibrate" in navigator) navigator.vibrate([180, 100, 180]);
      }
    }, 500);
    return () => window.clearInterval(timer);
  }, [endsAt]);

  function choosePreset(minutes: number) {
    setSelectedMinutes(minutes);
    setRemainingSeconds(minutes * 60);
    setEndsAt(null);
    setStatus(`${minutes}-minute water break reminder selected.`);
  }

  function start() {
    const seconds = remainingSeconds || selectedMinutes * 60;
    setRemainingSeconds(seconds);
    setEndsAt(Date.now() + seconds * 1000);
    setStatus("Timer running. It recovers from the target time if this tab sleeps.");
  }

  function pause() {
    if (!endsAt) return;
    setRemainingSeconds(remainingWaterBreakSeconds(endsAt, Date.now()));
    setEndsAt(null);
    setStatus("Water break timer paused.");
  }

  function reset() {
    setRemainingSeconds(selectedMinutes * 60);
    setEndsAt(null);
    setStatus("Water break timer reset.");
  }

  return (
    <section className={`practice-safety-timer ${remainingSeconds === 0 ? "due" : ""}`} aria-label="Water break timer">
      <div>
        <span className="eyebrow">Water break timer</span>
        <strong
          className="practice-timer-display"
          role="timer"
          aria-label={`${formatWaterBreakCountdown(remainingSeconds)} remaining`}
        >
          {formatWaterBreakCountdown(remainingSeconds)}
        </strong>
        <p className="muted" aria-live="polite">{status}</p>
      </div>
      <div className="practice-timer-controls">
        <div className="pill-row" aria-label="Water break interval">
          {waterBreakMinutePresets.map((minutes) => (
            <button
              className={selectedMinutes === minutes ? "" : "secondary"}
              key={minutes}
              type="button"
              onClick={() => choosePreset(minutes)}
            >
              {minutes} min
            </button>
          ))}
        </div>
        <div className="button-row">
          <button type="button" disabled={running} onClick={start}>{remainingSeconds === 0 ? "Start again" : "Start timer"}</button>
          <button type="button" className="secondary" disabled={!running} onClick={pause}>Pause</button>
          <button type="button" className="secondary" onClick={reset}>Reset</button>
        </div>
      </div>
    </section>
  );
}

function medicalDecisionCopy(status: CoachInjuryContact["medicalDecisionStatus"]) {
  if (status === "approved") return "Medical decision approved";
  if (status === "denied") return "Medical decision not authorized";
  return "Medical decision authority not recorded";
}

export function CoachInjuryCallPanel({ contacts, message }: {
  contacts: CoachInjuryContact[];
  message: string;
}) {
  const players = Array.from(new Map(contacts.map((contact) => [contact.playerId, {
    id: contact.playerId,
    name: contact.playerName,
    teamName: contact.teamName
  }])).values());
  const [playerId, setPlayerId] = useState(players[0]?.id ?? "");
  const [revealed, setRevealed] = useState(false);
  const selectedContacts = contacts.filter((contact) => contact.playerId === playerId);

  return (
    <section className="coach-injury-panel" aria-label="Injury contact quick call">
      <div className="card-header">
        <div>
          <span className="eyebrow">Injury contact</span>
          <h2>Quick-call a parent or emergency contact.</h2>
        </div>
        <span className="badge warning">Coach-only safety data</span>
      </div>
      <p className="notice warning"><strong>For life-threatening symptoms, contact local emergency services first.</strong> This tool opens the device dialer. LeaguePilot does not place or confirm the call.</p>
      <p className="muted">{message}</p>
      {players.length ? (
        <div className="injury-contact-layout">
          <div className="stack">
            <label>
              Injured player
              <select value={playerId} onChange={(event) => {
                setPlayerId(event.target.value);
                setRevealed(false);
              }}>
                {players.map((player) => <option key={player.id} value={player.id}>{player.name} - {player.teamName}</option>)}
              </select>
            </label>
            <button type="button" onClick={() => setRevealed((current) => !current)} aria-expanded={revealed}>
              {revealed ? "Hide injury contacts" : "Show injury contacts"}
            </button>
            <p className="muted">Numbers stay hidden on screen until a coach intentionally reveals them for the selected player.</p>
          </div>
          <div className="injury-contact-results" aria-live="polite">
            {revealed ? selectedContacts.map((contact) => {
              return (
                <article className="injury-contact-row" key={contact.id}>
                  <div>
                    <strong>{contact.contactName}</strong>
                    <span>{contact.relationship.replaceAll("_", " ")} · {contact.kind === "guardian" ? "parent/guardian" : `emergency priority ${contact.priority}`}</span>
                    <small className={contact.medicalDecisionStatus === "approved" ? "ok-text" : "muted"}>{medicalDecisionCopy(contact.medicalDecisionStatus)}</small>
                  </div>
                  <a className="button injury-call-button" href={`tel:${contact.phone}`} aria-label={`Call ${contact.contactName} for ${contact.playerName}`}>
                    {contact.kind === "guardian" ? "Call parent" : "Call emergency contact"}
                  </a>
                </article>
              );
            }) : <p className="muted">Select the player and reveal contacts only when injury coordination is needed.</p>}
          </div>
        </div>
      ) : <p className="notice">No callable contact is recorded for the assigned roster. Ask an administrator to verify guardian and emergency-contact records before practice.</p>}
    </section>
  );
}

export function CoachPracticeReplayWorkbench({
  state,
  initialReceipts,
  injuryContacts,
  injuryContactMessage,
  dashboardData,
  drillVideoData
}: {
  state: AppState;
  initialReceipts: PracticeRunReceipt[];
  injuryContacts: CoachInjuryContact[];
  injuryContactMessage: string;
  dashboardData?: ParentCoachDashboardData | null;
  drillVideoData?: DrillVideoLibraryData | null;
}) {
  const [receipts, setReceipts] = useState(initialReceipts);
  return (
    <>
      <div className="page coordination-workbench">
        <PracticeRunLoopClient state={state} initialReceipts={initialReceipts} onReceiptsChange={setReceipts} />
        <WaterBreakTimer />
        <CoachInjuryCallPanel contacts={injuryContacts} message={injuryContactMessage} />
      </div>
      <ParentReplayClient dashboardData={dashboardData} drillVideoData={drillVideoData} practiceRunReceipts={receipts} />
    </>
  );
}

interface FlightLeg {
  event: LeagueEvent;
  playerId: string;
  playerName: string;
  teamName: string;
  rsvp: string;
  weather?: string;
  help: string[];
  handoff?: FamilyEventHandoff;
}

export function FamilyFlightPlanClient({ state, parentUserId, initialHandoffs, message }: {
  state: AppState;
  parentUserId: string;
  initialHandoffs: FamilyEventHandoff[];
  message: string;
}) {
  const [handoffs, setHandoffs] = useState(initialHandoffs);
  const [selectedKey, setSelectedKey] = useState("");
  const [caregiverLabel, setCaregiverLabel] = useState("Grandparent pickup");
  const [note, setNote] = useState("Meet at the team check-in flag 20 minutes before start.");
  const [statusMessage, setStatusMessage] = useState(message);
  const [isPending, startTransition] = useTransition();
  const legs = useMemo(() => {
    const linkedPlayerIds = new Set(state.guardianLinks
      .filter((link) => link.parentUserId === parentUserId && link.status === "active")
      .map((link) => link.playerId));
    const players = state.players.filter((player) => linkedPlayerIds.has(player.id));
    return players.flatMap((player) => state.events
      .filter((event) => event.teamId === player.teamId && event.status === "scheduled" && Date.parse(event.endsAt) > Date.now() - 24 * 60 * 60 * 1000)
      .map((event): FlightLeg => {
        const team = state.teams.find((item) => item.id === player.teamId);
        const rsvp = state.rsvps.find((item) => item.eventId === event.id && item.playerId === player.id);
        const weather = state.weatherAlerts.find((item) => item.eventId === event.id);
        const snack = state.snackScheduleSlots.find((item) => item.eventId === event.id && item.assignedParentUserId === parentUserId);
        const volunteer = state.volunteerSignups.find((item) => item.eventId === event.id && item.assignedUserId === parentUserId);
        return {
          event,
          playerId: player.id,
          playerName: `${player.firstName} ${player.lastInitial}.`,
          teamName: team?.name ?? "Team",
          rsvp: rsvp?.response ?? "needed",
          weather: weather ? `${weather.severity}: ${weather.headline}` : undefined,
          help: [snack ? `Snack: ${snack.item}` : "", volunteer ? `Volunteer: ${volunteer.role}` : ""].filter(Boolean),
          handoff: handoffs.find((item) => item.eventId === event.id && item.playerId === player.id && !item.cancelledAt)
        };
      }))
      .sort((left, right) => Date.parse(left.event.startsAt) - Date.parse(right.event.startsAt));
  }, [handoffs, parentUserId, state]);
  const conflicts = findFamilyFlightConflicts(legs).map((conflict) => `${conflict.leftPlayerName} and ${conflict.rightPlayerName}`);
  const selectedLeg = legs.find((leg) => `${leg.event.id}:${leg.playerId}` === selectedKey) ?? legs[0];

  function saveHandoff() {
    if (!selectedLeg) return;
    startTransition(async () => {
      const response = await authenticatedJsonFetch("/api/parent/family-flight-plan/handoff", {
        action: "confirm",
        eventId: selectedLeg.event.id,
        playerId: selectedLeg.playerId,
        caregiverLabel,
        note
      });
      const result = await response.json().catch(() => null) as { ok?: boolean; message?: string; handoff?: FamilyEventHandoff } | null;
      if (result?.ok && result.handoff) {
        setHandoffs((current) => [result.handoff!, ...current.filter((item) => item.id !== result.handoff!.id)]);
      }
      setStatusMessage(result?.message ?? "Caregiver handoff could not be saved.");
    });
  }

  function cancelHandoff(handoff: FamilyEventHandoff) {
    startTransition(async () => {
      const response = await authenticatedJsonFetch("/api/parent/family-flight-plan/handoff", { action: "cancel", handoffId: handoff.id });
      const result = await response.json().catch(() => null) as { ok?: boolean; message?: string; handoff?: FamilyEventHandoff } | null;
      if (result?.ok && result.handoff) setHandoffs((current) => current.map((item) => item.id === result.handoff!.id ? result.handoff! : item));
      setStatusMessage(result?.message ?? "Caregiver handoff could not be cancelled.");
    });
  }

  return (
    <div className="page coordination-workbench family-flight-plan">
      <section className="hero compact-hero">
        <span className="eyebrow">Family Flight Plan</span>
        <h1>One timeline for every child, field, RSVP, weather flag, and family handoff.</h1>
        <p className="lead">LeaguePilot combines only the children linked to this guardian. Children still do not log in, and caregiver labels do not grant app access.</p>
      </section>
      <p className="notice">{statusMessage}</p>
      {conflicts.length ? <p className="notice warning"><strong>Overlap detected:</strong> {Array.from(new Set(conflicts)).join(", ")} have overlapping events. Confirm a caregiver handoff below.</p> : <p className="notice ok">No overlapping child events are currently visible.</p>}
      <section className="flight-timeline" aria-label="Family event timeline">
        {legs.slice(0, 10).map((leg) => (
          <article className="card flight-leg" key={`${leg.event.id}:${leg.playerId}`}>
            <time>{shortDate(leg.event.startsAt)}</time>
            <div>
              <span className="eyebrow">{leg.playerName} · {leg.teamName}</span>
              <h2>{leg.event.title}</h2>
              <p>{leg.event.locationName} · {leg.event.locationAddress}</p>
              <div className="pill-row">
                <span className={`badge ${responseBadge(leg.rsvp)}`}>RSVP {leg.rsvp.replaceAll("_", " ")}</span>
                <span className="badge">{familyEventGear(leg.event.eventType)}</span>
                {leg.weather ? <span className="badge warning">{leg.weather}</span> : null}
                {leg.help.map((item) => <span className="badge" key={item}>{item}</span>)}
                {leg.handoff ? <span className="badge ok">Handoff: {leg.handoff.caregiverLabel}</span> : null}
              </div>
            </div>
          </article>
        ))}
        {!legs.length ? <article className="card"><p className="muted">No upcoming events are available for this guardian&apos;s linked children.</p></article> : null}
      </section>
      {selectedLeg ? (
        <section className="card stack">
          <div className="card-header"><div><span className="eyebrow">Caregiver coordination</span><h2>Confirm one event handoff</h2></div><span className="badge warning">No access grant</span></div>
          <div className="grid two">
            <label>Child event<select value={selectedKey || `${selectedLeg.event.id}:${selectedLeg.playerId}`} onChange={(event) => setSelectedKey(event.target.value)}>{legs.map((leg) => <option key={`${leg.event.id}:${leg.playerId}`} value={`${leg.event.id}:${leg.playerId}`}>{leg.playerName} · {leg.event.title} · {shortDate(leg.event.startsAt)}</option>)}</select></label>
            <label>Caregiver label<input value={caregiverLabel} onChange={(event) => setCaregiverLabel(event.target.value)} /></label>
          </div>
          <label>Handoff note<textarea value={note} onChange={(event) => setNote(event.target.value)} /></label>
          <div className="button-row">
            <button disabled={isPending || caregiverLabel.trim().length < 2} onClick={saveHandoff}>Confirm caregiver handoff</button>
            {selectedLeg.handoff ? <button className="secondary" disabled={isPending} onClick={() => cancelHandoff(selectedLeg.handoff!)}>Cancel current handoff</button> : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export function GameDayResolutionRoomClient({ state, initialReviews, mode, message }: {
  state: AppState;
  initialReviews: GameDayResolutionReview[];
  mode: "coach" | "admin";
  message: string;
}) {
  const candidateEvents = state.events
    .filter((event) => event.status === "scheduled" && event.eventType !== "team_event")
    .sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt));
  const [eventId, setEventId] = useState(candidateEvents[0]?.id ?? state.events[0]?.id ?? "");
  const [decision, setDecision] = useState<GameDayDecision>("monitor");
  const selectedEvent = state.events.find((event) => event.id === eventId);
  const [startsAt, setStartsAt] = useState(selectedEvent?.startsAt ?? "");
  const [reason, setReason] = useState("Conditions were reviewed against the latest team and field evidence.");
  const [reviews, setReviews] = useState(initialReviews);
  const [statusMessage, setStatusMessage] = useState(message);
  const [isPending, startTransition] = useTransition();
  const weather = state.weatherAlerts.find((alert) => alert.eventId === eventId);
  const eventPlayers = state.players.filter((player) => player.teamId === selectedEvent?.teamId);
  const rsvps = state.rsvps.filter((rsvp) => rsvp.eventId === eventId);
  const going = rsvps.filter((rsvp) => rsvp.response === "going").length;
  const noResponse = Math.max(0, eventPlayers.length - rsvps.length);
  const latestReview = reviews.find((review) => review.eventId === eventId);

  function selectEvent(nextId: string) {
    setEventId(nextId);
    setStartsAt(state.events.find((event) => event.id === nextId)?.startsAt ?? "");
    setDecision("monitor");
  }

  function applyResolution() {
    if (!selectedEvent) return;
    startTransition(async () => {
      const response = await authenticatedJsonFetch("/api/game-day-resolution", {
        eventId: selectedEvent.id,
        decision,
        startsAt: decision === "delay" ? startsAt : undefined,
        reason
      }, { "Idempotency-Key": actionReceipt("game-day-resolution") });
      const result = await response.json().catch(() => null) as {
        ok?: boolean;
        message?: string;
        reviewId?: string;
        affectedRecipientCount?: number;
        notificationCount?: number;
      } | null;
      if (result?.ok && result.reviewId) {
        setReviews((current) => [{
          id: result.reviewId!,
          eventId: selectedEvent.id,
          teamId: selectedEvent.teamId,
          actorUserId: "",
          decision,
          reason,
          evidence: weather ? { weatherHeadline: weather.headline, weatherSeverity: weather.severity } : {},
          affectedRecipientCount: result.affectedRecipientCount ?? 0,
          notificationCount: result.notificationCount ?? 0,
          reviewedAt: new Date().toISOString(),
          appliedAt: decision === "delay" || decision === "cancel" ? new Date().toISOString() : undefined
        }, ...current]);
      }
      setStatusMessage(result?.message ?? "Game-day resolution could not be saved.");
    });
  }

  return (
    <div className="page coordination-workbench resolution-room">
      <section className="hero compact-hero">
        <span className="eyebrow">Game-Day Resolution Room · {mode}</span>
        <h1>Turn weather uncertainty into one reviewed, auditable decision.</h1>
        <p className="lead">Weather evidence informs the room; it never changes or cancels an event by itself. A coach or admin must review the affected families and apply the decision.</p>
      </section>
      <p className="notice">{statusMessage}</p>
      <section className="grid two">
        <article className="card stack">
          <label>Event<select value={eventId} onChange={(event) => selectEvent(event.target.value)}>{candidateEvents.map((event) => <option key={event.id} value={event.id}>{event.title} · {shortDate(event.startsAt)}</option>)}</select></label>
          <div className="grid three">
            <p><strong>{going}</strong><br /><span className="muted">going</span></p>
            <p><strong>{noResponse}</strong><br /><span className="muted">no response</span></p>
            <p><strong>{eventPlayers.length}</strong><br /><span className="muted">affected players</span></p>
          </div>
          <div className="notice">
            <strong>{weather?.headline ?? "No weather alert draft"}</strong>
            <p>{weather?.detail ?? "Review field and local conditions directly before deciding."}</p>
            <span className={`badge ${weather?.severity === "cancel_risk" ? "danger" : "warning"}`}>{weather?.severity ?? "manual review"}</span>
          </div>
          {latestReview ? <p className="muted">Latest review: {latestReview.decision.replaceAll("_", " ")} · {shortDate(latestReview.reviewedAt)} · {latestReview.notificationCount} draft alert(s)</p> : null}
        </article>
        <article className="card stack">
          <div className="card-header"><div><span className="eyebrow">Human decision</span><h2>Review and resolve</h2></div><span className="badge warning">Provider sends: 0</span></div>
          <label>Decision<select value={decision} onChange={(event) => setDecision(event.target.value as GameDayDecision)}>
            <option value="monitor">Monitor only</option>
            <option value="confirm_on_time">Confirm on time</option>
            <option value="delay">Delay</option>
            <option value="cancel">Cancel</option>
          </select></label>
          {decision === "delay" ? <label>New start time<input value={startsAt} onChange={(event) => setStartsAt(event.target.value)} /></label> : null}
          <label>Decision reason<textarea value={reason} onChange={(event) => setReason(event.target.value)} /></label>
          <button disabled={isPending || reason.trim().length < 10 || !selectedEvent} onClick={applyResolution}>Save reviewed resolution</button>
          <p className="muted">Monitor creates evidence only. Confirm, delay, and cancel create pending notification drafts; they do not execute provider delivery.</p>
        </article>
      </section>
      <section className="card stack">
        <h2>Recent resolution receipts</h2>
        {reviews.slice(0, 8).map((review) => (
          <p key={review.id}><span className={`badge ${responseBadge(review.decision)}`}>{review.decision.replaceAll("_", " ")}</span> <strong>{state.events.find((event) => event.id === review.eventId)?.title ?? "Event"}</strong><br /><span className="muted">{shortDate(review.reviewedAt)} · {review.affectedRecipientCount} recipient(s) · {review.notificationCount} notification draft(s) · {review.reason}</span></p>
        ))}
        {!reviews.length ? <p className="muted">No reviewed game-day decisions exist for this team scope yet.</p> : null}
      </section>
    </div>
  );
}

export type { RosterImportAnalysis };
