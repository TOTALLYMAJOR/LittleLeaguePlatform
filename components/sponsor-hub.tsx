"use client";

import {
  ArrowRight,
  Building2,
  Check,
  ChevronRight,
  CircleDollarSign,
  Download,
  FileText,
  ImageIcon,
  LayoutDashboard,
  Mail,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Users
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { Sponsor, SponsorDeliverable, SponsorFulfillmentEvidenceKind, Team } from "@/lib/domain";
import { sponsorDeliverableStateLabel } from "@/lib/domain";
import { authenticatedJsonPost } from "@/lib/supabase/authenticated-fetch";
import type { SponsorAdminData } from "@/lib/supabase/sponsors";

type SponsorHubView = "overview" | "sponsors" | "fulfillment" | "reports";

const evidenceKindLabels: Record<SponsorFulfillmentEvidenceKind, string> = {
  screenshot: "Screenshot",
  link: "Public link",
  event_recap: "Event recap",
  attendance_summary: "Attendance summary",
  campaign_note: "Campaign note"
};

/** Screenshot and link evidence point at an artifact; the rest are written observations. */
const artifactBackedEvidenceKinds = new Set<SponsorFulfillmentEvidenceKind>(["screenshot", "link"]);

interface EvidenceDraft {
  requirementId: string;
  requirementLabel: string;
  kind: SponsorFulfillmentEvidenceKind;
  observedAt: string;
  artifactUrl: string;
  note: string;
}

/** `datetime-local` needs a local, second-free value; toISOString would silently shift the zone. */
function localDateTimeValue(date: Date) {
  const offsetMinutes = date.getTimezoneOffset();
  return new Date(date.getTime() - offsetMinutes * 60_000).toISOString().slice(0, 16);
}

interface SponsorDraft {
  id: string;
  name: string;
  url: string;
  level: Sponsor["level"];
  teamId: string;
  status: Sponsor["status"];
  placementKey: Sponsor["placementKey"] | "none";
  logoUrl: string;
}

const placementLabels: Record<NonNullable<Sponsor["placementKey"]>, string> = {
  team_portal: "Team page",
  weekly_digest: "League email",
  storybook: "Season story",
  registration: "Registration",
  field_map: "Field map"
};

function sponsorDraftFrom(sponsor: Sponsor | undefined, teams: Team[]): SponsorDraft {
  return {
    id: sponsor?.id ?? "new",
    name: sponsor?.name ?? "",
    url: sponsor?.url ?? "",
    level: sponsor?.level ?? "league",
    teamId: sponsor?.teamId ?? teams[0]?.id ?? "",
    status: sponsor?.status ?? "pending",
    placementKey: sponsor?.placementKey ?? "none",
    logoUrl: ""
  };
}

function sponsorInitials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]?.toUpperCase()).join("");
}

function statusLabel(status: Sponsor["status"]) {
  if (status === "active") return "Active";
  if (status === "expired") return "Past season";
  return "Setup";
}

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(cents / 100);
}

