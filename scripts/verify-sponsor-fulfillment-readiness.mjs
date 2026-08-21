#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const DEFAULT_SOURCE_FILES = {
  self: "scripts/verify-sponsor-fulfillment-readiness.mjs",
  packageJson: "package.json",

  domainContracts: "lib/domain/contracts.ts",
  sponsorPlacementDomain: "lib/domain/sponsors.ts",
  moneySponsorsDomain: "lib/domain/money-sponsors.ts",
  sponsorProgramDomain: "lib/domain/sponsor-program.ts",

  sponsorAdapter: "lib/supabase/sponsors.ts",
  sponsorProgramAdapter: "lib/supabase/sponsor-program.ts",
  sponsorProgramAdapterTest: "lib/supabase/sponsor-program.test.ts",
  sponsorEvidenceRoute: "app/api/admin/sponsors/evidence/route.ts",
  sponsorFulfillmentMigration: "supabase/migrations/20260819190000_sponsor_fulfillment_evidence.sql",
  sponsorDeliverableDerivationTest: "lib/domain/__tests__/sponsor-fulfillment-derivation.test.ts",
  rlsPolicyTest: "supabase/rls-policy.test.ts",
  sponsorFulfillmentInvariants: "supabase/sponsor-fulfillment-invariants.sql",
  sponsorFulfillmentCaptureMigration: "supabase/migrations/20260819210000_sponsor_fulfillment_evidence_capture.sql",
  demoTenantSeed: "scripts/bootstrap-demo-tenant.mjs",
  sponsorOperations: "lib/supabase/operations.ts",
  sponsorRoute: "app/api/admin/sponsors/route.ts",
  revenueSummaryRoute: "app/api/admin/revenue-summary/route.ts",

  sponsorHub: "components/sponsor-hub.tsx",
  sponsorHubTest: "components/sponsor-hub.test.tsx",
  roleDashboardExperiences: "components/role-dashboard-experiences.tsx",
  featurePanels: "components/feature-panels.tsx",
  featurePanelsTest: "components/feature-panels.test.tsx",
  sponsorsTest: "lib/supabase/sponsors.test.ts",
  sponsorOperationsTest: "lib/supabase/sponsor-operations.test.ts",
  publicSponsorsPage: "app/sponsors/page.tsx",
  routesSmokeTest: "app/routes-smoke.test.ts",
  apiLiveActionsTest: "app/api-live-actions.test.ts",

  featuresDocs: "docs/Features.md",
  capabilityMatrix: "docs/capability-matrix.md",
  runbook: "docs/runbook.md",
  workPlan: "docs/missing-production-slices-work-plan.md",
  taskBoard: "docs/production-task-board.md"
};

const DOC_KEYS = ["runbook", "workPlan", "taskBoard"];

export const OPEN_GATES = [
  "hosted public/admin browser proof",
  "hosted fulfillment evidence proof",
  "observed placement-rendering proof",
  "approved logo asset proof",
  "sponsor recap/report artifact proof",
  "renewal email sandbox proof",
  "public placement leak QA",
  "accessibility proof",
  "finance reconciliation",
  "production sponsor acceptance"
];

function combined(sources, keys) {
  return keys.map((key) => sources[key] ?? "").join("\n\n");
}

function fileLabels(keys) {
  return keys.map((key) => DEFAULT_SOURCE_FILES[key] ?? key);
}

function addBlocker(blockers, family, code, keys, message) {
  blockers.push({
    family,
    code,
    paths: fileLabels(keys),
    message
  });
}

function requirePattern(blockers, sources, family, code, keys, pattern, message) {
  const text = combined(sources, keys);
  const patterns = Array.isArray(pattern) ? pattern : [pattern];
  const ok = patterns.every((item) => typeof item === "string" ? text.includes(item) : item.test(text));
  if (!ok) addBlocker(blockers, family, code, keys, message);
}

function requireNoPattern(blockers, sources, family, code, keys, pattern, message) {
  const text = combined(sources, keys);
  if (pattern.test(text)) addBlocker(blockers, family, code, keys, message);
}

