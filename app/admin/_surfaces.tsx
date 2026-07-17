import Link from "next/link";
import {
  AdminDashboardClient,
  AdminHealthClient,
  AdminInvitesClient,
  AdminTeamManagementClient,
  AdminThemesClient,
  ImportsClient,
  MembershipAdminClient,
  RegistrationReviewClient,
  ScheduleAlertsClient
} from "@/components/feature-panels";
import type { AdminDashboardSurfaceMode } from "@/components/feature-panels";
import { listAdminOperationsData, type AdminOperationsData } from "@/lib/supabase/admin-operations";
import { listArchiveVaultData } from "@/lib/supabase/archive-vault";
import { listGuardianLinkRepairData } from "@/lib/supabase/guardian-links";
import { listMediaGovernanceData } from "@/lib/supabase/media-governance";
import { listAdminMembershipData } from "@/lib/supabase/memberships";
import { listRegistrationReviewData } from "@/lib/supabase/registration-approvals";
import { listRegistrationRequests } from "@/lib/supabase/registrations";
import { scopeScheduleOperationsData } from "@/lib/supabase/route-scopes";
import { listScheduleOperationsData } from "@/lib/supabase/schedule-management";
import { buildSecurityProofDashboard } from "@/lib/supabase/security-proof";
import { requireAdminPageAccess } from "@/lib/supabase/shell-access";
import { listSponsorAdminData } from "@/lib/supabase/sponsors";
import { listTenantReadinessData } from "@/lib/supabase/tenant-readiness";
import { listAdminThemeData } from "@/lib/supabase/team-branding";
import { listAdminTeamManagementData } from "@/lib/supabase/team-management";

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
  const [registrationRequests, sponsorData, mediaData] = await Promise.all([
    listRegistrationRequests(),
    listSponsorAdminData(),
    listMediaGovernanceData()
  ]);
  return <AdminDashboardClient registrationRequests={registrationRequests} sponsorData={sponsorData} mediaData={mediaData} surface={surface} />;
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
  const data = await listGuardianLinkRepairData();

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
            <p className="muted">Use `/api/admin/guardian-links/repair` with an existing parent profile and a 10-500 character verification note to activate team access.</p>
          </article>
        ))}
      </section>
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
  const data = await listAdminOperationsData();
  return <AdminOperationsView data={data} />;
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
  const data = await listAdminTeamManagementData({
    organizationIds: pageAccess.access.adminOrganizationIds
  });

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
  return <ImportsClient />;
}

export async function AdminInvitesSurface() {
  const pageAccess = await requireAdminPageAccess();
  if (!pageAccess.ok) return <AdminAccessDeniedSurface message={pageAccess.message} />;
  return <AdminInvitesClient />;
}

export async function AdminHealthSurface() {
  const pageAccess = await requireAdminPageAccess();
  if (!pageAccess.ok) return <AdminAccessDeniedSurface message={pageAccess.message} />;
  const tenantReadinessData = await listTenantReadinessData({
    organizationIds: pageAccess.access.adminOrganizationIds
  });
  return <AdminHealthClient tenantReadinessData={tenantReadinessData} />;
}

export async function AdminScheduleVenuesSurface() {
  const pageAccess = await requireAdminPageAccess();
  if (!pageAccess.ok) return <AdminAccessDeniedSurface message={pageAccess.message} />;
  const scheduleData = await listScheduleOperationsData();
  const scopedScheduleData = scopeScheduleOperationsData(
    scheduleData,
    pageAccess.access.adminTeamIds,
    "Showing schedule and venue rows scoped to the signed-in admin's organizations."
  );
  return <ScheduleAlertsClient scheduleData={scopedScheduleData} />;
}

export async function AdminMessageDeliveryReviewSurface() {
  const pageAccess = await requireAdminPageAccess();
  if (!pageAccess.ok) return <AdminAccessDeniedSurface message={pageAccess.message} />;
  const data = await listAdminOperationsData();
  return (
    <div className="page">
      <section className="hero">
        <span className="eyebrow">Message delivery review</span>
        <h1>Review notification records without external provider sends.</h1>
        <p className="lead">Provider approval remains record-only. Email, SMS, and Web Push adapters are still disconnected unless a separate send slice is approved.</p>
      </section>
      <AdminOperationsView data={data} />
    </div>
  );
}
