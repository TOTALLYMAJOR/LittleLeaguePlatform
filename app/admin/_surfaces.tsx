import Link from "next/link";
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
      <section className="hero">
        <span className="eyebrow">Guardian links</span>
        <h1>Repair missing parent-player links before families hit dead ends.</h1>
        <p className="lead">{data.message}</p>
      </section>

      <section className="grid three">
        <article className="card metric"><span className="muted">Missing links</span><strong>{data.missingLinks.length}</strong></article>
        <article className="card metric"><span className="muted">Parent options</span><strong>{data.parentOptions.length}</strong></article>
        <article className="card metric"><span className="muted">Boundary</span><strong>admin</strong></article>
      </section>

      <section className="grid two">
        {data.missingLinks.map((link) => (
          <article className="card stack" key={link.playerId}>
            <span className="eyebrow">{link.teamName}</span>
            <h2>{link.playerName}</h2>
            <p className="muted">Confirm the adult’s existing parent account and record what was verified before repairing this missing link.</p>
          </article>
        ))}
      </section>

      <AdminAdditionalGuardianClient data={additionalGuardianData} />
    </div>
  );
}

export async function AdminSecurityAuditSurface() {
  const pageAccess = await requireAdminPageAccess();
  if (!pageAccess.ok) return <AdminAccessDeniedSurface message={pageAccess.message} />;
  const items = buildSecurityProofDashboard();
  const coveredCount = items.filter((item) => item.status === "covered").length;

  return (
    <div className="page">
      <section className="hero">
        <span className="eyebrow">Security proof</span>
        <h1>RLS and audit boundaries that must stay green before live family use.</h1>
        <p className="lead">
          This page summarizes source-backed proof for cross-team denial, archived-season read-only behavior,
          guardian-scoped RSVP writes, and production audit events.
        </p>
      </section>

      <section className="grid three">
        <article className="card metric"><span className="muted">Proof checks</span><strong>{items.length}</strong></article>
        <article className="card metric"><span className="muted">Covered</span><strong>{coveredCount}</strong></article>
        <article className="card metric"><span className="muted">Missing</span><strong>{items.length - coveredCount}</strong></article>
      </section>

      <section className="grid two">
        {items.map((item) => (
          <article className="card stack" key={item.title}>
            <span className="eyebrow">{item.status}</span>
            <h2>{item.title}</h2>
            <p>{item.evidence}</p>
            <p className="muted">{item.source}</p>
          </article>
        ))}
      </section>
    </div>
  );
}

export async function AdminReportsArchiveSurface() {
  const pageAccess = await requireAdminPageAccess();
  if (!pageAccess.ok) return <AdminAccessDeniedSurface message={pageAccess.message} />;
  const data = await listArchiveVaultData();

  return (
    <div className="page">
      <section className="hero">
        <span className="eyebrow">Archive vault</span>
        <h1>Archived seasons stay readable, exportable, and mutation-locked.</h1>
        <p className="lead">{data.message}</p>
      </section>

      <section className="grid two">
        {data.proof.map((item) => (
          <article className="card stack" key={item.label}>
            <h2>{item.label}</h2>
            <p>{item.detail}</p>
          </article>
        ))}
      </section>

      <section className="grid two">
        {data.archivedSeasons.map((season) => (
          <article className="card stack" key={season.id}>
            <span className="eyebrow">Archived season</span>
            <h2>{season.name}</h2>
            <p>{season.teamCount} team(s)</p>
            <p className="muted">{season.archivedAt ?? "No archive timestamp recorded"}</p>
          </article>
        ))}
        {!data.archivedSeasons.length ? <p className="muted">No archived seasons are available yet.</p> : null}
      </section>
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
  return (
    <div className="page">
      <section className="hero">
        <span className="eyebrow">Admin operations</span>
        <h1>Organization settings, provider inventory, approval queues, and audit logs.</h1>
        <p className="lead">{data.message}</p>
      </section>

      <section className="grid three">
        <article className="card metric"><span className="muted">Organization</span><strong>{data.settings.organizationName}</strong></article>
        <article className="card metric"><span className="muted">Season</span><strong>{data.settings.activeSeasonName}</strong></article>
        <article className="card metric"><span className="muted">Status</span><strong>{data.settings.activeSeasonStatus}</strong></article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <h2>Provider inventory</h2>
          {data.providerInventory.map((item) => (
            <p key={`${item.provider}-${item.channel}`}>
              <strong>{item.provider}</strong> <span className="muted">({item.channel})</span><br />
              <span className={`badge ${item.status === "configured" ? "ok" : item.status === "missing" ? "warning" : ""}`}>{item.status}</span>{" "}
              <span className="muted">{item.boundary}</span>
            </p>
          ))}
        </article>

        <article className="card stack">
          <h2>Approval queues</h2>
          {data.approvalQueues.map((item) => (
            <p key={item.queue}>
              <strong>{item.queue}: {item.count}</strong><br />
              <Link href={item.actionHref}>Open queue</Link><br />
              <span className="muted">{item.boundary}</span>
            </p>
          ))}
        </article>
      </section>

      <section className="card stack">
        <h2>Audit logs</h2>
        {data.auditLogs.map((item) => (
          <p key={item.id}>
            <strong>{item.action}</strong> <span className="muted">{item.targetType} - {new Date(item.createdAt).toLocaleString("en-US")}</span><br />
            {item.summary}
          </p>
        ))}
        {!data.auditLogs.length ? <p className="muted">No audit events available yet.</p> : null}
      </section>
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
      <section className="hero">
        <span className="eyebrow">Team setup</span>
        <h1>Manage team records by organization, season, and division.</h1>
        <p className="lead">{data.message}</p>
      </section>

      <section className="grid three">
        <article className="card metric"><span className="muted">Teams</span><strong>{data.teams.length}</strong></article>
        <article className="card metric"><span className="muted">Divisions</span><strong>{data.divisions.length}</strong></article>
        <article className="card metric"><span className="muted">Seasons</span><strong>{data.seasons.length}</strong></article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <h2>Divisions</h2>
          {data.divisions.map((division) => <p key={division}>{division}</p>)}
        </article>
        <article className="card stack">
          <h2>Seasons</h2>
          {data.seasons.map((season) => (
            <p key={season.id}><strong>{season.name}</strong><br /><span className="muted">{season.status}</span></p>
          ))}
        </article>
      </section>

      <AdminTeamManagementClient data={data} />
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