export function readRepositorySources(rootDir = process.cwd(), sourceFiles = DEFAULT_SOURCE_FILES) {
  return Object.fromEntries(
    Object.entries(sourceFiles).map(([key, relativePath]) => [
      key,
      readFileSync(resolve(rootDir, relativePath), "utf8")
    ])
  );
}

function verifyVerifierExecutionBoundary(sources, blockers) {
  requirePattern(
    blockers,
    sources,
    "verifier-execution-boundary",
    "PACKAGE_SCRIPT_MISSING",
    ["packageJson"],
    '"qa:sponsor-fulfillment-readiness": "node scripts/verify-sponsor-fulfillment-readiness.mjs"',
    "package.json must expose qa:sponsor-fulfillment-readiness as a node-only local verifier."
  );
  requirePattern(
    blockers,
    sources,
    "verifier-execution-boundary",
    "REPOSITORY_FILE_READER_MISSING",
    ["self"],
    /readFileSync\(resolve\(rootDir, relativePath\), "utf8"\)/s,
    "The verifier must read repository files directly instead of reaching hosted services."
  );
  requireNoPattern(
    blockers,
    sources,
    "verifier-execution-boundary",
    "MUTATING_OR_NETWORK_CAPABILITY_PRESENT",
    ["self"],
    /from "node:(?:child_process|http|https|net|tls)"/s,
    "The verifier script must not include network, provider, Supabase, Stripe, browser, or file-mutation capabilities."
  );
}

