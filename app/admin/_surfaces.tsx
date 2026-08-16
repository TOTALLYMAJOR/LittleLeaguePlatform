import Link from "next/link";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui/primitives";
import { AdminAdditionalGuardianClient } from "@/components/additional-guardian-access";
import { OfficialCommunicationWorkbench } from "@/components/official-communication-workbench";
import { AdminSeasonTransitionReview } from "@/components/season-transition-review";
import { TeamBuilderWorkbench } from "@/components/team-builder-workbench";
import {
  AdminDeliveryReviewClient,
  GameDayResolutionRoomClient,
  SeasonLaunchWizardClient
} from "@/components/coordination-workbenches";
import {
  AdminDashboardClient,
  AdminHealthClient,
  AdminInvitesClient,
  AdminTeamManagementClient,
  AdminThemesClient,
  MembershipAdminClient,
  RegistrationReviewClient,
  ScheduleAlertsClient
} from "@/components/feature-panels";
import type { AdminDashboardSurfaceMode } from "@/components/feature-panels";
import { listAdminOperationsData, type AdminOperationsData } from "@/lib/supabase/admin-operations";
import { listArchiveVaultData } from "@/lib/supabase/archive-vault";
import { listGuardianLinkRepairData } from "@/lib/supabase/guardian-links";
import { listAdminDrillVideoLibraryData } from "@/lib/supabase/drill-videos";
import { listMediaGovernanceData } from "@/lib/supabase/media-governance";
import { listAdminMembershipData } from "@/lib/supabase/memberships";
import { listRegistrationReviewData } from "@/lib/supabase/registration-approvals";
import { listRegistrationRequests } from "@/lib/supabase/registrations";
import {
  listGameDayResolutionEvidence,
  listGameDayResolutionReviews
} from "@/lib/supabase/game-day-resolution";
import { listOrganizationNotificationReceipts } from "@/lib/supabase/notification-receipts";
import { scopeScheduleOperationsData } from "@/lib/supabase/route-scopes";
import { listSeasonLaunchData } from "@/lib/supabase/season-launch";
import { listScheduleOperationsData } from "@/lib/supabase/schedule-management";
import { buildSecurityProofDashboard } from "@/lib/supabase/security-proof";
import { requireAdminPageAccess } from "@/lib/supabase/shell-access";
import { listSponsorAdminData } from "@/lib/supabase/sponsors";
import { listTenantReadinessData } from "@/lib/supabase/tenant-readiness";
import { listAdminThemeData } from "@/lib/supabase/team-branding";
import { listAdminTeamManagementData } from "@/lib/supabase/team-management";
import { seedState } from "@/lib/domain";
import { listAdminAdditionalGuardianData } from "@/lib/supabase/additional-guardians";
import { listOfficialCommunicationReviewData } from "@/lib/supabase/official-communications";
import { listAdminSeasonTransitions } from "@/lib/supabase/season-transitions";
import { listTeamBuilderWorkbenchData } from "@/lib/supabase/team-builder-plans";

export async function AdminAccessDeniedSurface({ message }: { message?: string } = {}) {
  return (
    <div className="page">
      <section className="hero">
        <span className="eyebrow">Admin access required</span>
        <h1>Organization admin access is required for this route.</h1>
        <p className="lead">{message ?? "Sign in with an active organization admin account before viewing league operations."}</p>
        <Link className="button" href="/auth">Open sign in</Link>
      </section>
    </div>
  );
}

export async function AdminDashboardSurface({ surface = "overview" }: { surface?: AdminDashboardSurfaceMode } = {}) {
  const pageAccess = await requireAdminPageAccess();
  if (!pageAccess.ok) return <AdminAccessDeniedSurface message={pageAccess.message} />;
  const organizationId = pageAccess.access.contexts?.find((context) => context.role === "admin")?.organizationId
    ?? pageAccess.access.adminOrganizationIds[0];
  if (!organizationId) {
    return <AdminAccessDeniedSurface message="An active organization context is required for admin operations." />;
  }
  const [registrationRequests, sponsorData, mediaData, drillVideoData] = await Promise.all([
    listRegistrationRequests(),
    listSponsorAdminData({ organizationId }),
    listMediaGovernanceData(),
    listAdminDrillVideoLibraryData({ organizationIds: pageAccess.access.adminOrganizationIds })
  ]);
  return <AdminDashboardClient registrationRequests={registrationRequests} sponsorData={sponsorData} mediaData={mediaData} drillVideoData={drillVideoData} surface={surface} />;
}