function downloadSponsorCsv(sponsors: Sponsor[]) {
  const quote = (value: string) => `"${value.replaceAll("\"", "\"\"")}"`;
  const rows = [
    ["Sponsor", "Level", "Status", "Website", "Placement", "Logo"],
    ...sponsors.map((sponsor) => [
      sponsor.name,
      sponsor.level,
      sponsor.status,
      sponsor.url,
      sponsor.placementKey ? placementLabels[sponsor.placementKey] : "",
      sponsor.logoUrl ? "On file" : "Missing"
    ])
  ];
  const csv = rows.map((row) => row.map((cell) => quote(String(cell))).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "leaguepilot-sponsors.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

export function SponsorHub({ initialData }: { initialData: SponsorAdminData }) {
  const router = useRouter();
  const [view, setView] = useState<SponsorHubView>("overview");
  const [evidenceDraft, setEvidenceDraft] = useState<EvidenceDraft | null>(null);
  const [evidenceMessage, setEvidenceMessage] = useState("");
  const [sponsors, setSponsors] = useState(initialData.sponsors);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Sponsor["status"]>("all");
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState(() => sponsorDraftFrom(undefined, initialData.teams));
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const editorRef = useRef<HTMLFormElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  const activeSponsors = sponsors.filter((sponsor) => sponsor.status === "active");
  const artworkNeeded = sponsors.filter((sponsor) => !sponsor.logoUrl);
  const placementNeeded = sponsors.filter((sponsor) => !sponsor.placementKey);
  const pastSeasonSponsors = sponsors.filter((sponsor) => sponsor.status === "expired");
  const paidProgramSummaries = initialData.programSummaries.filter((summary) => (
    summary.agreementRecorded && summary.paymentState === "paid" && summary.outstandingCents === 0
  ));
  const paidSponsorIds = new Set(paidProgramSummaries.map((summary) => summary.sponsorId));
  const paymentTruthKnown = initialData.programSummaries.length > 0;
  const deliverablesBySponsorId = new Map<string, SponsorDeliverable[]>(
    initialData.programSummaries.map((summary) => [summary.sponsorId, summary.deliverables])
  );
  const provenDeliverableCount = initialData.programSummaries.reduce(
    (total, summary) => total + summary.deliverables.filter((deliverable) => deliverable.state === "delivered").length,
    0
  );
  const verifiedRevenueCents = paidProgramSummaries.reduce(
    (total, summary) => total + Math.max(0, summary.paidCents - summary.refundedCents),
    0
  );
  const filteredSponsors = useMemo(() => sponsors.filter((sponsor) => {
    const matchesQuery = `${sponsor.name} ${sponsor.url}`.toLowerCase().includes(query.trim().toLowerCase());
    return matchesQuery && (statusFilter === "all" || sponsor.status === statusFilter);
  }), [query, sponsors, statusFilter]);

  const attentionItems = [
    artworkNeeded.length
      ? { icon: ImageIcon, title: `${artworkNeeded.length} sponsor${artworkNeeded.length === 1 ? "" : "s"} need artwork`, detail: "Add a reviewed HTTPS logo before public recognition.", action: "Review artwork", view: "sponsors" as const }
      : undefined,
    placementNeeded.length
      ? { icon: Target, title: `${placementNeeded.length} placement${placementNeeded.length === 1 ? "" : "s"} need review`, detail: "Choose where each approved sponsor may appear.", action: "Set placements", view: "sponsors" as const }
      : undefined,
    pastSeasonSponsors.length
      ? { icon: Mail, title: `${pastSeasonSponsors.length} sponsor${pastSeasonSponsors.length === 1 ? "" : "s"} ready for renewal review`, detail: "Prepare a human-reviewed renewal request for the next season.", action: "Review renewals", view: "fulfillment" as const }
      : undefined
  ].filter(Boolean) as Array<{
    icon: typeof ImageIcon;
    title: string;
    detail: string;
    action: string;
    view: SponsorHubView;
  }>;

  function openSponsorEditor(sponsor?: Sponsor) {
    if (!initialData.isSupabaseBacked) return;
    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setDraft(sponsorDraftFrom(sponsor, initialData.teams));
    setMessage("");
    setEditorOpen(true);
  }

  function closeSponsorEditor() {
    setEditorOpen(false);
    window.requestAnimationFrame(() => restoreFocusRef.current?.focus());
  }

  useEffect(() => {
    if (!editorOpen) return;
    const dialog = editorRef.current;
    if (!dialog) return;

    const focusableSelector = [
      "button:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "[href]",
      "[tabindex]:not([tabindex='-1'])"
    ].join(",");

    function handleDialogKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeSponsorEditor();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;

      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector));
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleDialogKeyDown);
    return () => document.removeEventListener("keydown", handleDialogKeyDown);
  }, [editorOpen]);

  function saveSponsor() {
    setMessage("");
    if (!initialData.isSupabaseBacked) {
      setMessage("Live organization records are required before sponsor changes can be saved.");
      return;
    }
    if (!draft.name.trim()) {
      setMessage("Business name is required.");
      return;
    }
    if (!draft.url.startsWith("https://")) {
      setMessage("Use an HTTPS website address.");
      return;
    }

    startTransition(async () => {
      try {
        const response = await authenticatedJsonPost("/api/admin/sponsors", {
          organizationId: initialData.organizationId,
          sponsorId: draft.id === "new" ? undefined : draft.id,
          name: draft.name.trim(),
          level: draft.level,
          teamId: draft.level === "team" ? draft.teamId : undefined,
          url: draft.url.trim(),
          status: draft.status,
          placementKey: draft.placementKey === "none" ? undefined : draft.placementKey,
          logoUrl: draft.logoUrl.trim() || undefined
        });
        const result = await response.json().catch(() => null) as {
          ok?: boolean;
          message?: string;
          sponsor?: Sponsor;
          partial?: boolean;
        } | null;

        if (!result?.ok || !result.sponsor) {
          setMessage(result?.message ?? "Sponsor could not be saved.");
          return;
        }

        const existingSponsor = sponsors.find((sponsor) => sponsor.id === result.sponsor!.id);
        const savedSponsor = {
          ...result.sponsor,
          placementKey: result.partial ? existingSponsor?.placementKey : result.sponsor.placementKey,
          logoUrl: existingSponsor?.logoUrl
        };
        setSponsors((current) => {
          const exists = current.some((sponsor) => sponsor.id === savedSponsor.id);
          return exists
            ? current.map((sponsor) => sponsor.id === savedSponsor.id ? savedSponsor : sponsor)
            : [savedSponsor, ...current];
        });
        setMessage(result.message ?? (
          result.partial
            ? "Sponsor record saved with a follow-up warning."
            : "Sponsor record saved."
        ));
        setDraft(sponsorDraftFrom(savedSponsor, initialData.teams));
      } catch {
        setMessage("Sponsor could not be saved. Check your connection and try again.");
      }
    });
  }

  function openEvidenceCapture(deliverable: SponsorDeliverable) {
    setEvidenceMessage("");
    setEvidenceDraft({
      requirementId: deliverable.requirement.id,
      requirementLabel: deliverable.requirement.label,
      kind: "screenshot",
      observedAt: localDateTimeValue(new Date()),
      artifactUrl: "",
      note: ""
    });
  }

  function submitEvidence() {
    if (!evidenceDraft) return;
    setEvidenceMessage("");

    if (!initialData.isSupabaseBacked) {
      setEvidenceMessage("Live organization records are required before fulfillment evidence can be recorded.");
      return;
    }

    const observedAtMs = Date.parse(evidenceDraft.observedAt);
    if (!Number.isFinite(observedAtMs)) {
      setEvidenceMessage("Enter the date and time the benefit was observed.");
      return;
    }
    if (observedAtMs > Date.now()) {
      setEvidenceMessage("Evidence cannot be observed in the future. Record what has already run.");
      return;
    }

    const artifactUrl = evidenceDraft.artifactUrl.trim();
    const note = evidenceDraft.note.trim();
    if (artifactBackedEvidenceKinds.has(evidenceDraft.kind) && !artifactUrl.startsWith("https://")) {
      setEvidenceMessage("Screenshot and link evidence require an HTTPS artifact link.");
      return;
    }
    if (!artifactBackedEvidenceKinds.has(evidenceDraft.kind) && !note) {
      setEvidenceMessage("Recap, attendance, and campaign evidence require a written observation.");
      return;
    }

    startTransition(async () => {
      try {
        const response = await authenticatedJsonPost("/api/admin/sponsors/evidence", {
          requirementId: evidenceDraft.requirementId,
          kind: evidenceDraft.kind,
          observedAt: new Date(observedAtMs).toISOString(),
          artifactUrl: artifactUrl || undefined,
          note: note || undefined
        });
        const result = await response.json().catch(() => null) as { ok?: boolean; message?: string } | null;

        if (!result?.ok) {
          setEvidenceMessage(result?.message ?? "Fulfillment evidence could not be recorded.");
          return;
        }

        setEvidenceDraft(null);
        setEvidenceMessage(result.message ?? "Evidence recorded.");
        // Delivery state is derived on the server from the persisted evidence rows, so the page is
        // re-read rather than patched locally.
        router.refresh();
      } catch {
        setEvidenceMessage("Fulfillment evidence could not be recorded. Check your connection and try again.");
      }
    });
  }

  return (
    <div className="sponsor-hub">
      <header className="sponsor-hub-header">
        <div>
          <span className="sponsor-hub-kicker"><Sparkles aria-hidden="true" size={15} /> Community partnerships</span>
          <h1>Sponsor Hub</h1>
          <p>Keep every local partner, promise, and proof item in one simple place.</p>
        </div>
        <div className="sponsor-hub-header-actions">
          <button className="secondary" type="button" onClick={() => downloadSponsorCsv(sponsors)} disabled={!sponsors.length}>
            <Download aria-hidden="true" size={17} /> Export CSV
          </button>
          <button
            type="button"
            onClick={() => openSponsorEditor()}
            disabled={!initialData.isSupabaseBacked}
            title={initialData.isSupabaseBacked ? undefined : "Live organization records are required to add a sponsor."}
          >
            <Plus aria-hidden="true" size={18} /> Add sponsor
          </button>
        </div>
      </header>

      <nav className="sponsor-hub-nav" aria-label="Sponsor Hub sections">
        {([
          ["overview", LayoutDashboard, "Overview"],
          ["sponsors", Building2, "Sponsors"],
          ["fulfillment", Check, "Fulfillment"],
          ["reports", FileText, "Reports"]
        ] as const).map(([value, Icon, label]) => (
          <button
            key={value}
            type="button"
            className={view === value ? "is-active" : ""}
            aria-current={view === value ? "page" : undefined}
            onClick={() => setView(value)}
          >
            <Icon aria-hidden="true" size={17} /> {label}
          </button>
        ))}
      </nav>

      <div className={`sponsor-hub-source ${initialData.isSupabaseBacked ? "is-live" : "is-fallback"}`} role="status">
        <ShieldCheck aria-hidden="true" size={17} />
        <span><strong>{initialData.isSupabaseBacked ? "Organization records loaded" : "Sponsor data unavailable"}</strong> {initialData.message}</span>
      </div>

      {view === "overview" ? (
        <>
          <section className="sponsor-hub-metrics" aria-label="Sponsor summary">
            <article>
              <span><Users aria-hidden="true" size={18} /> Active sponsors</span>
              <strong>{activeSponsors.length}</strong>
              <small>{sponsors.length} total records</small>
            </article>
            <article>
              <span><CircleDollarSign aria-hidden="true" size={18} /> Verified revenue</span>
              <strong>{paymentTruthKnown ? formatUsd(verifiedRevenueCents) : "—"}</strong>
              <small>
                {!paymentTruthKnown
                  ? "Payment proof is unavailable"
                  : paidProgramSummaries.length
                    ? `${paidProgramSummaries.length} fully paid sponsor program${paidProgramSummaries.length === 1 ? "" : "s"}`
                    : "No settled payment proof recorded"}
              </small>
            </article>
            <article>
              <span><Target aria-hidden="true" size={18} /> Needs attention</span>
              <strong>{new Set([...artworkNeeded, ...placementNeeded]).size}</strong>
              <small>Artwork or placement review</small>
            </article>
            <article>
              <span><Mail aria-hidden="true" size={18} /> Renewal review</span>
              <strong>{pastSeasonSponsors.length}</strong>
              <small>Human outreach required</small>
            </article>
          </section>

          <section className="sponsor-hub-overview-grid">
            <article className="sponsor-hub-panel sponsor-hub-attention">
              <header>
                <div>
                  <h2>What needs attention</h2>
                  <p>Start with the promises and records most likely to get missed.</p>
                </div>
                <span>{attentionItems.length} open</span>
              </header>
              {attentionItems.length ? (
                <div className="sponsor-hub-action-list">
                  {attentionItems.map((item) => (
                    <button type="button" key={item.title} onClick={() => setView(item.view)}>
                      <span className="sponsor-hub-action-icon"><item.icon aria-hidden="true" size={19} /></span>
                      <span><strong>{item.title}</strong><small>{item.detail}</small></span>
                      <span className="sponsor-hub-action-link">{item.action}<ChevronRight aria-hidden="true" size={16} /></span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="sponsor-hub-empty compact">
                  <Check aria-hidden="true" size={22} />
                  <strong>No sponsor setup issues are visible.</strong>
                  <p>Review fulfillment proof before making delivery or impact claims.</p>
                </div>
              )}
            </article>

            <aside className="sponsor-hub-panel sponsor-hub-season">
              <span>Season progress</span>
              <h2>{activeSponsors.length ? "Sponsor records are moving" : "Start with one local partner"}</h2>
              <div className="sponsor-hub-progress" aria-label={`${activeSponsors.length} of ${Math.max(sponsors.length, 1)} sponsor records active`}>
                <span style={{ width: `${sponsors.length ? (activeSponsors.length / sponsors.length) * 100 : 0}%` }} />
              </div>
              <p>{activeSponsors.length} active of {sponsors.length} sponsor records.</p>
              <button type="button" className="secondary" onClick={() => setView("sponsors")}>
                View all sponsors <ArrowRight aria-hidden="true" size={16} />
              </button>
            </aside>
          </section>

          <section className="sponsor-hub-panel sponsor-hub-roster">
            <header>
              <div>
                <h2>Recent sponsor records</h2>
                <p>Public placement stays separate from payment and fulfillment evidence.</p>
              </div>
              <button className="secondary" type="button" onClick={() => setView("sponsors")}>Manage sponsors</button>
            </header>
            <SponsorRoster
              sponsors={sponsors.slice(0, 4)}
              teams={initialData.teams}
              onEdit={openSponsorEditor}
              paidSponsorIds={paidSponsorIds}
              billingKnown={paymentTruthKnown}
            />
          </section>
        </>
      ) : null}

      {view === "sponsors" ? (
        <section className="sponsor-hub-panel sponsor-hub-directory">
          <header>
            <div>
              <h2>All sponsors</h2>
              <p>Manage recognition records without exposing billing or family information.</p>
            </div>
            <button type="button" onClick={() => openSponsorEditor()} disabled={!initialData.isSupabaseBacked}>
              <Plus aria-hidden="true" size={17} /> Add sponsor
            </button>
          </header>
          <div className="sponsor-hub-filters">
            <label>
              <span className="sr-only">Search sponsors</span>
              <Search aria-hidden="true" size={17} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search sponsors" />
            </label>
            <label>
              <span className="sr-only">Filter sponsor status</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="pending">Setup</option>
                <option value="expired">Past season</option>
              </select>
            </label>
          </div>
          <SponsorRoster
            sponsors={filteredSponsors}
            teams={initialData.teams}
            onEdit={openSponsorEditor}
            paidSponsorIds={paidSponsorIds}
            billingKnown={paymentTruthKnown}
          />
        </section>
      ) : null}

      {view === "fulfillment" ? (
        <section className="sponsor-hub-workspace">
          <article className="sponsor-hub-panel">
            <header><div><h2>Fulfillment setup</h2><p>These checks come from current sponsor, logo, and placement records.</p></div></header>
            <div className="sponsor-hub-checklist">
              {sponsors.map((sponsor) => {
                const deliverables = deliverablesBySponsorId.get(sponsor.id) ?? [];
                const checks = [
                  { label: "Sponsor record", complete: true },
                  { label: "Reviewed logo on file", complete: Boolean(sponsor.logoUrl) },
                  { label: "Public placement selected", complete: Boolean(sponsor.placementKey) },
                  // Delivery proof is complete only when every promised benefit has been observed
                  // as many times as it was promised. `delivered` alone is not enough: it reports
                  // that at least one observation exists, so a benefit promising two placements
                  // with one observation would otherwise read complete beside its own "1 of 2".
                  {
                    label: "Delivery proof",
                    complete: deliverables.length > 0 && deliverables.every((deliverable) => (
                      deliverable.state === "delivered"
                      && deliverable.deliveredQuantity >= deliverable.requirement.requiredQuantity
                    ))
                  }
                ];
                return (
                  <article key={sponsor.id}>
                    <div className="sponsor-hub-sponsor-name">
                      <span>{sponsorInitials(sponsor.name)}</span>
                      <div><strong>{sponsor.name}</strong><small>{checks.filter((check) => check.complete).length} of {checks.length} evidence checks</small></div>
                    </div>
                    <div>
                      {checks.map((check) => (
                        <span className={check.complete ? "is-complete" : ""} key={check.label}>
                          <Check aria-hidden="true" size={14} /> {check.label}
                        </span>
                      ))}
                    </div>
                    {deliverables.length ? (
                      <ul className="sponsor-hub-deliverables">
                        {deliverables.map((deliverable) => (
                          <li key={deliverable.requirement.id}>
                            <div>
                              <strong>{deliverable.requirement.label}</strong>
                              <small>
                                {sponsorDeliverableStateLabel(deliverable.state)}
                                {deliverable.state === "delivered" && deliverable.deliveredAt
                                  ? ` · first observed ${new Date(deliverable.deliveredAt).toLocaleDateString()}`
                                  : ""}
                                {deliverable.state === "blocked" && deliverable.requirement.blockedReason
                                  ? ` · ${deliverable.requirement.blockedReason}`
                                  : ""}
                              </small>
                            </div>
                            <span
                              className={deliverable.state === "delivered" ? "is-complete" : ""}
                              data-deliverable-state={deliverable.state}
                            >
                              {deliverable.evidence.length} of {deliverable.requirement.requiredQuantity} observed
                            </span>
                            <button
                              type="button"
                              className="secondary"
                              disabled={!initialData.isSupabaseBacked}
                              onClick={() => openEvidenceCapture(deliverable)}
                            >
                              Record evidence
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="sponsor-hub-note">
                        No promised benefits are on record for this sponsor, so nothing is reported as scheduled or delivered.
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
            {!initialData.programSummaries.length && sponsors.length ? (
              <p className="sponsor-hub-note">{initialData.programMessage}</p>
            ) : null}
            {evidenceDraft ? (
              <form
                className="sponsor-hub-evidence-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  submitEvidence();
                }}
              >
                <h3>Record evidence for {evidenceDraft.requirementLabel}</h3>
                <p>Record what already ran. A scheduled placement is not delivery until someone observes it.</p>
                <label>
                  Evidence type
                  <select
                    value={evidenceDraft.kind}
                    onChange={(event) => setEvidenceDraft({
                      ...evidenceDraft,
                      kind: event.target.value as SponsorFulfillmentEvidenceKind
                    })}
                  >
                    {Object.entries(evidenceKindLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Observed on
                  <input
                    type="datetime-local"
                    max={localDateTimeValue(new Date())}
                    value={evidenceDraft.observedAt}
                    onChange={(event) => setEvidenceDraft({ ...evidenceDraft, observedAt: event.target.value })}
                  />
                </label>
                {artifactBackedEvidenceKinds.has(evidenceDraft.kind) ? (
                  <label>
                    HTTPS artifact link
                    <input
                      type="url"
                      placeholder="https://"
                      value={evidenceDraft.artifactUrl}
                      onChange={(event) => setEvidenceDraft({ ...evidenceDraft, artifactUrl: event.target.value })}
                    />
                  </label>
                ) : (
                  <label>
                    What was observed
                    <textarea
                      rows={3}
                      value={evidenceDraft.note}
                      onChange={(event) => setEvidenceDraft({ ...evidenceDraft, note: event.target.value })}
                    />
                  </label>
                )}
                <div className="sponsor-hub-evidence-actions">
                  <button type="submit" disabled={isPending}>Save evidence</button>
                  <button type="button" className="secondary" onClick={() => setEvidenceDraft(null)}>Cancel</button>
                </div>
                {evidenceMessage ? <p role="status">{evidenceMessage}</p> : null}
              </form>
            ) : null}
            {!sponsors.length ? <SponsorEmpty onAdd={() => openSponsorEditor()} /> : null}
          </article>
          <aside className="sponsor-hub-panel sponsor-hub-boundary-card">
            <ShieldCheck aria-hidden="true" size={24} />
            <h2>Proof before promises</h2>
            <p>Placement settings do not prove a banner, email mention, or event sign was delivered.</p>
            <p>A deliverable reports as delivered only where someone recorded an observation of it running.</p>
            <strong>Player and family data are never included.</strong>
          </aside>
        </section>
      ) : null}

      {view === "reports" ? (
        <section className="sponsor-hub-workspace">
          <article className="sponsor-hub-panel sponsor-hub-report-card">
            <header>
              <div><h2>Sponsor summary</h2><p>Export the verified records available today.</p></div>
              <button type="button" onClick={() => downloadSponsorCsv(sponsors)} disabled={!sponsors.length}><Download aria-hidden="true" size={17} /> Download CSV</button>
            </header>
            <dl>
              <div><dt>Sponsors</dt><dd>{sponsors.length}</dd></div>
              <div><dt>Active public placements</dt><dd>{sponsors.filter((sponsor) => sponsor.status === "active" && sponsor.placementKey).length}</dd></div>
              <div><dt>Logos on file</dt><dd>{sponsors.filter((sponsor) => sponsor.logoUrl).length}</dd></div>
              <div><dt>Fully paid sponsor programs</dt><dd>{paymentTruthKnown ? paidProgramSummaries.length : "Unavailable"}</dd></div>
              <div><dt>Deliverables proven by evidence</dt><dd>{initialData.isSupabaseBacked ? provenDeliverableCount : "Unavailable"}</dd></div>
              <div><dt>Verified impact events</dt><dd>0</dd></div>
            </dl>
            <p className="sponsor-hub-note">PDF impact reports remain unavailable until benefits, proof files, and privacy-safe engagement events have durable records.</p>
          </article>
          <aside className="sponsor-hub-panel sponsor-hub-renewal">
            <Mail aria-hidden="true" size={24} />
            <h2>Renewal outreach</h2>
            <p>Renewal email delivery is not connected from this hub.</p>
            <button type="button" className="secondary" disabled>Send renewal email</button>
            <small>Provider delivery requires consent, review, and delivery logs.</small>
          </aside>
        </section>
      ) : null}

      {editorOpen ? (
        <div className="sponsor-hub-editor-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeSponsorEditor();
        }}>
          <form
            className="sponsor-hub-editor"
            ref={editorRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="sponsor-editor-title"
            aria-describedby="sponsor-editor-message"
            onSubmit={(event) => {
              event.preventDefault();
              saveSponsor();
            }}
          >
            <header>
              <div>
                <span>{draft.id === "new" ? "New sponsor" : "Sponsor record"}</span>
                <h2 id="sponsor-editor-title">{draft.id === "new" ? "Add a local partner" : `Edit ${draft.name}`}</h2>
              </div>
              <button type="button" className="secondary" onClick={closeSponsorEditor} aria-label="Close sponsor editor">Close</button>
            </header>
            <div className="sponsor-hub-form">
              <label>Business name<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} autoFocus /></label>
              <label>Website<input value={draft.url} onChange={(event) => setDraft({ ...draft, url: event.target.value })} placeholder="https://business.example" inputMode="url" /></label>
              <label>Package level<select value={draft.level} onChange={(event) => setDraft({ ...draft, level: event.target.value as Sponsor["level"] })}>
                <option value="league">League sponsor</option><option value="team">Team sponsor</option>
              </select></label>
              <label>Status<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as Sponsor["status"] })}>
                <option value="pending">Setup</option><option value="active">Active</option><option value="expired">Past season</option>
              </select></label>
              {draft.level === "team" ? (
                <label>Team<select value={draft.teamId} onChange={(event) => setDraft({ ...draft, teamId: event.target.value })}>
                  {initialData.teams.map((team) => <option value={team.id} key={team.id}>{team.name}</option>)}
                </select></label>
              ) : null}
              <label>Recognition placement<select value={draft.placementKey} onChange={(event) => setDraft({ ...draft, placementKey: event.target.value as SponsorDraft["placementKey"] })}>
                <option value="none">Not selected</option>
                {Object.entries(placementLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
              </select></label>
              <label className="sponsor-hub-form-wide">New logo URL for review<input value={draft.logoUrl} onChange={(event) => setDraft({ ...draft, logoUrl: event.target.value })} placeholder="https://business.example/logo.png" inputMode="url" /></label>
            </div>
            <p
              id="sponsor-editor-message"
              className={`sponsor-hub-form-message ${message.includes("saved") ? "is-success" : ""}`}
              role="status"
            >
              {message || "Required fields: business name and HTTPS website. New logos remain pending until reviewed."}
            </p>
            <footer>
              <button type="button" className="secondary" onClick={closeSponsorEditor}>Cancel</button>
              <button type="submit" disabled={isPending}>{isPending ? "Saving..." : "Save sponsor"}</button>
            </footer>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function sponsorSubStatuses(sponsor: Sponsor, paidSponsorIds: Set<string>, billingKnown: boolean): string[] {
  if (sponsor.status === "expired") return [];
  const waiting: string[] = [];
  if (!sponsor.logoUrl) waiting.push("Awaiting logo");
  if (billingKnown && !paidSponsorIds.has(sponsor.id)) waiting.push("Awaiting payment proof");
  return waiting;
}

function SponsorRoster({
  sponsors,
  teams,
  onEdit,
  paidSponsorIds,
  billingKnown
}: {
  sponsors: Sponsor[];
  teams: Team[];
  onEdit: (sponsor: Sponsor) => void;
  paidSponsorIds: Set<string>;
  billingKnown: boolean;
}) {
  if (!sponsors.length) return <SponsorEmpty />;
  return (
    <div className="sponsor-hub-roster-list">
      {sponsors.map((sponsor) => {
        const waiting = sponsorSubStatuses(sponsor, paidSponsorIds, billingKnown);
        return (
          <button type="button" key={sponsor.id} onClick={() => onEdit(sponsor)}>
            <span className="sponsor-hub-logo">{sponsorInitials(sponsor.name)}</span>
            <span className="sponsor-hub-roster-name">
              <strong>{sponsor.name}</strong>
              <small>{sponsor.level === "team" ? teams.find((team) => team.id === sponsor.teamId)?.name ?? "Team sponsor" : "League sponsor"}</small>
              {waiting.length ? (
                <span className="sponsor-hub-substatus">
                  {waiting.map((label) => <span key={label}>{label}</span>)}
                </span>
              ) : null}
            </span>
            <span className={`sponsor-hub-status is-${sponsor.status}`}>{statusLabel(sponsor.status)}</span>
            <span className="sponsor-hub-placement">{sponsor.placementKey ? placementLabels[sponsor.placementKey] : "Placement needed"}</span>
            <ChevronRight aria-hidden="true" size={18} />
          </button>
        );
      })}
    </div>
  );
}

function SponsorEmpty({ onAdd }: { onAdd?: () => void }) {
  return (
    <div className="sponsor-hub-empty">
      <Building2 aria-hidden="true" size={25} />
      <strong>No sponsor records match this view.</strong>
      <p>Add a local business or clear the current search and filter.</p>
      {onAdd ? <button type="button" onClick={onAdd}><Plus aria-hidden="true" size={17} /> Add sponsor</button> : null}
    </div>
  );
}