function verifyPlacementAuthority(sources, blockers) {
  requirePattern(
    blockers,
    sources,
    "placement-authority",
    "PLACEMENT_KEYS_AND_ACTIVE_FILTERS_MISSING",
    ["domainContracts", "sponsorPlacementDomain"],
    [
      'SPONSOR_PLACEMENT_KEYS = ["team_portal", "weekly_digest", "storybook", "registration", "field_map"] as const',
      'sponsor.status === "active" && sponsor.placementKey === placementKey',
      'getSponsorPlacement(sponsors, "team_portal").filter((sponsor) => !sponsor.teamId || sponsor.teamId === teamId)',
      'getSponsorPlacement(sponsors, "weekly_digest")',
      'getSponsorPlacement(sponsors, "field_map")',
      'getSponsorPlacement(sponsors, "registration")'
    ],
    "Sponsor placement helpers must filter to active sponsors and exact approved placement keys, with team portal placement constrained by team scope."
  );
  requirePattern(
    blockers,
    sources,
    "placement-authority",
    "ADMIN_PLACEMENT_ROUTE_VALIDATION_MISSING",
    ["sponsorRoute"],
    /placementKeys = new Set\(\["team_portal", "weekly_digest", "storybook", "registration", "field_map"\]\)[\s\S]*placementKey && !placementKeys\.has\(placementKey\)[\s\S]*Unsupported sponsor level, status, or placement/s,
    "Admin sponsor route must reject unsupported placement keys before saveSponsor is called."
  );
  requirePattern(
    blockers,
    sources,
    "placement-authority",
    "ADMIN_SAVE_AUTHORITY_AND_TEAM_SCOPE_MISSING",
    ["sponsorOperations", "sponsorOperations"],
    /requireActiveOrganizationAdmin\(\{[\s\S]*action:\s*"manage sponsors"[\s\S]*\.from\("sponsors"\)[\s\S]*\.eq\("id", input\.sponsorId\)[\s\S]*\.eq\("organization_id", input\.organizationId\)[\s\S]*The sponsor record could not be found in this organization\.[\s\S]*\.from\("teams"\)[\s\S]*\.eq\("id", input\.teamId!\)[\s\S]*\.eq\("organization_id", input\.organizationId\)[\s\S]*Team sponsors require a team from the same organization/s,
    "Admin save operations must require active organization-admin authority and reject cross-organization sponsor or team assignments."
  );
  requirePattern(
    blockers,
    sources,
    "placement-authority",
    "PLACEMENT_AUTHORITY_TESTS_MISSING",
    ["sponsorOperationsTest", "apiLiveActionsTest"],
    /rejects a caller-supplied sponsor ID from another organization before upsert[\s\S]*rejects a team sponsor whose team belongs to another organization[\s\S]*uses the authenticated admin session for sponsor saves/s,
    "Focused tests must cover wrong-organization sponsor IDs, wrong-organization team assignment, and session-derived admin writes."
  );
}

function verifyLogoAssetSafety(sources, blockers) {
  requirePattern(
    blockers,
    sources,
    "logo-asset-safety",
    "APPROVED_LOGO_READS_MISSING",
    ["sponsorAdapter", "sponsorsTest"],
    /sponsor_assets[\s\S]*\.select\("sponsor_id,url,status,created_at"\)[\s\S]*\.eq\("asset_type", "logo"\)[\s\S]*\.eq\("status", "approved"\)[\s\S]*logoBySponsorId\.set\(asset\.sponsor_id, asset\.url\)[\s\S]*logoUrl: logoBySponsorId\.get\(sponsor\.id\)/s,
    "Supabase sponsor reads must expose only approved logo assets as public logoUrl values."
  );
  requirePattern(
    blockers,
    sources,
    "logo-asset-safety",
    "SUBMITTED_LOGO_REVIEW_QUEUE_MISSING",
    ["sponsorOperations", "sponsorHub", "sponsorHubTest"],
    /sponsor_assets[\s\S]*asset_type: "logo"[\s\S]*url: logoUrl[\s\S]*status: "pending"[\s\S]*new logo remains pending review[\s\S]*logoUrl: undefined[\s\S]*New logo URL for review[\s\S]*New logos remain pending until reviewed/s,
    "Submitted logo URLs must remain pending review inputs and must not be returned as approved public logo assets."
  );
  requirePattern(
    blockers,
    sources,
    "logo-asset-safety",
    "FAIL_CLOSED_AND_FALLBACK_STATES_MISSING",
    ["sponsorAdapter", "sponsorHub", "sponsorHubTest"],
    /(?=[\s\S]*No preview rows are editable)(?=[\s\S]*Sponsor placement, reviewed-logo, or payment-proof records could not be loaded safely)(?=[\s\S]*Sponsor data unavailable)(?=[\s\S]*Live organization records are required before sponsor changes can be saved)(?=[\s\S]*Reviewed logo on file)(?=[\s\S]*Payment proof is unavailable)(?=[\s\S]*fails closed without editable seed rows)/s,
    "Unavailable sponsor data must fail closed without restoring editable seed rows, and the UI must show clear missing-artwork/evidence states."
  );
}

function verifyFulfillmentRecapSeparation(sources, blockers) {
  requirePattern(
    blockers,
    sources,
    "fulfillment-recap-separation",
    "SPONSOR_HUB_FULFILLMENT_SEPARATION_MISSING",
    ["sponsorHub", "sponsorHubTest"],
    /paidProgramSummaries[\s\S]*summary\.paymentState === "paid" && summary\.outstandingCents === 0[\s\S]*Reviewed logo on file[\s\S]*Public placement selected[\s\S]*Delivery proof"[\s\S]*deliverable\.state === "delivered"[\s\S]*deliverable\.deliveredQuantity >= deliverable\.requirement\.requiredQuantity[\s\S]*Active public placements[\s\S]*sponsor\.status === "active" && sponsor\.placementKey[\s\S]*Fully paid sponsor programs[\s\S]*Verified impact events[\s\S]*<dd>0<\/dd>[\s\S]*PDF impact reports remain unavailable/s,
    "Sponsor Hub must keep configured placement, reviewed logo metadata, delivered-placement proof, payment proof, and zero verified impact separate."
  );
  requirePattern(
    blockers,
    sources,
    "fulfillment-recap-separation",
    "COMMUNITY_LEDGER_BOUNDARY_MISSING",
    ["roleDashboardExperiences", "featurePanels"],
    /Record, placement, public recap inventory, and billing evidence remain separate[\s\S]*Logo asset[\s\S]*Approved public recap inventory[\s\S]*does not prove payment, contract execution, placement delivery, or sponsor-attributed impact[\s\S]*Sponsor program records[\s\S]*Agreement, invoice, and folded payment state are admin-only records[\s\S]*Public sponsor placement does not depend on or reveal payment state/s,
    "Admin ledger and revenue surfaces must keep configured placement, recap inventory, logo metadata, billing evidence, and unproven impact separate."
  );
  requirePattern(
    blockers,
    sources,
    "fulfillment-recap-separation",
    "REVENUE_AND_IMPACT_READ_MODELS_MISSING",
    ["moneySponsorsDomain", "revenueSummaryRoute", "apiLiveActionsTest"],
    /Revenue dashboard separates receivables, sponsor invoice readiness, and payment proof[\s\S]*Browser return or public placement is not settlement[\s\S]*confirmedSponsorPaymentCents[\s\S]*confirmed payment totals also require paid proof and a provider-confirmed timestamp[\s\S]*sponsorOpportunities: \[\][\s\S]*No opportunity suggestions are returned without organization-scoped schedule, registration, snack, and media evidence/s,
    "Revenue summaries must separate billing proof from placement and avoid converting missing impact evidence into report or opportunity claims."
  );
}

function verifyFulfillmentEvidenceDerivation(sources, blockers) {
  requirePattern(
    blockers,
    sources,
    "fulfillment-evidence-derivation",
    "EVIDENCE_TABLES_OR_SCOPE_MISSING",
    ["sponsorFulfillmentMigration", "rlsPolicyTest"],
    [
      "create table if not exists public.sponsor_fulfillment_requirements",
      "create table if not exists public.sponsor_fulfillment_evidence",
      "organization admins read sponsor fulfillment requirements",
      "organization admins read sponsor fulfillment evidence",
      "revoke all on table public.sponsor_fulfillment_requirements from public, anon, authenticated",
      "revoke all on table public.sponsor_fulfillment_evidence from public, anon, authenticated",
      "grant select, insert on table public.sponsor_fulfillment_evidence to service_role"
    ],
    "Fulfillment requirement and evidence tables must exist with organization-scoped RLS, revoked public/anon/authenticated write access, and append-only evidence grants."
  );
  requireNoPattern(
    blockers,
    sources,
    "fulfillment-evidence-derivation",
    "STORED_DELIVERABLE_STATE_PRESENT",
    ["sponsorFulfillmentMigration"],
    /\b(?:delivery_state|deliverable_state|fulfillment_status|delivered_quantity|delivered_at|is_delivered)\b/s,
    "No fulfillment table may store a deliverable state, delivered count, or delivered timestamp; delivery is folded from evidence rows on read."
  );
  requirePattern(
    blockers,
    sources,
    "fulfillment-evidence-derivation",
    "DERIVATION_INVARIANT_MISSING",
    ["sponsorProgramDomain"],
    [
      "export function deriveDeliverableState(",
      'if (requirement.blockedAt) return "blocked";',
      'if (requirementEvidence.length > 0) return "delivered";'
    ],
    "deriveDeliverableState must return delivered from the evidence branch alone, with a block overriding it."
  );
  requireNoPattern(
    blockers,
    sources,
    "fulfillment-evidence-derivation",
    "UNPROVEN_DELIVERED_WRITE_PRESENT",
    ["sponsorProgramAdapter", "sponsorEvidenceRoute"],
    /(?:status|state):\s*"delivered"/s,
    "No adapter or route may write a delivered state; recording evidence is the only path to a delivered deliverable."
  );
  requirePattern(
    blockers,
    sources,
    "fulfillment-evidence-derivation",
    "EVIDENCE_CAPTURE_AUTHORITY_MISSING",
    ["sponsorProgramAdapter", "sponsorEvidenceRoute", "sponsorFulfillmentCaptureMigration"],
    [
      "record_sponsor_fulfillment_evidence",
      // Authority is re-derived in SQL against the requirement's own organization, which binds any
      // caller of the function rather than only the adapter that usually calls it.
      /membership\.role = 'admin'[\s\S]*membership\.status = 'active'/s,
      "cannot be observed in the future",
      "sponsor_fulfillment_evidence_captured",
      /actorUserId: auth\.user\.id/s
    ],
    "Evidence capture must derive the actor from the session, re-derive active organization-admin authority in SQL against the requirement's own organization, reject future observations, and write an audit event."
  );
  requirePattern(
    blockers,
    sources,
    "fulfillment-evidence-derivation",
    "EVIDENCE_CAPTURE_NOT_ATOMIC",
    ["sponsorFulfillmentCaptureMigration"],
    [
      "unique nulls not distinct (requirement_id, kind, observed_at, artifact_url, note)",
      "on conflict on constraint uq_sponsor_fulfillment_evidence_observation do nothing",
      /insert into public\.sponsor_fulfillment_evidence[\s\S]*insert into public\.audit_events/s
    ],
    "Evidence and its audit event must be written in one transaction, and a replayed capture must fold onto the observation already recorded. Delivered quantity counts evidence rows, so an unguarded retry can satisfy a promised quantity it did not meet."
  );
  requireNoPattern(
    blockers,
    sources,
    "fulfillment-evidence-derivation",
    "EVIDENCE_EXISTENCE_ORACLE_PRESENT",
    ["sponsorFulfillmentCaptureMigration"],
    /could not be found/s,
    "A caller without authority must not be able to tell a missing requirement from one it may not touch; both answer with the same forbidden result."
  );
  requirePattern(
    blockers,
    sources,
    "fulfillment-evidence-derivation",
    "EVIDENCE_ORDERING_MISSING",
    ["sponsorProgramAdapter", "sponsorProgramDomain"],
    [
      /\.order\("observed_at", \{ ascending: true \}\)[\s\S]*\.order\("id", \{ ascending: true \}\)/s,
      /left\.observedAt === right\.observedAt[\s\S]*left\.id\.localeCompare\(right\.id\)/s
    ],
    "Evidence must be read and folded in observation order with a deterministic id tiebreak."
  );
  // These three checks exist because the 2026-08-19 Codex review found this verifier passing while
  // the append-only guarantee it reports on was absent from the migration. A source-pattern verifier
  // can only catch what it is told to look for.
  requirePattern(
    blockers,
    sources,
    "fulfillment-evidence-derivation",
    "EVIDENCE_APPEND_ONLY_MISSING",
    ["sponsorFulfillmentMigration"],
    [
      "create or replace function public.sponsor_fulfillment_evidence_append_only()",
      /create trigger sponsor_fulfillment_evidence_append_only\s+before update or delete on public\.sponsor_fulfillment_evidence/s,
      "revoke update, delete on table public.sponsor_fulfillment_evidence from service_role"
    ],
    "Evidence must be append-only against every writer: a grant is additive, so service_role's default update and delete must be revoked explicitly and a before-update-or-delete trigger must bind the table owner as well."
  );
  requirePattern(
    blockers,
    sources,
    "fulfillment-evidence-derivation",
    "TENANT_COMPOSITE_KEY_MISSING",
    ["sponsorFulfillmentMigration"],
    [
      "add constraint uq_sponsorship_agreements_id_organization unique (id, organization_id)",
      /foreign key \(agreement_id, organization_id\)\s+references public\.sponsorship_agreements\(id, organization_id\)/s,
      /foreign key \(requirement_id, organization_id\)\s+references public\.sponsor_fulfillment_requirements\(id, organization_id\)/s
    ],
    "Requirement and evidence rows must be tied to their parent's organization by composite foreign key; an RLS policy that trusts a child row's own organization_id is unbacked against a writer that bypasses RLS."
  );
  requireNoPattern(
    blockers,
    sources,
    "fulfillment-evidence-derivation",
    "UNSTRUCTURED_PACKAGE_BENEFITS_PRESENT",
    ["demoTenantSeed"],
    /benefits:\s*\[\s*"/s,
    "Package benefits must be written as structured objects carrying a requirement kind. A benefit stored as a plain string generates no fulfillment requirement, so the package promises something no deliverable can be derived from."
  );
  requirePattern(
    blockers,
    sources,
    "fulfillment-evidence-derivation",
    "INVARIANT_QUERY_MISSING",
    ["sponsorFulfillmentInvariants"],
    [
      "table_name in ('sponsor_fulfillment_requirements', 'sponsor_fulfillment_evidence')",
      "stored deliverable state",
      "future observation",
      "cross-organization evidence"
    ],
    "A read-only invariant query file must assert that no deliverable state is stored, that no evidence is dated in the future, and that evidence never crosses a tenant boundary."
  );
  requirePattern(
    blockers,
    sources,
    "fulfillment-evidence-derivation",
    "EVIDENCE_DERIVATION_TESTS_MISSING",
    ["sponsorDeliverableDerivationTest", "sponsorProgramAdapterTest"],
    [
      "never reports delivered without an evidence row",
      "lets a block override evidence",
      "refuses evidence observed in the future",
      "refuses fulfillment evidence from a user who is not an active organization admin",
      "refuses fulfillment evidence against another organization's requirement"
    ],
    "Executed tests must prove delivered is unreachable without evidence, that a block overrides it, and that unauthorized, cross-organization, or future evidence is refused."
  );
}

function verifyRenewalDeliveryGates(sources, blockers) {
  requirePattern(
    blockers,
    sources,
    "renewal-delivery-gates",
    "RENEWAL_HUMAN_REVIEW_AND_PROVIDER_GATE_MISSING",
    ["sponsorHub", "sponsorOperations", "featuresDocs"],
    /ready for renewal review[\s\S]*Prepare a human-reviewed renewal request for the next season[\s\S]*Renewal email delivery is not connected[\s\S]*<button type="button" className="secondary" disabled>Send renewal email<\/button>[\s\S]*Provider delivery requires consent, review, and delivery logs[\s\S]*No Stripe or renewal-provider call occurred[\s\S]*renewal email remain gated behind server-side provider configuration, consent, review, and delivery evidence/s,
    "Renewal email must remain human-reviewed and disconnected from provider sends until provider sandbox, consent, and delivery-log proof are complete."
  );
}

function verifyPublicParentPrivacy(sources, blockers) {
  requirePattern(
    blockers,
    sources,
    "public-parent-privacy",
    "PUBLIC_SPONSOR_PRIVACY_COPY_MISSING",
    ["publicSponsorsPage", "routesSmokeTest", "featuresDocs"],
    /Public sponsor placement never includes child profiles, parent contact details,\s*private media, billing state, or claims of delivered impact[\s\S]*not by this public page[\s\S]*keeps the public sponsor page informational and proof-safe[\s\S]*exposes no child profiles, parent contacts, private media, billing state, checkout, contract, placement-delivery, or impact proof/s,
    "/sponsors must remain informational and must not expose private family, billing, fulfillment, redemption, or impact proof."
  );
  requirePattern(
    blockers,
    sources,
    "public-parent-privacy",
    "TEAM_PORTAL_AND_PARENT_PRIVACY_MISSING",
    ["featurePanels", "moneySponsorsDomain", "capabilityMatrix"],
    /audience === "parent" \? \[\] : state\.sponsors\.filter[\s\S]*Local business pages show approved sponsor records, team schedule context, and community acknowledgments only\. They do not expose child profiles, parent contact data, private media, or payment state\.[\s\S]*never expose child profiles, parent contacts, private media, billing state, or redemption proof/s,
    "Team portal and parent-facing sponsor paths must avoid child profiles, parent contacts, private media, billing state, and redemption proof."
  );
  requireNoPattern(
    blockers,
    sources,
    "public-parent-privacy",
    "PUBLIC_FORBIDDEN_SPONSOR_ACTION_PRESENT",
    ["publicSponsorsPage"],
    /\b(?:checkout|donate|redeem|invoice|paymentProof|billingRecords|parentEmail|guardian|playerId|private media proof)\b/s,
    "The public sponsor page must not contain checkout, billing, redemption, child, parent-contact, or private-media proof actions."
  );
}

function verifyOpenGatesDocumentation(sources, blockers) {
  for (const gate of OPEN_GATES) {
    requirePattern(
      blockers,
      sources,
      "open-gates-documentation",
      `OPEN_GATE_${gate.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_MISSING`,
      DOC_KEYS,
      gate,
      `Docs must name ${gate} as an open gate beyond local repository readiness.`
    );
  }
  for (const key of DOC_KEYS) {
    requirePattern(
      blockers,
      sources,
      "open-gates-documentation",
      `LOCAL_ONLY_VERIFIER_${key.toUpperCase()}_MISSING`,
      [key],
      /(?=[\s\S]*qa:sponsor-fulfillment-readiness)(?=[\s\S]*local repository readiness proof only)(?=[\s\S]*does not call Supabase)(?=[\s\S]*sign in)(?=[\s\S]*run Playwright)(?=[\s\S]*send renewal email)(?=[\s\S]*call Stripe)(?=[\s\S]*production sponsor acceptance)/s,
      `${DEFAULT_SOURCE_FILES[key]} must describe qa:sponsor-fulfillment-readiness as local repository readiness proof only and preserve hosted/provider/finance/production gates.`
    );
  }
}

export function verifySponsorFulfillmentReadiness(sources) {
  const blockers = [];

  verifyVerifierExecutionBoundary(sources, blockers);
  verifyPlacementAuthority(sources, blockers);
  verifyLogoAssetSafety(sources, blockers);
  verifyFulfillmentRecapSeparation(sources, blockers);
  verifyFulfillmentEvidenceDerivation(sources, blockers);
  verifyRenewalDeliveryGates(sources, blockers);
  verifyPublicParentPrivacy(sources, blockers);
  verifyOpenGatesDocumentation(sources, blockers);

  return {
    ok: blockers.length === 0,
    blockers,
    families: [
      "verifier-execution-boundary",
      "placement-authority",
      "logo-asset-safety",
      "fulfillment-recap-separation",
      "fulfillment-evidence-derivation",
      "renewal-delivery-gates",
      "public-parent-privacy",
      "open-gates-documentation"
    ],
    openGates: OPEN_GATES,
    proofBoundary: "local repository-source readiness proof only"
  };
}

export function formatSponsorFulfillmentReadinessReport(result) {
  const lines = [
    "Sponsor fulfillment readiness verifier",
    `Status: ${result.ok ? "PASS" : "FAIL"}`,
    "Scope: local repository-source readiness proof only.",
    "This command reads repository files only and does not call Supabase, sign in, run Playwright, seed data, mutate hosted records, send renewal email, call providers, call Stripe, fetch logo assets, deploy, or claim hosted, observed-rendering, provider, finance, production, or accessibility acceptance."
  ];

  if (result.blockers.length) {
    lines.push("", "Named blockers:");
    for (const blocker of result.blockers) {
      lines.push(`- [${blocker.family}] ${blocker.code}: ${blocker.message}`);
      lines.push(`  Paths: ${blocker.paths.join(", ")}`);
    }
  } else {
    lines.push("", "No local source-contract blockers found.");
  }

  lines.push("", "Open gates not closed by this verifier:");
  for (const gate of result.openGates) lines.push(`- ${gate}`);

  return lines.join("\n");
}

function main() {
  const result = verifySponsorFulfillmentReadiness(readRepositorySources());
  console.log(formatSponsorFulfillmentReadinessReport(result));
  if (!result.ok) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