export async function AdminBrandingSurface() {
  const pageAccess = await requireAdminPageAccess();
  if (!pageAccess.ok) return <AdminAccessDeniedSurface message={pageAccess.message} />;
  const initialData = await listAdminThemeData();
  return <AdminThemesClient initialData={initialData} />;
}

export async function AdminFamilyAccessSurface() {
  const pageAccess = await requireAdminPageAccess();
  if (!pageAccess.ok) return <AdminAccessDeniedSurface message={pageAccess.message} />;
  const [data, additionalGuardianData] = await Promise.all([
    listGuardianLinkRepairData(),
    listAdminAdditionalGuardianData({
      actorUserId: pageAccess.access.userId ?? "",
      organizationIds: pageAccess.access.adminOrganizationIds
    })
  ]);

  return (
    <div className="page">
      <PageHeader
        eyebrow="Registration & Access"
        title="Family Access"
        subtitle="Repair missing parent-player links so families do not reach a dead end, and review who else may act for a child."
        actions={<StatusBadge
          label={data.missingLinks.length ? `${data.missingLinks.length} link${data.missingLinks.length === 1 ? "" : "s"} to repair` : "No links to repair"}
          variant={data.missingLinks.length ? "warning" : "success"}
        />}
      />
      <p className="notice">{data.message}</p>

      <section aria-labelledby="admin-missing-links-title" className="stack">
        <h2 id="admin-missing-links-title">Missing parent-player links</h2>
        {data.missingLinks.length ? (
          <>
            <p className="muted">
              {data.missingLinks.length} player record{data.missingLinks.length === 1 ? " has" : "s have"} no linked parent account.
              {" "}{data.parentOptions.length} parent account{data.parentOptions.length === 1 ? " is" : "s are"} available to match.
            </p>
            <div className="grid two">
              {data.missingLinks.map((link) => (
                <article className="card stack" key={link.playerId}>
                  <span className="eyebrow">{link.teamName}</span>
                  <h3>{link.playerName}</h3>
                  <p className="muted">Confirm the adult’s existing parent account and record what was verified before repairing this missing link.</p>
                </article>
              ))}
            </div>
          </>
        ) : (
          <EmptyState
            title="Every player has a linked parent"
            body="No repair is needed right now. New gaps appear here as registrations are approved and rosters change."
            action={<Link className="button secondary" href="/admin/registrations">Review registrations</Link>}
          />
        )}
      </section>

      <AdminAdditionalGuardianClient data={additionalGuardianData} />
    </div>
  );
}

export async function AdminSecurityAuditSurface() {
  const pageAccess = await requireAdminPageAccess();
  if (!pageAccess.ok) return <AdminAccessDeniedSurface message={pageAccess.message} />;
  const items = buildSecurityProofDashboard();
  const coveredItems = items.filter((item) => item.status === "covered");
  const openItems = items.filter((item) => item.status !== "covered");

  return (
    <div className="page">
      <PageHeader
        eyebrow="Trust & Safety"
        title="Security & Audit"
        subtitle="Confirm the RLS and audit boundaries that must stay green before live family use: cross-team denial, archived-season read-only behavior, guardian-scoped RSVP writes, and production audit events."
        actions={<StatusBadge
          label={openItems.length ? `${openItems.length} of ${items.length} not covered` : `All ${items.length} checks covered`}
          variant={openItems.length ? "warning" : "success"}
        />}
      />

      <section aria-labelledby="security-open-title" className="stack">
        <h2 id="security-open-title">Needs attention</h2>
        {openItems.length ? (
          <div className="grid two">
            {openItems.map((item) => (
              <article className="card stack" key={item.title}>
                <StatusBadge label={item.status} variant="warning" />
                <h3>{item.title}</h3>
                <p>{item.evidence}</p>
                <p className="muted">{item.source}</p>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No open security gaps"
            body="Every boundary check below has source-backed proof. Re-check after changing policies, roles, or migrations."
          />
        )}
      </section>

      <details className="compact-disclosure">
        <summary>
          <span>
            <strong>Covered checks</strong>
            <small>Boundaries with current source-backed proof.</small>
          </span>
          <span className="badge ok">{coveredItems.length} covered</span>
        </summary>
        <div className="grid two">
          {coveredItems.map((item) => (
            <article className="card stack" key={item.title}>
              <StatusBadge label={item.status} variant="success" />
              <h3>{item.title}</h3>
              <p>{item.evidence}</p>
              <p className="muted">{item.source}</p>
            </article>
          ))}
        </div>
      </details>
    </div>
  );
}

export async function AdminReportsArchiveSurface() {
  const pageAccess = await requireAdminPageAccess();
  if (!pageAccess.ok) return <AdminAccessDeniedSurface message={pageAccess.message} />;
  const data = await listArchiveVaultData();

  return (
    <div className="page">
      <PageHeader
        eyebrow="League Setup"
        title="Reports & Archive"
        subtitle="Archived seasons stay readable, exportable, and mutation-locked. Review what has been closed out and what proof backs it."
        actions={<StatusBadge
          label={`${data.archivedSeasons.length} archived season${data.archivedSeasons.length === 1 ? "" : "s"}`}
          variant="neutral"
        />}
      />
      <p className="notice">{data.message}</p>

      <section aria-labelledby="archived-seasons-title" className="stack">
        <h2 id="archived-seasons-title">Archived seasons</h2>
        {data.archivedSeasons.length ? (
          <div className="grid two">
            {data.archivedSeasons.map((season) => (
              <article className="card stack" key={season.id}>
                <span className="eyebrow">Archived season</span>
                <h3>{season.name}</h3>
                <p>{season.teamCount} team(s)</p>
                <p className="muted">{season.archivedAt ?? "No archive timestamp recorded"}</p>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No archived seasons yet"
            body="Seasons appear here after they are closed out. Current season records stay editable under Season Operations."
            action={<Link className="button secondary" href="/admin/teams">Open Teams</Link>}
          />
        )}
      </section>

      <details className="compact-disclosure">
        <summary>
          <span>
            <strong>Archive guarantees</strong>
            <small>What stays readable, exportable, and locked after a season closes.</small>
          </span>
          <span className="badge">{data.proof.length} records</span>
        </summary>
        <div className="grid two">
          {data.proof.map((item) => (
            <article className="card stack" key={item.label}>
              <h3>{item.label}</h3>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
      </details>
    </div>
  );
}

export async function AdminOperationsSurface() {
  const pageAccess = await requireAdminPageAccess();
  if (!pageAccess.ok) return <AdminAccessDeniedSurface message={pageAccess.message} />;
  const [data, scheduleData] = await Promise.all([
    listAdminOperationsData(),
    listScheduleOperationsData()
  ]);
  const scopedScheduleData = scopeScheduleOperationsData(
    scheduleData,
    pageAccess.access.adminTeamIds,
    "Showing schedule telemetry scoped to the signed-in admin's organizations."
  );
  return (
    <>
      <AdminOperationsView data={data} />
      <details className="compact-disclosure schedule-telemetry-disclosure">
        <summary><span><strong>Schedule and delivery telemetry</strong><small>Provider readiness, retry, device, alert, and schedule workflow evidence.</small></span><span className="badge">Operations evidence</span></summary>
        <ScheduleAlertsClient scheduleData={scopedScheduleData} mode="operations" />
      </details>
    </>
  );
}

export async function AdminCommunicationsSurface() {
  const pageAccess = await requireAdminPageAccess();
  if (!pageAccess.ok) return <AdminAccessDeniedSurface message={pageAccess.message} />;
  const [scheduleData, communicationData] = await Promise.all([
    listScheduleOperationsData(),
    listOfficialCommunicationReviewData({
      organizationIds: pageAccess.access.adminOrganizationIds
    })
  ]);
  const scopedScheduleData = scopeScheduleOperationsData(
    scheduleData,
    pageAccess.access.adminTeamIds,
    "Showing current events for the signed-in administrator's organizations."
  );
  const currentTeams = scopedScheduleData.teams.filter((team) => (
    (team.status ?? "active") === "active" &&
    (team.seasonStatus ?? "active") === "active"
  ));
  const currentTeamIds = new Set(currentTeams.map((team) => team.id));
  return (
    <OfficialCommunicationWorkbench
      events={scopedScheduleData.events.filter((event) => currentTeamIds.has(event.teamId))}
      teams={currentTeams}
      initialData={communicationData}
    />
  );
}

export function AdminOperationsView({ data }: { data: AdminOperationsData }) {
  const waitingQueues = data.approvalQueues.filter((item) => item.count > 0);
  const unconfiguredProviders = data.providerInventory.filter((item) => item.status !== "configured");

  return (
    <div className="page">
      <PageHeader
        eyebrow="League Setup"
        title="Settings & Providers"
        subtitle="Review organization settings, which delivery providers are connected, what is waiting on approval, and what has been recorded in the audit log."
        actions={<StatusBadge
          label={`${data.settings.activeSeasonName} - ${data.settings.activeSeasonStatus}`}
          variant={data.settings.activeSeasonStatus === "active" ? "success" : "neutral"}
        />}
      />
      <p className="notice">{data.message}</p>

      <section aria-labelledby="admin-queues-title" className="stack">
        <h2 id="admin-queues-title">Waiting on you</h2>
        {waitingQueues.length ? (
          <div className="grid two">
            {waitingQueues.map((item) => (
              <article className="card stack" key={item.queue}>
                <span className="eyebrow">{item.queue}</span>
                <h3>{item.count} waiting</h3>
                <p className="muted">{item.boundary}</p>
                <Link className="button secondary" href={item.actionHref}>Open queue</Link>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No approval queues are waiting"
            body="Registration, media, and delivery approvals appear here the moment something needs a decision."
          />
        )}
      </section>

      <section aria-labelledby="admin-providers-title" className="stack">
        <h2 id="admin-providers-title">Delivery providers</h2>
        <p className="muted">
          {unconfiguredProviders.length
            ? `${unconfiguredProviders.length} of ${data.providerInventory.length} providers still need configuration. Sends stay blocked until a provider is connected and approved.`
            : "Every provider is configured. Sends still require consent, approval, and delivery logs."}
        </p>
        <div className="grid two">
          {data.providerInventory.map((item) => (
            <article className="card stack" key={`${item.provider}-${item.channel}`}>
              <span className="eyebrow">{item.channel}</span>
              <h3>{item.provider}</h3>
              <span className={`badge ${item.status === "configured" ? "ok" : item.status === "missing" ? "warning" : ""}`}>{item.status}</span>
              <p className="muted">{item.boundary}</p>
            </article>
          ))}
        </div>
      </section>

      <details className="compact-disclosure">
        <summary>
          <span>
            <strong>Audit log</strong>
            <small>Recorded admin and provider-sensitive actions.</small>
          </span>
          <span className="badge">{data.auditLogs.length} events</span>
        </summary>
        <div className="stack">
          {data.auditLogs.map((item) => (
            <p key={item.id}>
              <strong>{item.action}</strong> <span className="muted">{item.targetType} - {new Date(item.createdAt).toLocaleString("en-US")}</span><br />
              {item.summary}
            </p>
          ))}
          {!data.auditLogs.length ? <p className="muted">No audit events available yet.</p> : null}
        </div>
      </details>
    </div>
  );
}

export async function AdminTeamsSurface() {
  const pageAccess = await requireAdminPageAccess();
  if (!pageAccess.ok) return <AdminAccessDeniedSurface message={pageAccess.message} />;
  const [data, teamBuilderData] = await Promise.all([
    listAdminTeamManagementData({
      organizationIds: pageAccess.access.adminOrganizationIds
    }),
    listTeamBuilderWorkbenchData({
      actorUserId: pageAccess.access.userId ?? "",
      organizationIds: pageAccess.access.adminOrganizationIds
    })
  ]);

  return (
    <div className="page">
      <PageHeader
        eyebrow="Season Operations"
        title="Teams"
        subtitle="Manage team records by organization, season, and division, then build rosters before families are invited."
        actions={<StatusBadge
          label={`${data.teams.length} team${data.teams.length === 1 ? "" : "s"}`}
          variant={data.teams.length ? "info" : "warning"}
        />}
      />
      <p className="notice">{data.message}</p>

      <AdminTeamManagementClient data={data} />

      <details className="compact-disclosure">
        <summary>
          <span>
            <strong>Divisions and seasons</strong>
            <small>Reference values that team records are assigned to.</small>
          </span>
          <span className="badge">{data.divisions.length} divisions - {data.seasons.length} seasons</span>
        </summary>
        <div className="grid two">
          <article className="card stack">
            <h3>Divisions</h3>
            {data.divisions.map((division) => <p key={division}>{division}</p>)}
            {!data.divisions.length ? <p className="muted">No divisions are recorded yet.</p> : null}
          </article>
          <article className="card stack">
            <h3>Seasons</h3>
            {data.seasons.map((season) => (
              <p key={season.id}><strong>{season.name}</strong><br /><span className="muted">{season.status}</span></p>
            ))}
            {!data.seasons.length ? <p className="muted">No seasons are recorded yet.</p> : null}
          </article>
        </div>
      </details>

      <TeamBuilderWorkbench initialData={teamBuilderData} />
    </div>
  );
}

export async function AdminRegistrationsSurface() {
  const pageAccess = await requireAdminPageAccess();
  if (!pageAccess.ok) return <AdminAccessDeniedSurface message={pageAccess.message} />;
  const data = await listRegistrationReviewData();
  return <RegistrationReviewClient initialData={data} />;
}

export async function AdminMembershipsSurface() {
  const pageAccess = await requireAdminPageAccess();
  if (!pageAccess.ok) return <AdminAccessDeniedSurface message={pageAccess.message} />;
  const data = await listAdminMembershipData();
  return <MembershipAdminClient initialData={data} />;
}

export async function AdminImportsSurface() {
  const pageAccess = await requireAdminPageAccess();
  if (!pageAccess.ok) return <AdminAccessDeniedSurface message={pageAccess.message} />;
  const data = await listSeasonLaunchData({
    organizationIds: pageAccess.access.adminOrganizationIds
  });
  return <SeasonLaunchWizardClient data={data} />;
}

export async function AdminInvitesSurface() {
  const pageAccess = await requireAdminPageAccess();
  if (!pageAccess.ok) return <AdminAccessDeniedSurface message={pageAccess.message} />;
  return <AdminInvitesClient />;
}

export async function AdminHealthSurface() {
  const pageAccess = await requireAdminPageAccess();
  if (!pageAccess.ok) return <AdminAccessDeniedSurface message={pageAccess.message} />;
  const [tenantReadinessData, transitionData] = await Promise.all([
    listTenantReadinessData({
      organizationIds: pageAccess.access.adminOrganizationIds
    }),
    listAdminSeasonTransitions(pageAccess.access.adminOrganizationIds)
  ]);
  return (
    <>
      <AdminHealthClient tenantReadinessData={tenantReadinessData} />
      <AdminSeasonTransitionReview data={transitionData} />
    </>
  );
}

export async function AdminScheduleVenuesSurface() {
  const pageAccess = await requireAdminPageAccess();
  if (!pageAccess.ok) return <AdminAccessDeniedSurface message={pageAccess.message} />;
  const [scheduleData, resolutionData, resolutionEvidence] = await Promise.all([
    listScheduleOperationsData(),
    listGameDayResolutionReviews({ teamIds: pageAccess.access.adminTeamIds }),
    listGameDayResolutionEvidence({ teamIds: pageAccess.access.adminTeamIds })
  ]);
  const scopedScheduleData = scopeScheduleOperationsData(
    scheduleData,
    pageAccess.access.adminTeamIds,
    "Showing schedule and venue rows scoped to the signed-in admin's organizations."
  );
  const resolutionState = {
    ...seedState,
    organization: {
      ...seedState.organization,
      id: scopedScheduleData.organizationId
    },
    teams: scopedScheduleData.teams,
    events: scopedScheduleData.events,
    players: resolutionEvidence.evidence.players,
    rsvps: resolutionEvidence.evidence.rsvps,
    weatherAlerts: resolutionEvidence.evidence.weatherAlerts
  };
  return (
    <>
      <GameDayResolutionRoomClient
        state={resolutionState}
        initialReviews={resolutionData.reviews}
        mode="admin"
        message={resolutionData.ok && resolutionEvidence.ok
          ? "Game-day decision receipts and live team evidence are ready for review."
          : `${resolutionData.message} ${resolutionEvidence.message}`}
      />
      <details className="compact-disclosure schedule-edit-disclosure">
        <summary><span><strong>Edit a scheduled event</strong><small>Open the event form after reviewing the Resolution Room evidence and affected families.</small></span><span className="badge">Event form</span></summary>
        <ScheduleAlertsClient scheduleData={scopedScheduleData} mode="admin" />
      </details>
    </>
  );
}

export async function AdminMessageDeliveryReviewSurface() {
  const pageAccess = await requireAdminPageAccess();
  if (!pageAccess.ok) return <AdminAccessDeniedSurface message={pageAccess.message} />;
  const data = await listOrganizationNotificationReceipts({
    organizationIds: pageAccess.access.adminOrganizationIds
  });
  return <AdminDeliveryReviewClient initialReceipts={data.receipts} message={data.message} />;
}
