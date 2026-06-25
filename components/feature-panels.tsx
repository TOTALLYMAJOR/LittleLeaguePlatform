"use client";

import { useEffect, useMemo, useState, useTransition, type CSSProperties } from "react";
import { useAppState } from "@/app/providers";
import {
  NOW,
  analyzeRosterCsv,
  applyScheduleChange,
  buildAdminAssistiveSuggestions,
  buildCoachAssistiveSuggestions,
  buildParentAssistiveSuggestions,
  canUpdateTeamPortalBranding,
  communicationTemplates,
  computeAdminHealth,
  computeSeasonPlanningMetrics,
  createRegistrationRequest,
  defaultTeamCommunicationCopy,
  detectScheduleConflicts,
  evaluateInviteRecovery,
  getCoachRsvpReliability,
  getCoachRsvpSummaries,
  getParentDashboard,
  getTeamChatView,
  generateParentReplayDraft,
  exportTeamCalendarIcs,
  getProgramThemePreset,
  getScheduleRsvpSyncRows,
  getEventStatusTracking,
  getNotificationRetryLogs,
  getDeviceManagementSummary,
  getEmailFallbackPlan,
  defaultPracticeFocusAreas,
  getNotificationChannelReadiness,
  getScheduleNotificationWorkflow,
  getVapidSendAdapterStatus,
  recipientAllowsNotification,
  getAlertOpenRateTracking,
  smsUrgencyAllowed,
  getSportWeatherThresholds,
  evaluateWeatherThresholds,
  getLeagueWeatherThresholds,
  getWeatherAlertHistory,
  getWeatherApprovalQueue,
  getWeatherProviderRetryLogs,
  createFieldClosureDraft,
  getWeatherEscalationRules,
  getWeatherSafetyNotes,
  getEmbeddedMapUi,
  getFieldLayoutMetadata,
  getMapQuotaStatus,
  getVenueAmenityNotes,
  getVenueMarkers,
  getVenuePage,
  getArrivalInstructions,
  getMapFallbackUx,
  getVenueIntelligence,
  highlightLocationChange,
  getFacilityNotes,
  getTeamChatReportingSummary,
  getTeamChatRetentionJobs,
  getMediaMessagePolicyScreens,
  getVenueRecords,
  platformFeatureTiers,
  previewTeamCommunication,
  previewScheduleChangeImpact,
  previewRecurringEvents,
  programThemePresets,
  roleLabel,
  sampleRosterCsv,
  setRsvp,
  updateTeamPortalBranding,
  validateMediaUrl,
  approveMediaItem,
  rejectMediaItem,
  getMediaReportingSummary,
  getUploadStorageProviderStatus,
  getFamilyFacingModerationQueue,
  getMediaRetentionPolicy,
  canViewMediaByRole,
  getMediaConsentControls,
  getPerPlayerMediaConsent,
  getPhotoVisibilityFlags,
  getPrivateTeamAlbum,
  createMediaTakedownRequest,
  getParentSubmittedMoments,
  getVolunteerMoments,
  exportSeasonMemories,
  getSnackReminders,
  getSnackConflicts,
  getSnackAuditTrail,
  cancelSnackSlot,
  getVolunteerRoleCaps,
  getVolunteerReminders,
  cancelVolunteerSignup,
  getVolunteerApprovalPolicies,
  getSnackVolunteerFairness,
  getDutyRotation,
  getFamilyOptOuts,
  getSiblingAwareDutyAssignments,
  getMissedSlotTracking,
  getSponsorPublicDisplayPolicy,
  getTeamPortalSponsorPlacement,
  getScheduleSponsorPlacement,
  getMediaGallerySponsorPlacement,
  getEmailSponsorPlacement,
  getBannerSponsorPlacement,
  buildSponsorBillingProofs,
  previewBalancedTeamBuild,
  getTouchTargetQa,
  getOfflineStateSummary,
  getCacheInvalidationPolicy,
  getManualDarkToggleState,
  getAccessibilityContrastChecks,
  getPromptEvalHarness,
  getPrivacyFilters,
  getInviteAcceptanceRate,
  getAverageInviteToAccountTimeHours,
  getFailedInviteCount,
  getParentLinkCompletionRate,
  getRsvpResponseRate,
  getScheduleAlertOpenRate,
  getWeeklyActiveParents,
  getSupportRequestsPerTeam,
  getCsvImportErrorRate,
  getCoachWeeklyUpdateSendRate,
  getGameDayCalmModeUsage,
  getParentReplayCompletionRate,
  getMicroCoachingStreakRate,
  getMediaEngagementRate,
  getNotificationOptOutRate,
  buildAiCoachWorkspaceDrafts,
  type ChatAnnouncementTopic,
  type CommunicationTemplate,
  type EventType,
  type EventStatus,
  type MediaItem,
  type NotificationChannel,
  type ParentReplayDraft,
  type ParentReplayRecord,
  type PracticeFocusArea,
  type ProgramThemeKey,
  type RegistrationRequest,
  type RsvpResponse,
  type Sponsor,
  type Team,
  type UserRole
} from "@/lib/domain";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { MediaGovernanceData } from "@/lib/supabase/media-governance";
import type { RegistrationReviewData } from "@/lib/supabase/registration-approvals";
import type { SponsorAdminData } from "@/lib/supabase/sponsors";
import type { TeamPortalData } from "@/lib/supabase/team-portal";
import type { AdminThemeData, TeamThemeAudit, TenantThemeDefaults } from "@/lib/supabase/team-branding";
import type { TeamChatData } from "@/lib/supabase/team-chat";
import type { ParentCoachDashboardData } from "@/lib/supabase/dashboard-data";

interface RegistrationTeamOption {
  id: string;
  name: string;
  division: string;
}

const lineupPositionDefs = [
  { id: "pitcher", label: "Pitcher", shortLabel: "P", x: 240, y: 170 },
  { id: "catcher", label: "Catcher", shortLabel: "C", x: 240, y: 284 },
  { id: "first_base", label: "First", shortLabel: "1B", x: 354, y: 170 },
  { id: "second_base", label: "Second", shortLabel: "2B", x: 296, y: 110 },
  { id: "shortstop", label: "Short", shortLabel: "SS", x: 184, y: 110 },
  { id: "third_base", label: "Third", shortLabel: "3B", x: 126, y: 170 },
  { id: "left_field", label: "Left", shortLabel: "LF", x: 104, y: 58 },
  { id: "center_field", label: "Center", shortLabel: "CF", x: 240, y: 34 },
  { id: "right_field", label: "Right", shortLabel: "RF", x: 376, y: 58 }
] as const;

type LineupPositionId = typeof lineupPositionDefs[number]["id"];
type AdminCommunicationChannel = Extract<NotificationChannel, "email" | "sms">;

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function statusClass(status: string) {
  if (status === "valid" || status === "ok" || status === "eligible" || status === "accepted") return "ok";
  if (status === "error" || status === "danger" || status === "expired" || status === "failed") return "danger";
  return "warning";
}

function privateAccessGate(
  dashboardData: ParentCoachDashboardData | null | undefined,
  surface: "parent" | "coach"
) {
  if (!dashboardData || dashboardData.accessStatus === "live") return null;

  const copy = {
    signed_out: {
      title: surface === "parent" ? "Sign in to see family records." : "Sign in to see assigned team records.",
      body: dashboardData.message,
      actionHref: "/auth",
      actionLabel: "Open sign in"
    },
    missing_parent_link: {
      title: "No approved child link is active for this account.",
      body: "A league admin needs to approve registration or connect this signed-in adult to a player before private schedules, RSVP forms, media, or coach updates appear.",
      actionHref: "/registration",
      actionLabel: "Submit registration request"
    },
    missing_coach_membership: {
      title: "No active coach membership is assigned to this account.",
      body: "An organization admin needs to grant an active coach team membership before attendance, weather, snack, volunteer, or replay workflows appear.",
      actionHref: "/account",
      actionLabel: "Check account access"
    },
    unavailable: {
      title: "Private dashboard data is unavailable.",
      body: dashboardData.message,
      actionHref: "/account",
      actionLabel: "Check account access"
    }
  }[dashboardData.accessStatus];

  return (
    <section className="grid two">
      <article className="card stack access-state">
        <span className="eyebrow">Access required</span>
        <h2>{copy.title}</h2>
        <p>{copy.body}</p>
        <a href={copy.actionHref}>{copy.actionLabel}</a>
      </article>
      <article className="card stack">
        <h2>{surface === "coach" ? "Coach role access checklist" : "What stays protected"}</h2>
        <p>Private child, team, RSVP, media, weather, snack, volunteer, and coach workflow rows stay hidden until the signed-in account has the required approved relationship.</p>
        <p className="muted">{surface === "coach" ? "A user account is not enough; the coach route requires an active coach team membership." : "Signup proves identity only; team or guardian records grant access."}</p>
      </article>
    </section>
  );
}

function formatArrivalTime(value: string) {
  return new Date(Date.parse(value) - 20 * 60 * 1000).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });
}

function formatTopic(value?: string) {
  if (!value) return "reminder";
  return value.replaceAll("_", " ");
}

function formatFocusArea(value: PracticeFocusArea) {
  return value.replaceAll("_", " ");
}

function formatReplayDuration(value: string) {
  if (value === "30_seconds") return "30 sec";
  if (value === "2_minutes") return "2 min";
  return "5 min";
}

function teamBrandStyle(primaryColor: string, secondaryColor: string): CSSProperties {
  return {
    "--team-primary": primaryColor,
    "--team-secondary": secondaryColor
  } as CSSProperties;
}

function hexToRgb(value: string) {
  const normalized = value.replace("#", "");
  if (normalized.length !== 6) return null;
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16)
  };
}

function relativeLuminance(color: string) {
  const rgb = hexToRgb(color);
  if (!rgb) return 0;
  const channels = [rgb.r, rgb.g, rgb.b].map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
}

function contrastRatio(foreground: string, background: string) {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

function contrastStatus(primaryColor: string, secondaryColor: string) {
  const ratio = contrastRatio(primaryColor, secondaryColor);
  if (ratio >= 4.5) return { label: "Pass", className: "ok", ratio };
  if (ratio >= 3) return { label: "Large text only", className: "warning", ratio };
  return { label: "Needs contrast", className: "danger", ratio };
}

function themeQaStatus(primaryColor: string, secondaryColor: string) {
  const direct = contrastStatus(primaryColor, secondaryColor);
  const dark = contrastStatus(primaryColor, "#111827");
  const mobile = contrastStatus("#ffffff", primaryColor);
  const allPass = direct.className === "ok" && dark.className === "ok" && mobile.className === "ok";
  return {
    label: allPass ? "Theme QA pass" : "Theme QA review",
    className: allPass ? "ok" : "warning",
    darkLabel: dark.label,
    mobileLabel: mobile.label,
    contrastLabel: direct.label
  };
}

async function authenticatedJsonFetch(url: string, payload: unknown) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  try {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) {
      headers.authorization = `Bearer ${data.session.access_token}`;
    }
  } catch {
    // Keep the request path deterministic; private APIs will return 401.
  }

  return fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });
}

function mergeRegistrationRequests(localRequests: RegistrationRequest[], serverRequests: RegistrationRequest[]) {
  const seen = new Set<string>();
  return [...serverRequests, ...localRequests].filter((request) => {
    if (seen.has(request.id)) return false;
    seen.add(request.id);
    return true;
  });
}

export function AuthClient() {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [displayName, setDisplayName] = useState("Coach Taylor");
  const [email, setEmail] = useState("coach.taylor@example.com");
  const [password, setPassword] = useState("");
  const [defaultRole, setDefaultRole] = useState<"admin" | "coach" | "parent">("coach");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function submitAuth() {
    setMessage("");
    startTransition(async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        if (mode === "sign-up") {
          const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                display_name: displayName,
                default_role: defaultRole
              }
            }
          });

          if (error) {
            setMessage(error.message);
            return;
          }

          setMessage("Signup submitted. If email confirmation is enabled, confirm the email before signing in.");
          return;
        }

        const { error } = await supabase.auth.signInWithPassword({ email, password });
        setMessage(error ? error.message : "Signed in. Role-scoped dashboards can now use Supabase session state.");
      } catch {
        setMessage("Supabase Auth is not reachable from this app environment yet.");
      }
    });
  }

  return (
    <div className="page">
      <section className="hero">
        <span className="eyebrow">Supabase Auth</span>
        <h1>Mobile-first sign in for admins, coaches, and parents.</h1>
        <p className="lead">Signup creates a Supabase Auth user and the database trigger creates a matching profile. Team access still requires membership records; signup alone does not grant private team or child access.</p>
      </section>

      {message ? <p className="notice">{message}</p> : null}

      <section className="grid two">
        <article className="card stack">
          <div className="segmented" aria-label="Authentication mode">
            <button className={mode === "sign-in" ? undefined : "secondary"} onClick={() => setMode("sign-in")}>Sign in</button>
            <button className={mode === "sign-up" ? undefined : "secondary"} onClick={() => setMode("sign-up")}>Sign up</button>
          </div>

          {mode === "sign-up" ? (
            <>
              <label>Display name<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></label>
              <label>Starting role
                <select value={defaultRole} onChange={(event) => setDefaultRole(event.target.value as "admin" | "coach" | "parent")}>
                  <option value="coach">Coach</option>
                  <option value="parent">Parent</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
            </>
          ) : null}

          <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          <button onClick={submitAuth} disabled={isPending || password.length < 6}>{isPending ? "Working..." : mode === "sign-up" ? "Create account" : "Sign in"}</button>
        </article>

        <article className="card stack">
          <h2>Access boundary</h2>
          <p>Auth proves identity only. Private team data requires `organization_memberships` or `team_memberships` rows.</p>
          <p>Parents manage child access through guardian links. Children do not log in.</p>
          <p>Admin and coach roles still need an approved membership before privileged actions should appear.</p>
        </article>
      </section>
    </div>
  );
}

interface AccountProfile {
  display_name: string;
  email: string;
  default_role: "admin" | "coach" | "parent";
}

interface AccountMembership {
  team_id: string;
  role: "coach" | "parent";
  status: "active" | "invited" | "removed";
}

interface MembershipAdminData {
  profiles: Array<{
    id: string;
    displayName: string;
    email: string;
    defaultRole: "admin" | "coach" | "parent";
  }>;
  teams: RegistrationTeamOption[];
  memberships: Array<{
    id: string;
    teamId: string;
    userId: string;
    role: "coach" | "parent";
    status: "active" | "invited" | "removed";
  }>;
}

export function AccountClient() {
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [memberships, setMemberships] = useState<AccountMembership[]>([]);
  const [message, setMessage] = useState("Checking Supabase session...");

  useEffect(() => {
    let cancelled = false;

    async function loadAccount() {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: userData, error: userError } = await supabase.auth.getUser();

        if (userError || !userData.user) {
          if (!cancelled) setMessage("No active Supabase session. Sign in before checking role access.");
          return;
        }

        const [{ data: profileData, error: profileError }, { data: membershipData, error: membershipError }] = await Promise.all([
          supabase
            .from("profiles")
            .select("display_name,email,default_role")
            .eq("id", userData.user.id)
            .single(),
          supabase
            .from("team_memberships")
            .select("team_id,role,status")
            .eq("user_id", userData.user.id)
        ]);

        if (cancelled) return;

        if (profileError || !profileData) {
          setMessage("Signed in, but no profile row is visible yet.");
          return;
        }

        setProfile(profileData);
        setMemberships(membershipError ? [] : membershipData ?? []);
        setMessage(membershipData?.length ? "Role-scoped membership is visible." : "Signed in. No team membership has been granted yet.");
      } catch {
        if (!cancelled) setMessage("Supabase account data is not reachable from this app environment yet.");
      }
    }

    loadAccount();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="page">
      <section className="hero">
        <span className="eyebrow">Account access</span>
        <h1>Confirm identity, profile, and team membership before showing private data.</h1>
        <p className="lead">This page separates signup from access. A profile proves identity; team or organization memberships unlock role-scoped app surfaces.</p>
      </section>

      <p className="notice">{message}</p>

      <section className="grid two">
        <article className="card stack">
          <h2>Profile</h2>
          {profile ? (
            <>
              <p><strong>{profile.display_name}</strong><br /><span className="muted">{profile.email}</span></p>
              <p>Default role: {roleLabel(profile.default_role)}</p>
            </>
          ) : (
            <p className="muted">No profile loaded.</p>
          )}
        </article>

        <article className="card stack">
          <h2>Team memberships</h2>
          {memberships.map((membership) => (
            <p key={`${membership.team_id}-${membership.role}`}>
              <strong>{roleLabel(membership.role)}</strong><br />
              <span className="muted">{membership.team_id} - {membership.status}</span>
            </p>
          ))}
          {memberships.length === 0 ? <p className="muted">No active team memberships yet.</p> : null}
        </article>
      </section>
    </div>
  );
}

export function MembershipAdminClient({ initialData }: { initialData: MembershipAdminData }) {
  const [memberships, setMemberships] = useState(initialData.memberships);
  const [userId, setUserId] = useState(initialData.profiles[0]?.id ?? "");
  const [teamId, setTeamId] = useState(initialData.teams[0]?.id ?? "");
  const [role, setRole] = useState<"coach" | "parent">("coach");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function saveMembership() {
    setMessage("");
    startTransition(async () => {
      const response = await authenticatedJsonFetch("/api/admin/team-memberships", { userId, teamId, role });
      const result = await response.json().catch(() => null) as {
        ok?: boolean;
        message?: string;
        membership?: MembershipAdminData["memberships"][number];
      } | null;

      if (result?.ok && result.membership) {
        setMemberships((current) => [result.membership!, ...current.filter((item) => item.id !== result.membership?.id)]);
      }
      setMessage(result?.message ?? "Membership save failed.");
    });
  }

  return (
    <div className="page">
      <section className="hero">
        <span className="eyebrow">Membership admin</span>
        <h1>Connect signed-in adults to team-scoped coach and parent access.</h1>
        <p className="lead">This is the access grant step. Signup alone creates identity; membership rows decide what private team data a user can see or manage.</p>
      </section>

      {message ? <p className="notice">{message}</p> : null}

      <section className="grid two">
        <article className="card stack">
          <h2>Grant team access</h2>
          <label>User
            <select value={userId} onChange={(event) => setUserId(event.target.value)}>
              {initialData.profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>{profile.displayName} - {profile.email}</option>
              ))}
            </select>
          </label>
          <label>Team
            <select value={teamId} onChange={(event) => setTeamId(event.target.value)}>
              {initialData.teams.map((team) => (
                <option key={team.id} value={team.id}>{team.name} ({team.division})</option>
              ))}
            </select>
          </label>
          <label>Role
            <select value={role} onChange={(event) => setRole(event.target.value as "coach" | "parent")}>
              <option value="coach">Coach</option>
              <option value="parent">Parent</option>
            </select>
          </label>
          <button onClick={saveMembership} disabled={isPending || !userId || !teamId}>{isPending ? "Saving..." : "Save membership"}</button>
          {initialData.profiles.length === 0 ? <p className="muted">No Supabase profiles are visible yet. Create an account first.</p> : null}
        </article>

        <article className="card stack">
          <h2>Current memberships</h2>
          {memberships.map((membership) => {
            const profile = initialData.profiles.find((item) => item.id === membership.userId);
            const team = initialData.teams.find((item) => item.id === membership.teamId);
            return (
              <p key={membership.id}>
                <strong>{profile?.displayName ?? membership.userId}</strong><br />
                <span className="muted">{team?.name ?? membership.teamId} - {membership.role} - {membership.status}</span>
              </p>
            );
          })}
          {memberships.length === 0 ? <p className="muted">No team memberships yet.</p> : null}
        </article>
      </section>
    </div>
  );
}

export function ImportsClient() {
  const { state, dispatch } = useAppState();
  const [csv, setCsv] = useState(sampleRosterCsv);
  const analysis = useMemo(() => analyzeRosterCsv(csv, state, NOW), [csv, state]);
  const canCommit = analysis.totalRows > 0 && analysis.errorRows === 0;
  const latestImport = state.rosterImportReports[0];
  const [auditMessage, setAuditMessage] = useState("");
  const [isAuditPending, startAuditTransition] = useTransition();

  function saveImportAudit() {
    setAuditMessage("");
    startAuditTransition(async () => {
      const response = await authenticatedJsonFetch("/api/admin/roster-imports/audit", {
        organizationId: state.organization.id,
        seasonId: state.activeSeason.id,
        filename: "roster-import.csv",
        analysis
      });
      const result = await response.json().catch(() => null) as { message?: string } | null;
      setAuditMessage(result?.message ?? "Roster import audit could not be saved.");
    });
  }

  return (
    <div className="page">
      <section className="hero">
        <span className="eyebrow">CSV duplicate detection</span>
        <h1>Preview roster imports before families receive bad invites.</h1>
        <p className="lead">The parser normalizes rows, flags blocking errors, keeps warnings reviewable, and simulates an audited commit without persisting production data.</p>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <h2>Roster CSV</h2>
            <span className="badge warning">Admin review</span>
          </div>
          <textarea value={csv} onChange={(event) => setCsv(event.target.value)} aria-label="Roster CSV" />
          <button
            disabled={!canCommit}
            onClick={() => dispatch({ type: "commitRosterImport", csv, now: new Date().toISOString() })}
          >
            Commit import simulation
          </button>
          <button className="secondary" disabled={isAuditPending} onClick={saveImportAudit}>
            Save audit trail
          </button>
          {!canCommit ? <p className="muted">Resolve blocking errors before commit simulation is available.</p> : null}
          {latestImport ? <p className="notice">Last commit: {latestImport.validRows} valid, {latestImport.warningRows} warning, {latestImport.errorRows} error rows.</p> : null}
          {auditMessage ? <p className="notice">{auditMessage}</p> : null}
        </article>

        <article className="grid three">
          <div className="card metric">
            <span className="muted">Rows</span>
            <strong>{analysis.totalRows}</strong>
          </div>
          <div className="card metric">
            <span className="muted">Warnings</span>
            <strong>{analysis.warningRows}</strong>
          </div>
          <div className="card metric">
            <span className="muted">Errors</span>
            <strong>{analysis.errorRows}</strong>
          </div>
        </article>
      </section>

      <section className="card">
        <div className="card-header">
          <h2>Preview rows</h2>
          <span className="badge">No records saved</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Row</th>
                <th>Player</th>
                <th>Team</th>
                <th>Parent contact</th>
                <th>Status</th>
                <th>Issues</th>
              </tr>
            </thead>
            <tbody>
              {analysis.rows.map((row) => (
                <tr key={row.rowNumber}>
                  <td>{row.rowNumber}</td>
                  <td>{row.normalized.firstName} {row.normalized.lastInitial}.</td>
                  <td>{row.normalized.teamName || "Missing"}</td>
                  <td>{row.normalized.parentEmail || row.normalized.parentPhone || "Missing"}</td>
                  <td><span className={`badge ${statusClass(row.status)}`}>{row.status}</span></td>
                  <td>{row.issues.length ? row.issues.map((issue) => issue.code).join(", ") : "None"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export function InviteRecoveryClient() {
  const { state, dispatch } = useAppState();
  const [identifier, setIdentifier] = useState("sam@example.com");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const result = submitted ? evaluateInviteRecovery(state, submitted, NOW) : null;

  return (
    <div className="page">
      <section className="hero">
        <span className="eyebrow">Smart invite recovery</span>
        <h1>Recover parent invites without exposing raw tokens.</h1>
        <p className="lead">Parents can enter an email or phone. The system checks whether the invite exists, is expired, was already accepted, and is within resend limits.</p>
      </section>

      <section className="grid two">
        <article className="card stack">
          <h2>Resend invite</h2>
          <label>
            Parent email or phone
            <input value={identifier} onChange={(event) => setIdentifier(event.target.value)} />
          </label>
          <button
            onClick={() => {
              setSubmitted(identifier);
              const evaluation = evaluateInviteRecovery(state, identifier, NOW);
              if (evaluation.canResend) {
                dispatch({ type: "recoverInvite", identifier, now: new Date().toISOString() });
              }
            }}
          >
            Request recovery
          </button>
          <p className="muted">Try sam@example.com, pat@example.com, jordan@example.com, limit@example.com, or 555-0000.</p>
        </article>

        <article className="card stack">
          <div className="card-header">
            <h2>Recovery result</h2>
            {result ? <span className={`badge ${statusClass(result.code)}`}>{result.code}</span> : null}
          </div>
          {result ? (
            <>
              <h3>{result.title}</h3>
              <p>{result.message}</p>
              {result.invite ? (
                <ul className="list">
                  <li>Status: {result.invite.status}</li>
                  <li>Sent count: {result.invite.sentCount}</li>
                  <li>Expires: {formatDate(result.invite.expiresAt)}</li>
                  <li>Token storage: hashed only</li>
                </ul>
              ) : null}
            </>
          ) : (
            <p className="muted">Submit an email or phone to run recovery checks.</p>
          )}
        </article>
      </section>
    </div>
  );
}

export function AdminInvitesClient() {
  const { state } = useAppState();

  return (
    <div className="page">
      <section className="hero">
        <span className="eyebrow">Admin invite status</span>
        <h1>Review parent invite delivery and recovery state.</h1>
        <p className="lead">This view shows status, resend counts, failure state, and hashed-token policy without displaying raw invite tokens.</p>
      </section>

      <section className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Parent</th>
                <th>Player</th>
                <th>Team</th>
                <th>Status</th>
                <th>Delivery</th>
                <th>Sent</th>
                <th>Last sent</th>
              </tr>
            </thead>
            <tbody>
              {state.parentInvites.map((invite) => {
                const player = state.players.find((item) => item.id === invite.playerId);
                const team = state.teams.find((item) => item.id === invite.teamId);
                return (
                  <tr key={invite.id}>
                    <td>{invite.email}<br /><span className="muted">{invite.phone}</span></td>
                    <td>{player ? `${player.firstName} ${player.lastInitial}.` : "Unknown"}</td>
                    <td>{team?.name ?? "Unknown"}</td>
                    <td><span className={`badge ${statusClass(invite.status)}`}>{invite.status}</span></td>
                    <td><span className={`badge ${statusClass(invite.deliveryStatus)}`}>{invite.deliveryStatus}</span></td>
                    <td>{invite.sentCount}</td>
                    <td>{invite.lastSentAt ? formatDate(invite.lastSentAt) : "Never"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export function AdminHealthClient() {
  const { state } = useAppState();
  const cards = computeAdminHealth(state, NOW);

  return (
    <div className="page">
      <section className="hero">
        <span className="eyebrow">Admin health dashboard</span>
        <h1>Launch readiness issues before parents complain.</h1>
        <p className="lead">Health cards are computed from the typed local adapter and update after import, invite, RSVP, and schedule actions.</p>
      </section>

      <section className="grid three">
        {cards.map((card) => (
          <article className="card metric" key={card.id}>
            <div className="card-header">
              <h2>{card.title}</h2>
              <span className={`badge ${card.status}`}>{card.status}</span>
            </div>
            <strong>{card.count}</strong>
            <p className="muted">{card.detail}</p>
          </article>
        ))}
      </section>
    </div>
  );
}

export function ParentDashboardClient({ dashboardData }: { dashboardData?: ParentCoachDashboardData | null } = {}) {
  const { state } = useAppState();
  const [helpMessage, setHelpMessage] = useState("");
  const [scheduleTypeFilter, setScheduleTypeFilter] = useState<"all" | EventType>("all");
  const [mediaTypeFilter, setMediaTypeFilter] = useState<"all" | MediaItem["type"]>("all");
  const [supportTopic, setSupportTopic] = useState("schedule");
  const [supportDetail, setSupportDetail] = useState("Need help with this weekend's schedule.");
  const [isHelpPending, startHelpTransition] = useTransition();
  const sourceState = dashboardData?.state ?? state;
  const parentUserId = dashboardData?.parentUserId ?? "user-parent-jordan";
  const parentUser = sourceState.users.find((user) => user.id === parentUserId);
  const dashboard = getParentDashboard(sourceState, parentUserId, NOW);
  const parentSuggestions = buildParentAssistiveSuggestions(sourceState, parentUserId, NOW);
  const accessGate = privateAccessGate(dashboardData, "parent");
  const parentTeamIds = new Set(dashboard.children.map(({ team }) => team.id));
  const primaryTeamId = dashboard.children[0]?.team.id;
  const allParentEvents = sourceState.events
    .filter((event) => parentTeamIds.has(event.teamId) && event.status === "scheduled" && new Date(event.startsAt).getTime() >= new Date(NOW).getTime())
    .sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime());
  const filteredParentEvents = allParentEvents.filter((event) => scheduleTypeFilter === "all" || event.eventType === scheduleTypeFilter);
  const mediaFeed = sourceState.mediaItems
    .filter((item) => parentTeamIds.has(item.teamId) && (item.moderationStatus ?? "approved") === "approved")
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  const filteredMediaFeed = mediaFeed.filter((item) => mediaTypeFilter === "all" || item.type === mediaTypeFilter);
  const familyModerationQueue = getFamilyFacingModerationQueue(sourceState.mediaItems.filter((item) => parentTeamIds.has(item.teamId)));
  const mediaConsentControls = getMediaConsentControls();
  const onboardingSteps = [
    { label: "Confirm guardian link", done: dashboard.children.length > 0 },
    { label: "Review upcoming schedule", done: dashboard.nextEvents.length > 0 },
    { label: "Set notification preferences", done: sourceState.notificationPreferences.some((item) => item.userId === parentUserId) },
    { label: "Answer open RSVPs", done: dashboard.rsvpNeeded.length === 0 }
  ];
  const openSnackSlots = sourceState.snackScheduleSlots.filter((slot) => parentTeamIds.has(slot.teamId) && slot.status === "open");
  const openVolunteerSignups = sourceState.volunteerSignups.filter((signup) => parentTeamIds.has(signup.teamId) && signup.status === "open");
  const eventById = new Map(sourceState.events.map((event) => [event.id, event]));
  const actionChecklist = [
    {
      label: "Check the family calendar",
      done: allParentEvents.length > 0,
      detail: allParentEvents[0] ? `${allParentEvents[0].title} at ${formatDate(allParentEvents[0].startsAt)}` : "No linked team events are scheduled."
    },
    {
      label: "Answer open RSVPs",
      done: dashboard.rsvpNeeded.length === 0,
      detail: dashboard.rsvpNeeded.length ? `${dashboard.rsvpNeeded.length} RSVP still need a response.` : "All visible RSVP requests are answered."
    },
    {
      label: "Review snack and volunteer openings",
      done: openSnackSlots.length + openVolunteerSignups.length === 0,
      detail: `${openSnackSlots.length} snack slot(s), ${openVolunteerSignups.length} volunteer role(s) open.`
    },
    {
      label: "Review the media feed",
      done: mediaFeed.length > 0,
      detail: mediaFeed.length ? `${mediaFeed.length} approved media item(s) available.` : "No approved team media is visible yet."
    },
    {
      label: "Set schedule notification rules",
      done: sourceState.notificationPreferences.some((item) => item.userId === parentUserId && item.notificationType === "schedule_changed"),
      detail: "Provider sends still require opted-in channels and adapter checks."
    }
  ];
  const schedulePreferences = (["push", "email", "sms"] as const).map((channel) => {
    const preference = sourceState.notificationPreferences.find((item) => (
      item.userId === parentUserId &&
      item.channel === channel &&
      item.notificationType === "schedule_changed" &&
      (!item.teamId || parentTeamIds.has(item.teamId))
    ));
    return {
      channel,
      enabled: preference?.enabled ?? channel !== "sms",
      quietHours: preference?.quietHoursStart && preference.quietHoursEnd
        ? `${preference.quietHoursStart}-${preference.quietHoursEnd}`
        : "8:30 PM-7:00 AM"
    };
  });

  function claimFamilyHelp(url: string, payload: unknown) {
    if (!dashboardData?.isSupabaseBacked) {
      setHelpMessage("Sign in with an approved parent link before claiming snacks or volunteer roles.");
      return;
    }

    startHelpTransition(async () => {
      const response = await authenticatedJsonFetch(url, payload);
      const result = await response.json().catch(() => null) as { ok?: boolean; message?: string } | null;
      setHelpMessage(result?.message ?? (response.ok ? "Claim saved." : "Claim could not be saved."));
    });
  }

  function saveSchedulePreference(channel: "push" | "email" | "sms", enabled: boolean) {
    if (!dashboardData?.isSupabaseBacked || !primaryTeamId) {
      setHelpMessage("Sign in with an approved parent link before saving notification preferences.");
      return;
    }

    startHelpTransition(async () => {
      const response = await authenticatedJsonFetch("/api/notification-preferences", {
        teamId: primaryTeamId,
        channel,
        notificationType: "schedule_changed",
        enabled,
        quietHoursStart: "20:30",
        quietHoursEnd: "07:00",
        timezone: "America/Chicago"
      });
      const result = await response.json().catch(() => null) as { ok?: boolean; message?: string } | null;
      setHelpMessage(result?.message ?? (response.ok ? "Preference saved." : "Preference could not be saved."));
    });
  }

  function submitSupportRequest() {
    setHelpMessage(supportDetail.trim()
      ? `Support request drafted for ${supportTopic.replace("_", " ")}. Staff routing is not connected yet.`
      : "Add a short support request before submitting.");
  }

  return (
    <div className="page">
      <section className="hero">
        <span className="eyebrow">Parent dashboard</span>
        <h1>One place for the next thing a parent needs to know.</h1>
        <p className="lead">This dashboard is scoped to {parentUser?.name ?? "the selected parent"} and only shows linked child, team, schedule, RSVP, media, and coach update records.</p>
      </section>

      <p className={`notice ${dashboardData?.isSupabaseBacked ? "ok" : "warning"}`}>
        {dashboardData?.message ?? "Showing local seed fallback until Supabase has linked parent and coach records."}
      </p>
      {helpMessage ? <p className="notice">{helpMessage}</p> : null}
      {accessGate ?? (
        <>

      <section className="grid one">
        <article className="card stack">
          <span className="eyebrow">Parent help assistant</span>
          <h2>{parentSuggestions[0]?.title ?? "Scoped help"}</h2>
          {parentSuggestions.map((suggestion) => (
            <div className="stack compact" key={suggestion.id}>
              <p><strong>{suggestion.body}</strong></p>
              <p>{suggestion.recommendation}</p>
              <p className="muted">{suggestion.boundary}</p>
            </div>
          ))}
        </article>
      </section>

      <section className="card stack">
        <h2>Parent onboarding</h2>
        {onboardingSteps.map((step) => (
          <p key={step.label}>
            <span className={`badge ${step.done ? "ok" : "warning"}`}>{step.done ? "Done" : "Next"}</span>{" "}
            {step.label}
          </p>
        ))}
      </section>

      <section className="card stack">
        <div className="card-header">
          <div>
            <span className="eyebrow">Parent action checklist</span>
            <h2>Next family actions</h2>
          </div>
          <span className="badge">{actionChecklist.filter((item) => !item.done).length} open</span>
        </div>
        {actionChecklist.map((item) => (
          <p key={item.label}>
            <span className={`badge ${item.done ? "ok" : "warning"}`}>{item.done ? "Done" : "Action"}</span>{" "}
            <strong>{item.label}</strong><br />
            <span className="muted">{item.detail}</span>
          </p>
        ))}
      </section>

      <section className="grid two">
        <article className="card stack">
          <h2>My Child</h2>
          {dashboard.children.map(({ player, team }) => (
            <div key={player.id}>
              <strong>{player.firstName} {player.lastInitial}.</strong>
              <p className="muted">{team.name} · Jersey {player.jersey}</p>
            </div>
          ))}
          <span className="badge ok">{dashboard.completionStatus}</span>
        </article>

        <article className="card stack">
          <h2>Coach Updates</h2>
          {dashboard.latestAnnouncement ? (
            <>
              <strong>{dashboard.latestAnnouncement.title}</strong>
              <p>{dashboard.latestAnnouncement.body}</p>
              <p className="muted">{dashboard.latestAnnouncement.teamName} · {formatDate(dashboard.latestAnnouncement.createdAt)}</p>
            </>
          ) : <p className="muted">No announcements yet.</p>}
        </article>
      </section>

      <section className="grid three">
        <article className="card stack">
          <h2>Upcoming Schedule</h2>
          {dashboard.nextEvents.map((event) => (
            <p key={event.id}><strong>{event.title}</strong><br /><span className="muted">{formatDate(event.startsAt)} · {event.locationName}</span></p>
          ))}
        </article>
        <article className="card stack">
          <h2>RSVP Needed</h2>
          {dashboard.rsvpNeeded.length ? dashboard.rsvpNeeded.map(({ event, player }) => (
            <p key={`${event.id}-${player.id}`}>{player.firstName} {player.lastInitial}. · {event.title}</p>
          )) : <p className="muted">No RSVP needed right now.</p>}
        </article>
        <article className="card stack">
          <h2>Recent Media</h2>
          {dashboard.recentMedia.map((item) => {
            const validation = validateMediaUrl(item.type, item.url);
            return (
              <div className="stack compact" key={item.id}>
                <p><strong>{item.title}</strong><br /><span className="muted">{item.type.replace("_", " ")} · {validation.message}</span></p>
                <button
                  className="secondary"
                  disabled={isHelpPending}
                  onClick={() => claimFamilyHelp("/api/media/report", { mediaItemId: item.id, reason: "Family reported this media link for review." })}
                >
                  Report media
                </button>
              </div>
            );
          })}
          {!dashboard.recentMedia.length ? <p className="muted">No media links yet.</p> : null}
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Family-facing moderation queue</span>
              <h2>Media under review</h2>
            </div>
            <span className="badge warning">{familyModerationQueue.length} item(s)</span>
          </div>
          {familyModerationQueue.map((entry) => <p key={entry.item.id}><strong>{entry.item.title}</strong><br /><span className="muted">{entry.message}</span></p>)}
          {!familyModerationQueue.length ? <p className="muted">No reported media is waiting for family-facing review.</p> : null}
        </article>
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Media consent controls</span>
              <h2>Family consent</h2>
            </div>
            <span className="badge">Policy</span>
          </div>
          {mediaConsentControls.map((control) => (
            <p key={control.label}><strong>{control.label}</strong><br /><span className="muted">{control.enabled ? "Enabled" : "Planned"} · {control.detail}</span></p>
          ))}
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Parent calendar view</span>
              <h2>Family calendar</h2>
            </div>
            <span className="badge">{filteredParentEvents.length} event(s)</span>
          </div>
          <div className="toolbar">
            {(["all", "game", "practice", "team_event"] as const).map((filter) => (
              <button
                className={scheduleTypeFilter === filter ? undefined : "secondary"}
                key={filter}
                onClick={() => setScheduleTypeFilter(filter)}
              >
                {filter === "all" ? "All" : filter.replace("_", " ")}
              </button>
            ))}
          </div>
          {filteredParentEvents.map((event) => (
            <p key={event.id}>
              <span className="badge">{event.eventType.replace("_", " ")}</span>{" "}
              <strong>{event.title}</strong><br />
              <span className="muted">{formatDate(event.startsAt)} · Arrive {formatArrivalTime(event.startsAt)} · {event.locationName}</span>
            </p>
          ))}
          {!filteredParentEvents.length ? <p className="muted">No family events match this filter.</p> : null}
        </article>

        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Parent media feed</span>
              <h2>Team media</h2>
            </div>
            <span className="badge">{filteredMediaFeed.length} item(s)</span>
          </div>
          <div className="toolbar">
            {(["all", "google_photos", "youtube"] as const).map((filter) => (
              <button
                className={mediaTypeFilter === filter ? undefined : "secondary"}
                key={filter}
                onClick={() => setMediaTypeFilter(filter)}
              >
                {filter === "all" ? "All" : filter.replace("_", " ")}
              </button>
            ))}
          </div>
          {filteredMediaFeed.map((item) => {
            const validation = validateMediaUrl(item.type, item.url);
            return (
              <div className="stack compact" key={item.id}>
                <p><strong>{item.title}</strong><br /><span className="muted">{item.type.replace("_", " ")} · {formatDate(item.createdAt)} · {validation.message}</span></p>
                <button
                  className="secondary"
                  disabled={isHelpPending}
                  onClick={() => claimFamilyHelp("/api/media/report", { mediaItemId: item.id, reason: "Family reported this media link for review." })}
                >
                  Report media
                </button>
              </div>
            );
          })}
          {!filteredMediaFeed.length ? <p className="muted">No media links match this filter.</p> : null}
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Family help</span>
              <h2>Snack openings</h2>
            </div>
            <span className="badge">{openSnackSlots.length} open</span>
          </div>
          {openSnackSlots.map((slot) => {
            const event = eventById.get(slot.eventId);
            return (
              <div className="stack compact" key={slot.id}>
                <p><strong>{slot.item}</strong><br /><span className="muted">{event?.title ?? "Team event"} · {event ? formatDate(event.startsAt) : "Date pending"}</span></p>
                <button
                  className="secondary"
                  disabled={isHelpPending}
                  onClick={() => claimFamilyHelp("/api/snack-slots/claim", { slotId: slot.id })}
                >
                  Claim snack slot
                </button>
              </div>
            );
          })}
          {!openSnackSlots.length ? <p className="muted">No open snack slots for linked teams.</p> : null}
        </article>
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Family help</span>
              <h2>Volunteer openings</h2>
            </div>
            <span className="badge">{openVolunteerSignups.length} open</span>
          </div>
          {openVolunteerSignups.map((signup) => {
            const event = signup.eventId ? eventById.get(signup.eventId) : undefined;
            return (
              <div className="stack compact" key={signup.id}>
                <p><strong>{signup.role}</strong><br /><span className="muted">{event?.title ?? "Team need"}{event ? ` · ${formatDate(event.startsAt)}` : ""}</span></p>
                <button
                  className="secondary"
                  disabled={isHelpPending}
                  onClick={() => claimFamilyHelp("/api/volunteer-signups/claim", { signupId: signup.id })}
                >
                  Claim volunteer role
                </button>
              </div>
            );
          })}
          {!openVolunteerSignups.length ? <p className="muted">No open volunteer roles for linked teams.</p> : null}
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Notification preference center</span>
              <h2>Family alert rules</h2>
            </div>
            <span className={`badge ${dashboardData?.isSupabaseBacked ? "ok" : "warning"}`}>{dashboardData?.isSupabaseBacked ? "Persisted" : "Local preview"}</span>
          </div>
          {schedulePreferences.map((preference) => (
            <div className="stack compact" key={preference.channel}>
              <p><strong>{preference.channel.toUpperCase()}</strong> schedule alerts {preference.enabled ? "on" : "off"}<br /><span className="muted">Quiet hours {preference.quietHours}</span></p>
              <div className="toolbar">
                <button
                  className={preference.enabled ? undefined : "secondary"}
                  disabled={isHelpPending}
                  onClick={() => saveSchedulePreference(preference.channel, true)}
                >
                  On
                </button>
                <button
                  className={preference.enabled ? "secondary" : undefined}
                  disabled={isHelpPending}
                  onClick={() => saveSchedulePreference(preference.channel, false)}
                >
                  Off
                </button>
              </div>
            </div>
          ))}
          <p className="muted">Saving preferences updates Supabase only. Provider sends still require opt-in, policy checks, and approved delivery adapters.</p>
        </article>
        <article className="card stack">
          <h2>Respectful messaging boundary</h2>
          <p>Schedule changes, weather, RSVP reminders, weekly digests, and urgent alerts should all read these family rules before delivery.</p>
          <p className="notice">Urgent alerts can still be drafted for review, but production sending must honor quiet hours and fallback settings.</p>
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Parent support request flow</span>
              <h2>Ask league staff for help</h2>
            </div>
            <span className="badge warning">Draft</span>
          </div>
          <label>
            Topic
            <select value={supportTopic} onChange={(event) => setSupportTopic(event.target.value)}>
              <option value="schedule">Schedule</option>
              <option value="rsvp">RSVP</option>
              <option value="registration">Registration</option>
              <option value="media">Media</option>
              <option value="notifications">Notifications</option>
            </select>
          </label>
          <label>
            Details
            <textarea value={supportDetail} onChange={(event) => setSupportDetail(event.target.value)} rows={4} />
          </label>
          <button disabled={isHelpPending || !supportDetail.trim()} onClick={submitSupportRequest}>Submit support request</button>
          <p className="muted">Staff routing is not connected yet; this keeps the parent intake path visible without implying a connected helpdesk or provider send.</p>
        </article>
        <article className="card stack">
          <h2>Support routing context</h2>
          <p><strong>Family:</strong> {parentUser?.name ?? "Parent account"}</p>
          <p><strong>Linked teams:</strong> {dashboard.children.map(({ team }) => team.name).join(", ") || "No approved team links"}</p>
          <p className="muted">Staff should see team, child, RSVP, and notification context before replying.</p>
        </article>
      </section>
        </>
      )}
    </div>
  );
}

export function ParentRsvpClient({ dashboardData }: { dashboardData?: ParentCoachDashboardData | null } = {}) {
  const { state, dispatch } = useAppState();
  const [snapshotRsvps, setSnapshotRsvps] = useState(() => dashboardData?.state.rsvps ?? []);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const sourceState = dashboardData?.state ?? state;
  const displayState = dashboardData ? { ...sourceState, rsvps: snapshotRsvps } : sourceState;
  const parentUserId = dashboardData?.parentUserId ?? "user-parent-jordan";
  const parentUser = displayState.users.find((user) => user.id === parentUserId);
  const dashboard = getParentDashboard(displayState, parentUserId, NOW);
  const accessGate = privateAccessGate(dashboardData, "parent");
  const isArchivedSeason = displayState.activeSeason.status === "archived";
  const rsvpHistory = displayState.rsvps
    .filter((rsvp) => rsvp.parentUserId === parentUserId)
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
    .slice(0, 6);
  const events = dashboard.nextEvents.flatMap((event) => dashboard.children
    .filter(({ player }) => player.teamId === event.teamId)
    .map(({ player }) => ({
      event,
      player,
      rsvp: displayState.rsvps.find((item) => item.eventId === event.id && item.playerId === player.id)
    })));

  function save(eventId: string, playerId: string, response: RsvpResponse) {
    startTransition(async () => {
      const apiResponse = await authenticatedJsonFetch("/api/rsvps", { eventId, playerId, response });
      const result = await apiResponse.json().catch(() => null) as { ok?: boolean; message?: string } | null;
      setMessage(result?.message ?? "RSVP could not be saved.");
      if (!result?.ok) return;

      const input = { eventId, playerId, parentUserId, response, now: new Date().toISOString() };
      const preview = setRsvp(displayState, input);
      if (!preview.ok) return;
      if (dashboardData) {
        setSnapshotRsvps(preview.state.rsvps);
      } else {
        dispatch({ type: "setRsvp", input });
      }
    });
  }

  return (
    <div className="page">
      <section className="hero">
        <span className="eyebrow">One-tap RSVP</span>
        <h1>Parents answer attendance for linked children only.</h1>
        <p className="lead">This view is scoped to {parentUser?.name ?? "the selected parent"}. It enforces the same parent-child permission rule used by the domain tests.</p>
      </section>

      <p className={`notice ${dashboardData?.isSupabaseBacked ? "ok" : "warning"}`}>
        {dashboardData?.accessStatus === "live" ? "RSVP rows and button payloads are loaded from Supabase." : dashboardData?.message ?? "Showing local seed fallback until Supabase has linked parent and coach records."}
      </p>
      {isArchivedSeason ? <p className="notice warning">Archived RSVP read-only mode is active. Past attendance remains visible, but edits are locked.</p> : null}
      {message ? <p className="notice">{message}</p> : null}
      {accessGate ?? (
      <section className="grid two">
        {events.map(({ event, player, rsvp }) => (
          <article className="card stack" key={`${event.id}-${player.id}`}>
            <div className="card-header">
              <h2>{event.title}</h2>
              <span className="badge">{rsvp?.response.replace("_", " ") ?? "no response"}</span>
            </div>
            <p>{player.firstName} {player.lastInitial}. · {formatDate(event.startsAt)} · {event.locationName}</p>
            <div className="toolbar">
              <button disabled={isPending || isArchivedSeason} onClick={() => save(event.id, player.id, "going")}>Going</button>
              <button disabled={isPending || isArchivedSeason} className="secondary" onClick={() => save(event.id, player.id, "maybe")}>Maybe</button>
              <button disabled={isPending || isArchivedSeason} className="secondary" onClick={() => save(event.id, player.id, "not_going")}>Not going</button>
              <button disabled={isPending || isArchivedSeason} className="secondary" onClick={() => save(event.id, player.id, "cancelled")}>Cancel RSVP</button>
            </div>
          </article>
        ))}
        <article className="card stack">
          <h2>RSVP history</h2>
          {rsvpHistory.map((rsvp) => {
            const event = displayState.events.find((item) => item.id === rsvp.eventId);
            const player = displayState.players.find((item) => item.id === rsvp.playerId);
            return (
              <p key={rsvp.id}>
                <strong>{event?.title ?? "Event"}</strong><br />
                <span className="muted">{player ? `${player.firstName} ${player.lastInitial}.` : "Player"} - {rsvp.response.replace("_", " ")} - {formatDate(rsvp.updatedAt)}</span>
              </p>
            );
          })}
          {!rsvpHistory.length ? <p className="muted">No RSVP history yet.</p> : null}
        </article>
      </section>
      )}
    </div>
  );
}

export function CoachDashboardClient({ dashboardData }: { dashboardData?: ParentCoachDashboardData | null } = {}) {
  const { state } = useAppState();
  const [actionMessage, setActionMessage] = useState("");
  const [isActionPending, startActionTransition] = useTransition();
  const sourceState = dashboardData?.state ?? state;
  const coachId = dashboardData?.coachUserId ?? "user-coach-taylor";
  const coachUser = sourceState.users.find((user) => user.id === coachId);
  const assignedTeamIds = new Set(sourceState.teamMemberships.filter((membership) => (
    membership.userId === coachId && membership.role === "coach" && membership.status === "active"
  )).map((membership) => membership.teamId));
  const teams = sourceState.teams.filter((team) => assignedTeamIds.has(team.id));
  const summaries = getCoachRsvpSummaries(sourceState, coachId, NOW);
  const coachSuggestions = buildCoachAssistiveSuggestions(sourceState, coachId, NOW);
  const reliabilityRows = getCoachRsvpReliability(sourceState, coachId, NOW);
  const rsvpReminderQueue = reliabilityRows.filter((row) => row.noResponse > 0);
  const teamIds = new Set(teams.map((team) => team.id));
  const assignedEvents = sourceState.events.filter((event) => teamIds.has(event.teamId) && event.status === "scheduled");
  const nextAssignedEvent = assignedEvents[0];
  const weatherAlerts = sourceState.weatherAlerts.filter((alert) => teamIds.has(alert.teamId));
  const weatherApprovalQueue = getWeatherApprovalQueue(sourceState).filter((item) => teamIds.has(item.alert.teamId));
  const weatherRetryLogs = getWeatherProviderRetryLogs(sourceState).filter((item) => teamIds.has(item.alert.teamId));
  const weatherAlertHistory = getWeatherAlertHistory(sourceState).filter((item) => teamIds.has(item.alert.teamId));
  const sportWeatherThresholds = getSportWeatherThresholds("baseball");
  const leagueWeatherThresholds = getLeagueWeatherThresholds(teams[0]?.division ?? "3U");
  const weatherThresholdReview = evaluateWeatherThresholds({
    heatIndex: 91,
    lightningMiles: 8,
    airQualityIndex: 105,
    rainInchesPerHour: 0.3,
    thresholds: {
      heatIndex: leagueWeatherThresholds.heatIndex,
      lightningMiles: leagueWeatherThresholds.lightningMiles,
      airQualityIndex: leagueWeatherThresholds.airQualityIndex
    }
  });
  const fieldClosureDraft = createFieldClosureDraft({ eventTitle: nextAssignedEvent?.title ?? "Selected event", reason: "rain or field safety thresholds need review" });
  const weatherEscalation = getWeatherEscalationRules(weatherThresholdReview);
  const weatherSafetyNotes = getWeatherSafetyNotes();
  const volunteerNeeds = sourceState.volunteerSignups.filter((signup) => teamIds.has(signup.teamId) && signup.status === "open");
  const snackNeeds = sourceState.snackScheduleSlots.filter((slot) => teamIds.has(slot.teamId) && slot.status === "open");
  const accessGate = privateAccessGate(dashboardData, "coach");
  const coachOnboardingSteps = [
    { label: "Active coach membership", done: teams.length > 0, detail: teams.map((team) => team.name).join(", ") || "No assigned teams." },
    { label: "Review attendance snapshot", done: summaries.length > 0, detail: `${summaries.length} upcoming assigned event(s).` },
    { label: "Check weather and family help", done: weatherAlerts.length + snackNeeds.length + volunteerNeeds.length > 0, detail: `${weatherAlerts.length} weather alert(s), ${snackNeeds.length} snack slot(s), ${volunteerNeeds.length} volunteer role(s).` },
    { label: "Prepare parent update", done: true, detail: "Weekly update draft is ready for review." }
  ];
  const weeklyUpdateDraft = [
    `This week: ${assignedEvents.slice(0, 2).map((event) => `${event.title} at ${event.locationName}`).join("; ") || "No scheduled events."}`,
    `RSVP gaps: ${summaries.reduce((total, summary) => total + summary.noResponse, 0)} no-response player slot(s).`,
    `Weather: ${weatherAlerts[0] ? `${weatherAlerts[0].headline} - ${weatherAlerts[0].detail}` : "No weather alert drafted."}`,
    `Snacks: ${snackNeeds.length ? `${snackNeeds.length} open snack slot(s).` : "Snack coverage looks set."}`,
    `Volunteers: ${volunteerNeeds.length ? `${volunteerNeeds.length} open volunteer role(s).` : "Volunteer coverage looks set."}`,
    "Announcement: Please review RSVP and game-day details before the next event."
  ];
  const [weeklyUpdateBody, setWeeklyUpdateBody] = useState(weeklyUpdateDraft.join("\n"));

  function runCoachAction(url: string, payload: unknown) {
    setActionMessage("");
    startActionTransition(async () => {
      const response = await authenticatedJsonFetch(url, payload);
      const result = await response.json().catch(() => null) as { ok?: boolean; message?: string } | null;
      setActionMessage(result?.message ?? (response.ok ? "Action saved." : "Action could not be saved."));
    });
  }

  function saveWeeklyUpdate() {
    const teamId = teams[0]?.id;
    if (!teamId) {
      setActionMessage("An assigned team is required before saving a weekly update.");
      return;
    }

    runCoachAction("/api/coach/weekly-update", {
      teamId,
      title: `Weekly update for ${teams[0]?.name ?? "team"}`,
      body: weeklyUpdateBody
    });
  }

  function draftRsvpReminder(parentName: string, noResponse: number) {
    setActionMessage(`RSVP reminder draft queued for ${parentName}: ${noResponse} missing response(s). Provider sending remains approval-gated.`);
  }

  return (
    <div className="page">
      <section className="hero">
        <span className="eyebrow">Coach dashboard</span>
        <h1>{coachUser?.name ?? "Coach"}&apos;s week, attendance, replay, and team help in one view.</h1>
        <p className="lead">This view is scoped to assigned teams and now sends weather, snack, and volunteer actions through the private Supabase APIs when a coach is signed in.</p>
      </section>

      <p className={`notice ${dashboardData?.isSupabaseBacked ? "ok" : "warning"}`}>
        {dashboardData?.message ?? "Showing local seed fallback until Supabase has linked parent and coach records."}
      </p>
      {actionMessage ? <p className="notice">{actionMessage}</p> : null}
      {accessGate ?? (
        <>

      <section className="grid three">
        <article className="card metric"><span className="muted">Assigned teams</span><strong>{teams.length}</strong></article>
        <article className="card metric"><span className="muted">Open volunteer roles</span><strong>{volunteerNeeds.length}</strong></article>
        <article className="card metric"><span className="muted">Open snack slots</span><strong>{snackNeeds.length}</strong></article>
      </section>

      <section className="card stack">
        <div className="card-header">
          <div>
            <span className="eyebrow">Coach onboarding</span>
            <h2>Assigned-team setup checklist</h2>
          </div>
          <span className="badge">{coachOnboardingSteps.filter((step) => !step.done).length} open</span>
        </div>
        {coachOnboardingSteps.map((step) => (
          <p key={step.label}>
            <span className={`badge ${step.done ? "ok" : "warning"}`}>{step.done ? "Done" : "Next"}</span>{" "}
            <strong>{step.label}</strong><br />
            <span className="muted">{step.detail}</span>
          </p>
        ))}
      </section>

      <section className="grid two">
        {coachSuggestions.map((suggestion) => (
          <article className="card stack" key={suggestion.id}>
            <span className="eyebrow">Coach assistant</span>
            <h2>{suggestion.title}</h2>
            <p><strong>{suggestion.body}</strong></p>
            <p>{suggestion.recommendation}</p>
            <p className="muted">{suggestion.boundary}</p>
          </article>
        ))}
      </section>

      <section className="grid two">
        <article className="card stack">
          <h2>Attendance snapshot</h2>
          {summaries.map((summary) => (
            <p key={summary.event.id}><strong>{summary.event.title}</strong><br /><span className="muted">Going {summary.going}, maybe {summary.maybe}, no response {summary.noResponse}</span></p>
          ))}
        </article>
        <article className="card stack">
          <h2>Weather and alerts</h2>
          {nextAssignedEvent ? (
            <button
              disabled={isActionPending}
              onClick={() => runCoachAction("/api/weather-alerts/draft", { eventId: nextAssignedEvent.id })}
            >
              Draft weather alert
            </button>
          ) : null}
          {weatherAlerts.map((alert) => (
            <p className="notice" key={alert.id}><strong>{alert.headline}</strong><br />{alert.detail}</p>
          ))}
          {!weatherAlerts.length ? <p className="muted">No weather alerts drafted for assigned teams.</p> : null}
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Rain thresholds</span>
              <h2>Rain-rate review</h2>
            </div>
            <span className={`badge ${weatherThresholdReview.rain === "review" ? "warning" : "ok"}`}>{weatherThresholdReview.rain}</span>
          </div>
          <p className="muted">Rain-rate thresholds create field review prompts before schedule changes or weather alerts are queued.</p>
        </article>

        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Field closure drafts</span>
              <h2>{fieldClosureDraft.title}</h2>
            </div>
            <span className="badge warning">Draft</span>
          </div>
          <p>{fieldClosureDraft.body}</p>
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Weather escalation rules</span>
              <h2>Escalation level</h2>
            </div>
            <span className={`badge ${weatherEscalation.level === "escalate" ? "danger" : "warning"}`}>{weatherEscalation.level}</span>
          </div>
          <p>{weatherEscalation.detail}</p>
        </article>

        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Weather safety notes</span>
              <h2>Coach guidance</h2>
            </div>
            <span className="badge ok">{weatherSafetyNotes.length} note(s)</span>
          </div>
          {weatherSafetyNotes.map((note) => <p className="muted" key={note}>{note}</p>)}
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">League-specific weather thresholds</span>
              <h2>{leagueWeatherThresholds.division} policy</h2>
            </div>
            <span className="badge warning">League</span>
          </div>
          <p>{leagueWeatherThresholds.detail}</p>
          <p className="muted">Heat {leagueWeatherThresholds.heatIndex}, lightning {leagueWeatherThresholds.lightningMiles} miles, AQI {leagueWeatherThresholds.airQualityIndex}.</p>
        </article>

        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Heat thresholds</span>
              <h2>Heat index review</h2>
            </div>
            <span className={`badge ${weatherThresholdReview.heat === "review" ? "warning" : "ok"}`}>{weatherThresholdReview.heat}</span>
          </div>
          <p className="muted">Heat index inputs create review prompts before practice or game changes are queued.</p>
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Lightning thresholds</span>
              <h2>Strike distance review</h2>
            </div>
            <span className={`badge ${weatherThresholdReview.lightning === "review" ? "warning" : "ok"}`}>{weatherThresholdReview.lightning}</span>
          </div>
          <p className="muted">Lightning within the configured mile radius requires coach/admin review before field activity continues.</p>
        </article>

        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Air quality thresholds</span>
              <h2>AQI review</h2>
            </div>
            <span className={`badge ${weatherThresholdReview.airQuality === "review" ? "warning" : "ok"}`}>{weatherThresholdReview.airQuality}</span>
          </div>
          <p className="muted">Air-quality thresholds stay policy prompts; they do not auto-cancel events or send parent alerts.</p>
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Weather approval queue</span>
              <h2>Draft alerts needing review</h2>
            </div>
            <span className="badge warning">{weatherApprovalQueue.length} draft(s)</span>
          </div>
          {weatherApprovalQueue.map((item) => (
            <p key={item.alert.id}><strong>{item.alert.headline}</strong><br /><span className="muted">{item.team?.name ?? "Team"} · {item.event?.title ?? "Event"} · {item.approvalStatus}</span></p>
          ))}
          {!weatherApprovalQueue.length ? <p className="muted">No weather drafts need approval.</p> : null}
        </article>

        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Weather provider retry logs</span>
              <h2>Provider refresh review</h2>
            </div>
            <span className="badge">{weatherRetryLogs.length} retry log(s)</span>
          </div>
          {weatherRetryLogs.map((item) => (
            <p key={item.alert.id}><strong>{item.provider}</strong><br /><span className="muted">{item.alert.headline} · retry {formatDate(item.nextRetryAt)} · {item.reason}</span></p>
          ))}
          {!weatherRetryLogs.length ? <p className="muted">No high-risk weather provider retries are pending.</p> : null}
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Weather alert history</span>
              <h2>Recent weather decisions</h2>
            </div>
            <span className="badge">{weatherAlertHistory.length} alert(s)</span>
          </div>
          {weatherAlertHistory.map((item) => (
            <p key={item.alert.id}><strong>{item.alert.headline}</strong><br /><span className="muted">{item.eventTitle} · {item.alert.severity} · {item.alert.status} · {formatDate(item.alert.createdAt)}</span></p>
          ))}
        </article>

        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Sport-specific weather thresholds</span>
              <h2>Baseball safety policy</h2>
            </div>
            <span className="badge warning">Policy</span>
          </div>
          <p>{sportWeatherThresholds.detail}</p>
          <p className="muted">Thresholds create coach/admin review prompts only; parent weather delivery remains deferred.</p>
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">RSVP reliability tracker</span>
              <h2>Family response patterns</h2>
            </div>
            <span className="badge warning">Coach only</span>
          </div>
          {reliabilityRows.map((row) => (
            <p key={row.parentUser?.id ?? row.linkedPlayers.map((player) => player.id).join("-")}>
              <strong>{row.parentUser?.name ?? "Linked family"}</strong>
              <br />
              <span className="muted">{row.responseRate}% response rate · {row.noResponse} no response · {row.lateChanges} late change(s) · {row.reminderMode}</span>
            </p>
          ))}
          {!reliabilityRows.length ? <p className="muted">No active parent response history for assigned teams.</p> : null}
        </article>
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">RSVP reminder queue</span>
              <h2>No-response drafts</h2>
            </div>
            <span className="badge warning">{rsvpReminderQueue.length} queued</span>
          </div>
          {rsvpReminderQueue.map((row) => (
            <div className="stack compact" key={row.parentUser?.id ?? row.linkedPlayers.map((player) => player.id).join("-")}>
              <p><strong>{row.parentUser?.name ?? "Linked family"}</strong><br /><span className="muted">{row.noResponse} no response · {row.linkedPlayers.map((player) => `${player.firstName} ${player.lastInitial}.`).join(", ")}</span></p>
              <button
                className="secondary"
                disabled={isActionPending}
                onClick={() => draftRsvpReminder(row.parentUser?.name ?? "linked family", row.noResponse)}
              >
                Queue RSVP reminder draft
              </button>
            </div>
          ))}
          {!rsvpReminderQueue.length ? <p className="muted">No RSVP reminder drafts are needed.</p> : null}
          <p className="muted">Provider sending remains approval-gated. Queueing here is a coach draft status only; email, SMS, and push delivery stay behind provider approval rules.</p>
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Coach weekly update builder</span>
              <h2>Editable weekly message</h2>
            </div>
            <span className="badge ok">Draft</span>
          </div>
          <textarea value={weeklyUpdateBody} onChange={(event) => setWeeklyUpdateBody(event.target.value)} rows={8} />
          <button disabled={isActionPending || !weeklyUpdateBody.trim()} onClick={saveWeeklyUpdate}>Save weekly update draft</button>
          <p className="muted">Combines schedule, RSVP gaps, weather drafts, snack slots, volunteer roles, and announcement copy. Saving creates an announcement and pending notification drafts only; provider sending remains approval-gated.</p>
        </article>
      </section>

      <section className="grid three">
        <article className="card stack">
          <h2>Parent Replay</h2>
          <p>Use the recap builder after practice to generate parent activities and team quests.</p>
          <a href="/coach/parent-replay">Open Parent Replay</a>
        </article>
        <article className="card stack">
          <h2>Snacks</h2>
          {sourceState.snackScheduleSlots.filter((slot) => teamIds.has(slot.teamId)).map((slot) => (
            <div className="stack compact" key={slot.id}>
              <p>{slot.item} - {slot.status}</p>
              {slot.status === "open" ? (
                <button
                  className="secondary"
                  disabled={isActionPending}
                  onClick={() => runCoachAction("/api/snack-slots/claim", { slotId: slot.id })}
                >
                  Claim snack slot
                </button>
              ) : null}
            </div>
          ))}
        </article>
        <article className="card stack">
          <h2>Volunteers</h2>
          {sourceState.volunteerSignups.filter((signup) => teamIds.has(signup.teamId)).map((signup) => (
            <div className="stack compact" key={signup.id}>
              <p>{signup.role} - {signup.status}</p>
              {signup.status === "open" ? (
                <button
                  className="secondary"
                  disabled={isActionPending}
                  onClick={() => runCoachAction("/api/volunteer-signups/claim", { signupId: signup.id })}
                >
                  Claim volunteer role
                </button>
              ) : null}
            </div>
          ))}
        </article>
      </section>
        </>
      )}
    </div>
  );
}

interface AdminDashboardClientProps {
  registrationRequests?: RegistrationRequest[];
  sponsorData?: SponsorAdminData;
  mediaData?: MediaGovernanceData;
}

export function AdminDashboardClient({ registrationRequests, sponsorData, mediaData }: AdminDashboardClientProps = {}) {
  const { state, dispatch } = useAppState();
  const healthCards = computeAdminHealth(state, NOW);
  const adminSuggestions = buildAdminAssistiveSuggestions(state, NOW);
  const visibleRegistrations = registrationRequests ?? state.registrationRequests;
  const pendingRegistrations = visibleRegistrations.filter((request) => request.status === "pending");
  const sponsorTeams = sponsorData?.teams.length ? sponsorData.teams : state.teams;
  const mediaTeams = mediaData?.teams.length ? mediaData.teams : state.teams;
  const initialSponsors = sponsorData?.sponsors.length ? sponsorData.sponsors : state.sponsors;
  const initialMediaItems = mediaData?.mediaItems.length ? mediaData.mediaItems : state.mediaItems;
  const [sponsors, setSponsors] = useState<Sponsor[]>(initialSponsors);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>(initialMediaItems);
  const mediaReportingSummary = getMediaReportingSummary(mediaItems);
  const uploadStorageProvider = getUploadStorageProviderStatus(false);
  const mediaRetentionPolicy = getMediaRetentionPolicy();
  const parentVisibleMediaCount = mediaItems.filter((item) => canViewMediaByRole(item, "parent")).length;
  const activeSponsors = sponsors.filter((sponsor) => sponsor.status === "active");
  const sponsorDisplayPolicy = getSponsorPublicDisplayPolicy();
  const scheduleSponsorPlacement = getScheduleSponsorPlacement(sponsors);
  const mediaGallerySponsorPlacement = getMediaGallerySponsorPlacement(sponsors);
  const emailSponsorPlacement = getEmailSponsorPlacement(sponsors);
  const bannerSponsorPlacement = getBannerSponsorPlacement(sponsors);
  const sponsorBillingProofs = buildSponsorBillingProofs(sponsors);
  const touchTargetQa = getTouchTargetQa();
  const offlineStateSummary = getOfflineStateSummary();
  const cacheInvalidationPolicy = getCacheInvalidationPolicy();
  const manualDarkToggle = getManualDarkToggleState(false);
  const contrastChecks = getAccessibilityContrastChecks();
  const privacyFilters = getPrivacyFilters();
  const inviteAcceptanceRate = getInviteAcceptanceRate(state);
  const averageInviteToAccountTime = getAverageInviteToAccountTimeHours(state);
  const failedInviteCount = getFailedInviteCount(state);
  const parentLinkCompletionRate = getParentLinkCompletionRate(state);
  const rsvpResponseRate = getRsvpResponseRate(state);
  const scheduleAlertOpenRate = getScheduleAlertOpenRate(state);
  const weeklyActiveParents = getWeeklyActiveParents(state);
  const supportRequestsPerTeam = getSupportRequestsPerTeam(state);
  const csvImportErrorRate = getCsvImportErrorRate(state);
  const coachWeeklyUpdateSendRate = getCoachWeeklyUpdateSendRate(state);
  const gameDayCalmModeUsage = getGameDayCalmModeUsage(state);
  const parentReplayCompletionRate = getParentReplayCompletionRate(state);
  const microCoachingStreakRate = getMicroCoachingStreakRate(state);
  const mediaEngagementRate = getMediaEngagementRate(state);
  const notificationOptOutRate = getNotificationOptOutRate(state);
  const [communicationTeamId, setCommunicationTeamId] = useState("team-tigers");
  const [communicationChannel, setCommunicationChannel] = useState<AdminCommunicationChannel>("email");
  const [communicationTemplate, setCommunicationTemplate] = useState<CommunicationTemplate>("weekly_digest");
  const [communicationSubject, setCommunicationSubject] = useState("This week with Tiny Tigers");
  const [communicationBody, setCommunicationBody] = useState("Practice, game-day details, RSVP needs, snacks, volunteer openings, and the latest Parent Replay are ready for Tiny Tigers families.");
  const [communicationMessage, setCommunicationMessage] = useState("");
  const [sponsorId, setSponsorId] = useState(initialSponsors[0]?.id ?? "new");
  const [sponsorName, setSponsorName] = useState(initialSponsors[0]?.name ?? "");
  const [sponsorLevel, setSponsorLevel] = useState<Sponsor["level"]>(initialSponsors[0]?.level ?? "league");
  const [sponsorTeamId, setSponsorTeamId] = useState(initialSponsors[0]?.teamId ?? sponsorTeams[0]?.id ?? "");
  const [sponsorUrl, setSponsorUrl] = useState(initialSponsors[0]?.url ?? "https://example.com");
  const [sponsorStatus, setSponsorStatus] = useState<Sponsor["status"]>(initialSponsors[0]?.status ?? "pending");
  const [sponsorPlacementKey, setSponsorPlacementKey] = useState<Sponsor["placementKey"] | "none">(initialSponsors[0]?.placementKey ?? "team_portal");
  const [sponsorLogoUrl, setSponsorLogoUrl] = useState(initialSponsors[0]?.logoUrl ?? "");
  const [sponsorMessage, setSponsorMessage] = useState(sponsorData?.message ?? "Showing local sponsor records until Supabase sponsor rows are available.");
  const [isSponsorPending, startSponsorTransition] = useTransition();
  const [mediaMessage, setMediaMessage] = useState(mediaData?.message ?? "Showing local media records until Supabase media rows are available.");
  const [mediaVisibilityDrafts, setMediaVisibilityDrafts] = useState<Record<string, "team" | "organization">>(() => Object.fromEntries(
    initialMediaItems.map((item) => [item.id, item.visibility ?? "team"])
  ));
  const [isMediaPending, startMediaTransition] = useTransition();
  const [lineupTeamId, setLineupTeamId] = useState("team-tigers");
  const [draggedPlayerId, setDraggedPlayerId] = useState("");
  const [targetRosterSize, setTargetRosterSize] = useState(10);
  const [planningDivision, setPlanningDivision] = useState("3U");
  const [lineupPositions, setLineupPositions] = useState<Partial<Record<LineupPositionId, string>>>({
    pitcher: "player-mason",
    catcher: "player-avery"
  });
  const seasonPlanning = useMemo(() => computeSeasonPlanningMetrics(state, targetRosterSize), [state, targetRosterSize]);
  const selectedPlanningDivision = seasonPlanning.divisions.find((division) => division.division === planningDivision) ?? seasonPlanning.divisions[0];
  const selectedBracketRound = seasonPlanning.bracketRounds.find((round) => round.division === selectedPlanningDivision?.division);
  const teamBuildPreview = useMemo(() => previewBalancedTeamBuild(state, {
    division: selectedPlanningDivision?.division ?? planningDivision,
    targetRosterSize,
    actorUserId: "user-admin",
    now: NOW,
    skillRatings: {
      "player-mason": 4,
      "player-avery": 3,
      "player-noah": 3,
      "player-ella": 4,
      "player-liam": 2
    },
    friendRequests: [
      { playerId: "player-mason", friendPlayerId: "player-avery" }
    ]
  }), [planningDivision, selectedPlanningDivision?.division, state, targetRosterSize]);
  const communicationPreview = useMemo(() => previewTeamCommunication(state, {
    teamId: communicationTeamId,
    actorUserId: "user-admin",
    channel: communicationChannel,
    template: communicationTemplate,
    subject: communicationSubject,
    body: communicationBody,
    sendAt: new Date(Date.parse(NOW) + 60 * 60 * 1000).toISOString(),
    now: NOW
  }), [communicationBody, communicationChannel, communicationSubject, communicationTeamId, communicationTemplate, state]);
  const lineupTeam = state.teams.find((team) => team.id === lineupTeamId) ?? state.teams[0]!;
  const lineupPlayers = state.players.filter((player) => player.teamId === lineupTeam.id);
  const assignedPlayerIds = new Set(Object.values(lineupPositions).filter(Boolean));
  const unassignedLineupPlayers = lineupPlayers.filter((player) => !assignedPlayerIds.has(player.id));

  useEffect(() => {
    const copy = defaultTeamCommunicationCopy(state, communicationTeamId, communicationTemplate);
    setCommunicationSubject(copy.subject);
    setCommunicationBody(copy.body);
  }, [communicationTeamId, communicationTemplate, state]);

  useEffect(() => {
    if (!sponsorData) return;
    const nextSponsors = sponsorData.sponsors.length ? sponsorData.sponsors : state.sponsors;
    setSponsors(nextSponsors);
    setSponsorMessage(sponsorData.message);
  }, [sponsorData, state.sponsors]);

  useEffect(() => {
    if (!mediaData) return;
    const nextMediaItems = mediaData.mediaItems.length ? mediaData.mediaItems : state.mediaItems;
    setMediaItems(nextMediaItems);
    setMediaVisibilityDrafts(Object.fromEntries(nextMediaItems.map((item) => [item.id, item.visibility ?? "team"])));
    setMediaMessage(mediaData.message);
  }, [mediaData, state.mediaItems]);

  function selectSponsor(nextSponsorId: string) {
    setSponsorId(nextSponsorId);
    const sponsor = sponsors.find((item) => item.id === nextSponsorId);
    if (!sponsor) {
      setSponsorName("");
      setSponsorLevel("league");
      setSponsorTeamId(sponsorTeams[0]?.id ?? "");
      setSponsorUrl("https://example.com");
      setSponsorStatus("pending");
      setSponsorPlacementKey("team_portal");
      setSponsorLogoUrl("");
      return;
    }
    setSponsorName(sponsor.name);
    setSponsorLevel(sponsor.level);
    setSponsorTeamId(sponsor.teamId ?? sponsorTeams[0]?.id ?? "");
    setSponsorUrl(sponsor.url);
    setSponsorStatus(sponsor.status);
    setSponsorPlacementKey(sponsor.placementKey ?? "none");
    setSponsorLogoUrl(sponsor.logoUrl ?? "");
  }

  function saveSponsorDraft() {
    setSponsorMessage("");
    startSponsorTransition(async () => {
      const response = await authenticatedJsonFetch("/api/admin/sponsors", {
        organizationId: sponsorData?.organizationId ?? state.organization.id,
        sponsorId: sponsorId === "new" ? undefined : sponsorId,
        name: sponsorName,
        level: sponsorLevel,
        teamId: sponsorLevel === "team" ? sponsorTeamId : undefined,
        url: sponsorUrl,
        status: sponsorStatus,
        placementKey: sponsorPlacementKey === "none" ? undefined : sponsorPlacementKey,
        logoUrl: sponsorLogoUrl || undefined
      });
      const result = await response.json().catch(() => null) as {
        ok?: boolean;
        message?: string;
        sponsor?: Sponsor;
      } | null;

      if (result?.ok && result.sponsor) {
        setSponsors((current) => {
          const exists = current.some((item) => item.id === result.sponsor!.id);
          return exists
            ? current.map((item) => item.id === result.sponsor!.id ? result.sponsor! : item)
            : [result.sponsor!, ...current];
        });
        setSponsorId(result.sponsor.id);
      }

      setSponsorMessage(result?.message ?? "Sponsor could not be saved.");
    });
  }

  function runMediaModeration(mediaItem: MediaItem, status: "approved" | "hidden" | "rejected" | "removed", reason: string) {
    setMediaMessage("");
    startMediaTransition(async () => {
      const visibility = mediaVisibilityDrafts[mediaItem.id] ?? mediaItem.visibility ?? "team";
      const response = await authenticatedJsonFetch("/api/media/moderation", {
        mediaItemId: mediaItem.id,
        status,
        visibility,
        reason
      });
      const result = await response.json().catch(() => null) as {
        ok?: boolean;
        message?: string;
        mediaItem?: { moderation_status?: MediaItem["moderationStatus"]; visibility?: MediaItem["visibility"] };
      } | null;

      if (result?.ok) {
        setMediaItems((current) => current.map((item) => item.id === mediaItem.id ? {
          ...item,
          moderationStatus: result.mediaItem?.moderation_status ?? status,
          visibility: result.mediaItem?.visibility ?? visibility
        } : item));
      }

      setMediaMessage(result?.message ?? "Media moderation could not be saved.");
    });
  }

  function queueCommunication() {
    if (!communicationPreview.ok) {
      setCommunicationMessage(communicationPreview.message);
      return;
    }

    dispatch({
      type: "queueTeamCommunication",
      input: {
        teamId: communicationTeamId,
        actorUserId: "user-admin",
        channel: communicationChannel,
        template: communicationTemplate,
        subject: communicationSubject,
        body: communicationBody,
        sendAt: new Date(Date.parse(NOW) + 60 * 60 * 1000).toISOString(),
        now: new Date().toISOString()
      }
    });
    setCommunicationMessage(`${communicationPreview.notificationCount} ${communicationChannel.toUpperCase()} automation record(s) queued. Provider delivery is still disconnected.`);
  }

  function assignLineupPlayer(positionId: LineupPositionId) {
    if (!draggedPlayerId) return;
    setLineupPositions((current) => {
      const next = Object.fromEntries(
        Object.entries(current).filter(([, playerId]) => playerId !== draggedPlayerId)
      ) as Partial<Record<LineupPositionId, string>>;
      next[positionId] = draggedPlayerId;
      return next;
    });
    setDraggedPlayerId("");
  }

  return (
    <div className="page">
      <section className="hero">
        <span className="eyebrow">Admin dashboard</span>
        <h1>League operations across teams, registrations, sponsors, notifications, and readiness.</h1>
        <p className="lead">Admin actions remain local and review-oriented. Provider sends, account grants, and payment/sponsor billing are not connected.</p>
      </section>

      <section className="grid three">
        <article className="card metric"><span className="muted">Teams</span><strong>{state.teams.length}</strong></article>
        <article className="card metric"><span className="muted">Pending registrations</span><strong>{pendingRegistrations.length}</strong></article>
        <article className="card metric"><span className="muted">Active sponsors</span><strong>{activeSponsors.length}</strong></article>
      </section>

      <section className="grid two">
        {adminSuggestions.map((suggestion) => (
          <article className="card stack" key={suggestion.id}>
            <span className="eyebrow">Admin copilot</span>
            <h2>{suggestion.title}</h2>
            <p><strong>{suggestion.body}</strong></p>
            <p>{suggestion.recommendation}</p>
            <p className="muted">{suggestion.boundary}</p>
          </article>
        ))}
      </section>

      <section className="grid two">
        <article className="card stack">
          <h2>Team management</h2>
          {state.teams.map((team) => (
            <p key={team.id}><strong>{team.name}</strong><br /><span className="muted">{team.division} - {team.mascot} - {getProgramThemePreset(team.themeKey).label}</span></p>
          ))}
          <a href="/admin/themes">Open admin theme console</a>
        </article>
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Email automation and mass SMS</span>
              <h2>Communication console</h2>
            </div>
            <span className={`badge ${communicationPreview.ok ? "ok" : "warning"}`}>{communicationPreview.notificationCount} recipient(s)</span>
          </div>
          <div className="grid two">
            <label>
              Team
              <select value={communicationTeamId} onChange={(event) => setCommunicationTeamId(event.target.value)}>
                {state.teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
              </select>
            </label>
            <label>
              Automation
              <select value={communicationTemplate} onChange={(event) => setCommunicationTemplate(event.target.value as CommunicationTemplate)}>
                {communicationTemplates.map((template) => <option key={template.id} value={template.id}>{template.label}</option>)}
              </select>
            </label>
            <label>
              Channel
              <select value={communicationChannel} onChange={(event) => setCommunicationChannel(event.target.value as AdminCommunicationChannel)}>
                <option value="email">Email automation</option>
                <option value="sms">Mass SMS</option>
              </select>
            </label>
            <label>
              Subject
              <input value={communicationSubject} onChange={(event) => setCommunicationSubject(event.target.value)} />
            </label>
          </div>
          <label>
            Message
            <textarea value={communicationBody} onChange={(event) => setCommunicationBody(event.target.value)} />
          </label>
          <div className="communication-preview">
            <p><strong>{communicationPreview.message}</strong></p>
            <p className="muted">SMS length: {communicationBody.length} character(s), {communicationPreview.smsSegments} segment(s). Email/SMS records stay pending until a provider adapter is connected.</p>
            {communicationPreview.recipients.slice(0, 4).map((recipient) => (
              <span className="badge" key={recipient.id}>{recipient.name}</span>
            ))}
          </div>
          <button disabled={!communicationPreview.ok} onClick={queueCommunication}>Queue automation records</button>
          {communicationMessage ? <p className="notice">{communicationMessage}</p> : null}
        </article>
      </section>

      <section className="grid two">
        <article className="card stack season-planning-panel">
          <div className="card-header">
            <div>
              <span className="eyebrow">Start-of-season metrics</span>
              <h2>Roster maker readiness</h2>
            </div>
            <span className="badge">{seasonPlanning.seasonName}</span>
          </div>
          <div className="grid three">
            <div className="metric"><span className="muted">Teams</span><strong>{seasonPlanning.totalTeams}</strong></div>
            <div className="metric"><span className="muted">Players</span><strong>{seasonPlanning.totalPlayers}</strong></div>
            <div className="metric"><span className="muted">Open roster spots</span><strong>{seasonPlanning.rosterOpenings}</strong></div>
          </div>
          <div className="grid two">
            <label>
              Target roster size
              <input
                max={16}
                min={6}
                onChange={(event) => setTargetRosterSize(Number(event.target.value))}
                type="number"
                value={targetRosterSize}
              />
            </label>
            <label>
              Division
              <select value={selectedPlanningDivision?.division ?? ""} onChange={(event) => setPlanningDivision(event.target.value)}>
                {seasonPlanning.divisions.map((division) => <option key={division.division} value={division.division}>{division.division}</option>)}
              </select>
            </label>
          </div>
          {selectedPlanningDivision ? (
            <div className="maker-summary">
              <span className={`badge ${selectedPlanningDivision.balanceStatus === "balanced" ? "ok" : "warning"}`}>{selectedPlanningDivision.balanceStatus.replace("_", " ")}</span>
              <p><strong>{selectedPlanningDivision.division}:</strong> {selectedPlanningDivision.teamCount} team(s), {selectedPlanningDivision.playerCount} player(s), average roster {selectedPlanningDivision.averageRosterSize}</p>
              <p className="muted">{selectedPlanningDivision.rosterMakerNote}</p>
            </div>
          ) : null}
          <div className="maker-list">
            {seasonPlanning.divisions.map((division) => (
              <div className="maker-row" key={division.division}>
                <strong>{division.division}</strong>
                <span>{division.teamCount} teams</span>
                <span>{division.playerCount} players</span>
                <span>{division.largestRoster}/{division.smallestRoster} max/min</span>
              </div>
            ))}
          </div>
          <div className="stack compact">
            <h3>Automatic team builder preview</h3>
            <p className="muted"><strong>Workflow:</strong> {teamBuildPreview.workflow.join(" -> ")}</p>
            <p className="muted"><strong>Sibling/friend constraints:</strong> sibling groups stay together and friend requests are considered before roster balance.</p>
            <p className="muted"><strong>Publish boundary:</strong> {teamBuildPreview.publishBoundary}</p>
            {teamBuildPreview.teams.map((team) => (
              <p key={team.teamId}>
                <strong>{team.teamName}</strong><br />
                <span className="muted">{team.playerCount} player(s), skill-balance score {team.averageSkill}: {team.players.map((player) => player.name).join(", ") || "No players"}</span>
              </p>
            ))}
            {teamBuildPreview.warnings.slice(0, 3).map((warning) => <p className="notice" key={warning}>{warning}</p>)}
          </div>
        </article>

        <article className="card stack season-planning-panel">
          <div className="card-header">
            <div>
              <span className="eyebrow">Bracket maker</span>
              <h2>{selectedPlanningDivision?.division ?? "Division"} tournament preview</h2>
            </div>
            <span className="badge warning">Preview</span>
          </div>
          <p>{selectedPlanningDivision?.bracketMakerNote ?? "Select a division to preview bracket generation."}</p>
          <div className="bracket-preview">
            <strong>{selectedBracketRound?.round ?? "Round"}</strong>
            {(selectedBracketRound?.matchups ?? []).map((matchup) => (
              <div className="bracket-matchup" key={matchup}>{matchup}</div>
            ))}
          </div>
          <p className="notice">Roster maker and bracket maker are metrics-driven previews. They do not publish teams, schedules, seeds, or standings yet.</p>
        </article>
      </section>

      <section className="grid two">
        <article className="card stack lineup-builder">
          <div className="card-header">
            <div>
              <span className="eyebrow">Drag and drop SVG lineup</span>
              <h2>{lineupTeam.name} position board</h2>
            </div>
            <select value={lineupTeam.id} onChange={(event) => setLineupTeamId(event.target.value)} aria-label="Lineup team">
              {state.teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
            </select>
          </div>
          <svg className="lineup-field" viewBox="0 0 480 320" role="img" aria-label="Drag players onto baseball positions">
            <path className="lineup-grass" d="M36 302C52 122 148 24 240 24s188 98 204 278Z" />
            <path className="lineup-dirt" d="M240 290 120 170 240 50 360 170Z" />
            <path className="lineup-basepath" d="M240 284 126 170 240 56 354 170Z" />
            {lineupPositionDefs.map((position) => {
              const player = lineupPlayers.find((item) => item.id === lineupPositions[position.id]);
              return (
                <g
                  className={`lineup-dropzone ${player ? "assigned" : ""}`}
                  key={position.id}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => assignLineupPlayer(position.id)}
                >
                  <circle cx={position.x} cy={position.y} r="25" />
                  <text x={position.x} y={position.y - 4} textAnchor="middle">{position.shortLabel}</text>
                  <text x={position.x} y={position.y + 13} textAnchor="middle">{player ? `${player.firstName} ${player.lastInitial}.` : "Drop"}</text>
                </g>
              );
            })}
          </svg>
          <p className="muted">Drag a roster chip onto any SVG position. This local board does not publish lineup changes to families.</p>
        </article>
        <article className="card stack">
          <h2>Roster chips</h2>
          <div className="player-chip-list">
            {lineupPlayers.map((player) => (
              <button
                className={`player-chip ${assignedPlayerIds.has(player.id) ? "assigned" : ""}`}
                draggable
                key={player.id}
                onDragStart={() => setDraggedPlayerId(player.id)}
                type="button"
              >
                #{player.jersey} {player.firstName} {player.lastInitial}.
              </button>
            ))}
          </div>
          <h3>Unassigned</h3>
          {unassignedLineupPlayers.length ? unassignedLineupPlayers.map((player) => (
            <p key={player.id}>{player.firstName} {player.lastInitial}. - Jersey {player.jersey}</p>
          )) : <p className="muted">Every rostered player has a position.</p>}
        </article>
      </section>

      <section className="grid three">
        <article className="card stack">
          <h2>Queued communication records</h2>
          <p>{state.notifications.length} local notification records queued across push, email, and SMS channels.</p>
          {state.notifications.slice(0, 4).map((notification) => (
            <p key={notification.id}><strong>{notification.title}</strong><br /><span className="muted">{notification.channel} - {notification.status}</span></p>
          ))}
          <p className="muted">No provider send occurs without a production adapter and approval workflow.</p>
        </article>
        <article className="card stack">
          <h2>Registration queue</h2>
          {visibleRegistrations.map((request) => (
            <p key={request.id}><strong>{request.playerFirstName} {request.playerLastInitial}.</strong><br /><span className="muted">{request.parentName} - {request.status}</span></p>
          ))}
          {visibleRegistrations.length === 0 ? <p className="muted">No registration requests yet.</p> : null}
        </article>
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Visibility and moderation</span>
              <h2>Media governance</h2>
            </div>
            <span className="badge warning">Coach/Admin</span>
          </div>
          <p className="notice">{mediaMessage}</p>
          <div className="grid three">
            <div className="metric"><span className="muted">Media reports</span><strong>{mediaReportingSummary.totalReports}</strong></div>
            <div className="metric"><span className="muted">Pending review</span><strong>{mediaReportingSummary.pendingReview}</strong></div>
            <div className="metric"><span className="muted">Upload storage</span><strong>{uploadStorageProvider.provider}</strong></div>
          </div>
          <p className="muted">{uploadStorageProvider.detail}</p>
          <p><strong>Role-based media visibility:</strong> {parentVisibleMediaCount} item(s) currently visible to parents.</p>
          <p className="muted">Media retention policy: {mediaRetentionPolicy.seasonMedia}</p>
          {mediaItems.map((item) => {
            const team = mediaTeams.find((candidate) => candidate.id === item.teamId);
            const status = item.moderationStatus ?? "approved";
            const visibilityFlags = getPhotoVisibilityFlags(item);
            const takedownRequest = createMediaTakedownRequest(item, "Family requested media review.");
            return (
              <div className="stack compact" key={item.id}>
                <p>
                  <strong>{item.title}</strong><br />
                  <span className="muted">{team?.name ?? "Unknown team"} - {item.type.replace("_", " ")} - {status} - {item.reportCount ?? 0} report(s)</span>
                </p>
                <p className="muted">Photo visibility flags: team {visibilityFlags.teamVisible ? "yes" : "no"}, org {visibilityFlags.organizationVisible ? "yes" : "no"}, private album {visibilityFlags.privateAlbumOnly ? "yes" : "no"}.</p>
                <p className="muted">{takedownRequest.title} - {takedownRequest.status}</p>
                <label>
                  Team/org visibility
                  <select
                    value={mediaVisibilityDrafts[item.id] ?? item.visibility ?? "team"}
                    onChange={(event) => setMediaVisibilityDrafts((current) => ({
                      ...current,
                      [item.id]: event.target.value as "team" | "organization"
                    }))}
                  >
                    <option value="team">Team only</option>
                    <option value="organization">Organization</option>
                  </select>
                </label>
                <div className="button-row">
                  <button className="secondary" disabled={isMediaPending} onClick={() => {
                    const approved = approveMediaItem(item);
                    setMediaItems((current) => current.map((candidate) => candidate.id === item.id ? approved : candidate));
                    setMediaMessage(`${item.title} approved for ${mediaVisibilityDrafts[item.id] ?? item.visibility ?? "team"} visibility.`);
                  }}>Approve media</button>
                  <button className="secondary" disabled={isMediaPending} onClick={() => {
                    const rejected = rejectMediaItem(item);
                    setMediaItems((current) => current.map((candidate) => candidate.id === item.id ? rejected.item : candidate));
                    setMediaMessage(rejected.auditSummary);
                  }}>Reject media</button>
                  <button className="secondary" disabled={isMediaPending} onClick={() => runMediaModeration(item, "hidden", "Hidden pending coach/admin review.")}>Hide media</button>
                  <button className="secondary" disabled={isMediaPending} onClick={() => runMediaModeration(item, "approved", "Restored after review.")}>Restore media</button>
                  <button className="secondary" disabled={isMediaPending} onClick={() => runMediaModeration(item, "removed", "Removed by coach/admin moderation.")}>Remove media</button>
                </div>
              </div>
            );
          })}
          {mediaItems.length === 0 ? <p className="muted">No media links yet.</p> : null}
          <p className="muted">Reported or hidden media is excluded from parent-visible dashboards until it is restored by an assigned coach or organization admin.</p>
        </article>
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Sponsor CRUD</span>
              <h2>Sponsor management</h2>
            </div>
            <span className="badge warning">Admin only</span>
          </div>
          <p className="notice">{sponsorMessage}</p>
          <p><strong>Public display policy:</strong> {sponsorDisplayPolicy.status} - {sponsorDisplayPolicy.detail}</p>
          <p className="muted">Schedule sponsor placement: {scheduleSponsorPlacement.length}; media gallery sponsor placement: {mediaGallerySponsorPlacement.length}; email sponsor placement: {emailSponsorPlacement.length}; banner sponsor placement: {bannerSponsorPlacement.length}.</p>
          <div className="grid two">
            <label>
              Sponsor record
              <select value={sponsorId} onChange={(event) => selectSponsor(event.target.value)}>
                <option value="new">New sponsor</option>
                {sponsors.map((sponsor) => <option key={sponsor.id} value={sponsor.id}>{sponsor.name}</option>)}
              </select>
            </label>
            <label>
              Status workflow
              <select value={sponsorStatus} onChange={(event) => setSponsorStatus(event.target.value as Sponsor["status"])}>
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
              </select>
            </label>
            <label>
              Sponsor name
              <input value={sponsorName} onChange={(event) => setSponsorName(event.target.value)} />
            </label>
            <label>
              Sponsor URL
              <input value={sponsorUrl} onChange={(event) => setSponsorUrl(event.target.value)} />
            </label>
            <label>
              Level
              <select value={sponsorLevel} onChange={(event) => setSponsorLevel(event.target.value as Sponsor["level"])}>
                <option value="league">League sponsor</option>
                <option value="team">Team sponsor</option>
              </select>
            </label>
            <label>
              Team
              <select disabled={sponsorLevel !== "team"} value={sponsorTeamId} onChange={(event) => setSponsorTeamId(event.target.value)}>
                {sponsorTeams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
              </select>
            </label>
            <label>
              Sponsor placement
              <select value={sponsorPlacementKey} onChange={(event) => setSponsorPlacementKey(event.target.value as Sponsor["placementKey"] | "none")}>
                <option value="none">No public placement</option>
                <option value="team_portal">Team portal</option>
                <option value="weekly_digest">Weekly digest</option>
                <option value="storybook">Storybook</option>
                <option value="registration">Registration</option>
                <option value="field_map">Field map</option>
              </select>
            </label>
            <label>
              Sponsor logo URL
              <input value={sponsorLogoUrl} onChange={(event) => setSponsorLogoUrl(event.target.value)} placeholder="https://..." />
            </label>
          </div>
          <button disabled={isSponsorPending} onClick={saveSponsorDraft}>Save sponsor</button>
          <p className="muted">Stripe live collection is not connected. Sponsor billing proof stays separate from registration, RSVP, schedule, safety, and child-facing sponsor display.</p>
          <div className="stack compact">
            <h3>Sponsor billing proof</h3>
            <p className="muted">Stripe Product/Price, invoice proof, and payment proof are admin-only readiness records. Public sponsor placement does not depend on or reveal payment status.</p>
            {sponsorBillingProofs.slice(0, 3).map((proof) => (
              <p key={proof.sponsorId}>
                <strong>{proof.sponsorName}</strong><br />
                <span className="muted">Stripe Product/Price: {proof.priceLookupKey}; Invoice proof: {proof.invoiceReference}; Payment proof: {proof.paymentProofStatus}; ${(proof.amountCents / 100).toFixed(2)} {proof.currency.toUpperCase()}.</span>
              </p>
            ))}
            <p className="notice">Sponsor billing stays separate from child-facing display. Stripe keys must stay server-side and preferably use restricted keys.</p>
          </div>
          <div className="stack compact">
            {sponsors.map((sponsor) => (
              <p key={sponsor.id}>
                <strong>{sponsor.name}</strong><br />
                <span className="muted">{sponsor.level} - {sponsor.status} - {sponsor.placementKey ?? "no placement"}{sponsor.logoUrl ? " - logo queued" : ""}</span>
              </p>
            ))}
          </div>
        </article>
        <article className="card stack">
          <h2>Readiness</h2>
          {healthCards.slice(0, 3).map((card) => (
            <p key={card.id}>{card.title}: {card.count}</p>
          ))}
          <p><strong>Touch Target QA:</strong> {touchTargetQa.status} · {touchTargetQa.minimumPixels}px minimum.</p>
          <p><strong>Offline states:</strong> {offlineStateSummary.status} · {offlineStateSummary.detail}</p>
          <p><strong>Cache invalidation policy:</strong> {cacheInvalidationPolicy.strategy} · {cacheInvalidationPolicy.detail}</p>
          <p><strong>Manual dark toggle:</strong> {manualDarkToggle.label}</p>
          <p><strong>Accessibility contrast checks:</strong> {contrastChecks.length} reviewed surface(s).</p>
          <p><strong>Privacy filters:</strong> {privacyFilters.length} active filter(s).</p>
          <p><strong>Invite acceptance rate:</strong> {inviteAcceptanceRate}%</p>
          <p><strong>Average invite-to-account time:</strong> {averageInviteToAccountTime} hour(s)</p>
          <p><strong>Failed invite count:</strong> {failedInviteCount}</p>
          <p><strong>Parent link completion rate:</strong> {parentLinkCompletionRate}%</p>
          <p><strong>RSVP response rate:</strong> {rsvpResponseRate}%</p>
          <p><strong>Schedule alert open rate:</strong> {scheduleAlertOpenRate}%</p>
          <p><strong>Weekly active parents:</strong> {weeklyActiveParents}</p>
          <p><strong>Support requests per team:</strong> {supportRequestsPerTeam.length} team(s) tracked</p>
          <p><strong>CSV import error rate:</strong> {csvImportErrorRate}%</p>
          <p><strong>Coach weekly update send rate:</strong> {coachWeeklyUpdateSendRate}%</p>
          <p><strong>Game Day Calm Mode usage:</strong> {gameDayCalmModeUsage} game(s)</p>
          <p><strong>Parent Replay completion rate:</strong> {parentReplayCompletionRate}%</p>
          <p><strong>Micro-Coaching streak rate:</strong> {microCoachingStreakRate}%</p>
          <p><strong>Media engagement rate:</strong> {mediaEngagementRate}%</p>
          <p><strong>Notification opt-out rate:</strong> {notificationOptOutRate}%</p>
        </article>
      </section>
    </div>
  );
}

export function AdminThemesClient({ initialData }: { initialData: AdminThemeData }) {
  const [teams, setTeams] = useState(initialData.teams);
  const [audits, setAudits] = useState<TeamThemeAudit[]>(initialData.audits);
  const [tenantDefaults, setTenantDefaults] = useState<TenantThemeDefaults>(initialData.tenantDefaults);
  const [teamId, setTeamId] = useState(initialData.teams[0]?.id ?? "");
  const [actorUserId, setActorUserId] = useState(initialData.users.find((user) => user.role === "admin")?.id ?? initialData.users[0]?.id ?? "");
  const [drafts, setDrafts] = useState<Record<string, Pick<Team, "mascot" | "primaryColor" | "secondaryColor" | "themeKey">>>({});
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const team = teams.find((item) => item.id === teamId) ?? teams[0];
  const draft = team ? drafts[team.id] ?? {
    mascot: team.mascot,
    primaryColor: team.primaryColor,
    secondaryColor: team.secondaryColor,
    themeKey: team.themeKey
  } : null;
  const actors = initialData.users.filter((user) => user.role !== "parent");
  const selectedActorId = actors.some((user) => user.id === actorUserId) ? actorUserId : actors[0]?.id ?? actorUserId;
  const selectedContrast = draft ? contrastStatus(draft.primaryColor, draft.secondaryColor) : null;

  function updateDraft(field: "mascot" | "primaryColor" | "secondaryColor" | "themeKey", value: string) {
    if (!team || !draft) return;
    setDrafts((current) => ({
      ...current,
      [team.id]: {
        ...draft,
        [field]: value
      }
    }));
  }

  function applyTheme(nextThemeKey: ProgramThemeKey) {
    if (!team || !draft) return;
    const preset = getProgramThemePreset(nextThemeKey);
    setDrafts((current) => ({
      ...current,
      [team.id]: {
        ...draft,
        themeKey: preset.key,
        primaryColor: preset.primaryColor,
        secondaryColor: preset.secondaryColor,
        mascot: draft.mascot || preset.mascotHint
      }
    }));
  }

  function saveTheme() {
    if (!team || !draft) return;
    setMessage("");
    startTransition(async () => {
      const response = await authenticatedJsonFetch("/api/admin/team-branding", {
        teamId: team.id,
        mascot: draft.mascot,
        primaryColor: draft.primaryColor,
        secondaryColor: draft.secondaryColor,
        themeKey: draft.themeKey
      });
      const result = await response.json().catch(() => null) as {
        ok?: boolean;
        message?: string;
        team?: Team;
        audit?: TeamThemeAudit;
      } | null;

      if (result?.ok && result.team) {
        setTeams((current) => current.map((item) => item.id === result.team!.id ? result.team! : item));
        setDrafts((current) => {
          const next = { ...current };
          delete next[result.team!.id];
          return next;
        });
        if (result.audit) setAudits((current) => [result.audit!, ...current].slice(0, 25));
      }

      setMessage(result?.message ?? "Team theme could not be saved.");
    });
  }

  function saveTenantDefaults() {
    if (!draft) return;
    setMessage("");
    startTransition(async () => {
      const response = await authenticatedJsonFetch("/api/admin/theme-defaults", {
        organizationId: tenantDefaults.organizationId,
        themeKey: draft.themeKey,
        mascot: draft.mascot,
        primaryColor: draft.primaryColor,
        secondaryColor: draft.secondaryColor
      });
      const result = await response.json().catch(() => null) as {
        ok?: boolean;
        message?: string;
        tenantDefaults?: TenantThemeDefaults;
        audit?: TeamThemeAudit;
      } | null;

      if (result?.ok && result.tenantDefaults) setTenantDefaults(result.tenantDefaults);
      if (result?.audit) setAudits((current) => [result.audit!, ...current].slice(0, 25));
      setMessage(result?.message ?? "Tenant theme defaults could not be saved.");
    });
  }

  return (
    <div className="page admin-themes-page">
      <section className="hero">
        <span className="eyebrow">Admin theme console</span>
        <h1>First-class team branding control across every portal.</h1>
        <p className="lead">Update mascot, sport theme, and team colors from Supabase-backed records. The console shows mobile and dark previews, basic contrast checks, and audit evidence for saved changes.</p>
      </section>

      {message ? <p className="notice">{message}</p> : null}

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Theme editor</span>
              <h2>{team?.name ?? "No team selected"}</h2>
            </div>
            {selectedContrast ? <span className={`badge ${selectedContrast.className}`}>{selectedContrast.label}</span> : null}
          </div>
          <label>
            Acting admin or coach
            <select value={selectedActorId} onChange={(event) => setActorUserId(event.target.value)}>
              {actors.map((user) => (
                <option key={user.id} value={user.id}>{user.name} - {roleLabel(user.role)}</option>
              ))}
            </select>
          </label>
          <label>
            Team
            <select value={team?.id ?? ""} onChange={(event) => setTeamId(event.target.value)}>
              {teams.map((item) => (
                <option key={item.id} value={item.id}>{item.name} - {item.division}</option>
              ))}
            </select>
          </label>
          {draft ? (
            <div className="grid two">
              <label>
                Program theme
                <select value={draft.themeKey} onChange={(event) => applyTheme(event.target.value as ProgramThemeKey)}>
                  {programThemePresets.map((preset) => (
                    <option key={preset.key} value={preset.key}>{preset.label}</option>
                  ))}
                </select>
              </label>
              <label>
                Mascot
                <input value={draft.mascot} onChange={(event) => updateDraft("mascot", event.target.value)} />
              </label>
              <label>
                Primary color
                <input type="color" value={draft.primaryColor} onChange={(event) => updateDraft("primaryColor", event.target.value)} />
              </label>
              <label>
                Secondary color
                <input type="color" value={draft.secondaryColor} onChange={(event) => updateDraft("secondaryColor", event.target.value)} />
              </label>
            </div>
          ) : <p className="muted">No team records are available.</p>}
          <button onClick={saveTheme} disabled={isPending || !team || !draft}>{isPending ? "Saving..." : "Save team theme"}</button>
          <button className="secondary" onClick={saveTenantDefaults} disabled={isPending || !draft}>Save as tenant defaults</button>
        </article>

        {team && draft ? (
          <article className="card stack">
            <span className="eyebrow">Preview</span>
            <div className="team-branding-preview" style={teamBrandStyle(draft.primaryColor, draft.secondaryColor)}>
              <strong>{draft.mascot}</strong>
              <span>{team.name} portal</span>
            </div>
            <div className="team-branding-preview mobile-preview" style={teamBrandStyle(draft.primaryColor, draft.secondaryColor)}>
              <strong>{draft.mascot.slice(0, 1)}</strong>
              <span>{team.name} mobile</span>
            </div>
            <p className="muted">Contrast ratio: {selectedContrast?.ratio.toFixed(2)}. Use Pass for text-heavy portal headers.</p>
            <div className="notice">
              <strong>Tenant defaults:</strong> {getProgramThemePreset(tenantDefaults.themeKey).label} - {tenantDefaults.mascot} - logo {tenantDefaults.logoStatus.replace("_", " ")}
            </div>
          </article>
        ) : null}
      </section>

      <section className="grid two">
        <article className="card stack">
          <h2>All team themes</h2>
          {teams.map((item) => {
            const status = contrastStatus(item.primaryColor, item.secondaryColor);
            const qa = themeQaStatus(item.primaryColor, item.secondaryColor);
            const lastAudit = audits.find((audit) => audit.teamId === item.id);
            const usesTenantDefaults = item.themeKey === tenantDefaults.themeKey &&
              item.mascot === tenantDefaults.mascot &&
              item.primaryColor.toLowerCase() === tenantDefaults.primaryColor.toLowerCase() &&
              item.secondaryColor.toLowerCase() === tenantDefaults.secondaryColor.toLowerCase();
            return (
              <button className="theme-row" key={item.id} onClick={() => setTeamId(item.id)}>
                <span className="theme-swatch" style={{ background: item.primaryColor }} />
                <span className="theme-swatch" style={{ background: item.secondaryColor }} />
                <strong>{item.name}</strong>
                <span>{getProgramThemePreset(item.themeKey).label} - {item.mascot}</span>
                <span>Logo: {tenantDefaults.logoStatus.replace("_", " ")}</span>
                <span>{lastAudit ? formatDate(lastAudit.createdAt) : "No audit yet"}</span>
                {usesTenantDefaults ? <span className="badge ok">Default</span> : null}
                <span className={`badge ${status.className}`}>{status.label}</span>
                <span className={`badge ${qa.className}`}>{qa.label}</span>
                <span>Dark: {qa.darkLabel}</span>
                <span>Mobile: {qa.mobileLabel}</span>
              </button>
            );
          })}
        </article>
        <article className="card stack">
          <h2>Theme audit</h2>
          {audits.map((audit) => {
            const actor = initialData.users.find((user) => user.id === audit.actorUserId);
            return (
              <p key={audit.id}>
                <strong>{audit.summary}</strong>
                <br />
                <span className="muted">{actor?.name ?? "Unknown actor"} - {formatDate(audit.createdAt)}</span>
              </p>
            );
          })}
          {!audits.length ? <p className="muted">No theme audit events recorded yet.</p> : null}
        </article>
      </section>
    </div>
  );
}

interface RegistrationClientProps {
  registrationRequests?: RegistrationRequest[];
  teamOptions?: RegistrationTeamOption[];
}

export function RegistrationClient({ registrationRequests, teamOptions }: RegistrationClientProps = {}) {
  const { state, dispatch } = useAppState();
  const teams = teamOptions?.length
    ? teamOptions
    : state.teams.map((team) => ({ id: team.id, name: team.name, division: team.division }));
  const visibleRegistrations = mergeRegistrationRequests(state.registrationRequests, registrationRequests ?? []);
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "team-tigers");
  const [parentName, setParentName] = useState("Casey Morgan");
  const [parentEmail, setParentEmail] = useState("casey@example.com");
  const [playerFirstName, setPlayerFirstName] = useState("Mia");
  const [playerLastInitial, setPlayerLastInitial] = useState("M");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function submitRegistration() {
    const input = { teamId, parentName, parentEmail, playerFirstName, playerLastInitial, now: new Date().toISOString() };
    const preview = createRegistrationRequest(state, input);
    setMessage(preview.message);
    if (!preview.ok) return;

    startTransition(async () => {
      const response = await fetch("/api/registration-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input)
      });
      const result = await response.json().catch(() => null) as { ok?: boolean; message?: string } | null;

      if (result?.ok) {
        dispatch({ type: "createRegistrationRequest", input });
        setMessage(result.message ?? "Registration request saved for admin review. No account access was granted.");
        return;
      }

      setMessage(result?.message ?? "Registration could not be saved. Please try again.");
    });
  }

  return (
    <div className="page">
      <section className="hero">
        <span className="eyebrow">Registration system</span>
        <h1>Parent self-registration request with admin review before access.</h1>
        <p className="lead">This form creates a pending local registration request only. It does not create a login, invite token, or guardian-child access grant.</p>
      </section>
      {message ? <p className="notice">{message}</p> : null}
      <section className="grid two">
        <article className="card stack">
          <label>Team<select value={teamId} onChange={(event) => setTeamId(event.target.value)}>{teams.map((team) => <option key={team.id} value={team.id}>{team.name} ({team.division})</option>)}</select></label>
          <label>Parent name<input value={parentName} onChange={(event) => setParentName(event.target.value)} /></label>
          <label>Parent email<input value={parentEmail} onChange={(event) => setParentEmail(event.target.value)} /></label>
          <label>Player first name<input value={playerFirstName} onChange={(event) => setPlayerFirstName(event.target.value)} /></label>
          <label>Player last initial<input value={playerLastInitial} onChange={(event) => setPlayerLastInitial(event.target.value)} maxLength={1} /></label>
          <button onClick={submitRegistration} disabled={isPending}>{isPending ? "Saving..." : "Submit for review"}</button>
        </article>
        <article className="card stack">
          <h2>Pending requests</h2>
          {visibleRegistrations.map((request) => (
            <p key={request.id}><strong>{request.playerFirstName} {request.playerLastInitial}.</strong><br /><span className="muted">{request.parentName} - {request.status}</span></p>
          ))}
          {visibleRegistrations.length === 0 ? <p className="muted">No registration requests yet.</p> : null}
        </article>
      </section>
    </div>
  );
}

export function RegistrationReviewClient({ initialData }: { initialData: RegistrationReviewData }) {
  const [requests, setRequests] = useState(initialData.registrationRequests);
  const [actions, setActions] = useState(initialData.actions);
  const [reviewerUserId, setReviewerUserId] = useState(initialData.reviewers[0]?.id ?? "");
  const [note, setNote] = useState("Reviewed from the admin registration queue.");
  const [message, setMessage] = useState("");
  const [busyRequestId, setBusyRequestId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function reviewRequest(requestId: string, action: "approve" | "reject") {
    setMessage("");
    setBusyRequestId(requestId);
    startTransition(async () => {
      const response = await fetch(`/api/admin/registration-requests/${requestId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewerUserId, note })
      });
      const result = await response.json().catch(() => null) as { ok?: boolean; message?: string } | null;
      setMessage(result?.message ?? "Registration review failed.");

      if (result?.ok) {
        const nextStatus = action === "approve" ? "approved" : "rejected";
        setRequests((current) => current.map((request) => (
          request.id === requestId
            ? { ...request, status: nextStatus, reviewedByUserId: reviewerUserId, reviewedAt: new Date().toISOString() }
            : request
        )));
        setActions((current) => [{
          id: `local-${requestId}-${action}-${Date.now()}`,
          registrationRequestId: requestId,
          action: action === "approve" ? "approved" : "rejected",
          note,
          createdAt: new Date().toISOString()
        }, ...current]);
      }

      setBusyRequestId(null);
    });
  }

  const pendingRequests = requests.filter((request) => request.status === "pending");

  return (
    <div className="page">
      <section className="hero">
        <span className="eyebrow">Registration review</span>
        <h1>Approve a request into player, guardian, invite, membership, and audit records.</h1>
        <p className="lead">Approval is server-side and atomic. If the parent already has a matching profile, the workflow creates active guardian and team membership records. Otherwise it queues a parent invite and invited guardian link.</p>
      </section>

      {message ? <p className="notice">{message}</p> : null}

      <section className="grid two">
        <article className="card stack">
          <h2>Reviewer</h2>
          <label>Acting reviewer
            <select value={reviewerUserId} onChange={(event) => setReviewerUserId(event.target.value)}>
              {initialData.reviewers.map((reviewer) => (
                <option key={reviewer.id} value={reviewer.id}>{reviewer.displayName} - {reviewer.email}</option>
              ))}
            </select>
          </label>
          <label>Review note
            <textarea value={note} onChange={(event) => setNote(event.target.value)} />
          </label>
          {initialData.reviewers.length === 0 ? <p className="notice">No reviewer profiles have active admin or coach membership yet. Create an account, then grant team membership before approving requests.</p> : null}
        </article>

        <article className="card stack">
          <h2>Workflow boundary</h2>
          <p>Public registration remains a pending request only.</p>
          <p>Approval creates durable records and a `registration_approval_actions` trail.</p>
          <p>Rejected requests never create player, guardian, membership, or invite records.</p>
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <h2>Pending queue</h2>
          {pendingRequests.map((request) => (
            <div className="feature-tier-item" key={request.id}>
              <div className="card-header">
                <div>
                  <h3>{request.playerFirstName} {request.playerLastInitial}.</h3>
                  <p className="muted">{request.parentName} - {request.parentEmail}</p>
                </div>
                <span className="badge warning">{request.status}</span>
              </div>
              <div className="toolbar">
                <button
                  onClick={() => reviewRequest(request.id, "approve")}
                  disabled={isPending || busyRequestId === request.id || !reviewerUserId}
                >
                  {busyRequestId === request.id ? "Reviewing..." : "Approve"}
                </button>
                <button
                  className="secondary"
                  onClick={() => reviewRequest(request.id, "reject")}
                  disabled={isPending || busyRequestId === request.id || !reviewerUserId || !note.trim()}
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
          {pendingRequests.length === 0 ? <p className="muted">No pending registration requests.</p> : null}
        </article>

        <article className="card stack">
          <h2>Recent review actions</h2>
          {actions.slice(0, 8).map((action) => (
            <p key={action.id}>
              <strong>{action.action.replaceAll("_", " ")}</strong><br />
              <span className="muted">{formatDate(action.createdAt)} - {action.registrationRequestId}</span>
              {action.note ? <><br /><span>{action.note}</span></> : null}
            </p>
          ))}
          {actions.length === 0 ? <p className="muted">No approval actions have been recorded yet.</p> : null}
        </article>
      </section>
    </div>
  );
}

export function CoachRsvpsClient() {
  const { state } = useAppState();
  const summaries = getCoachRsvpSummaries(state, "user-coach-taylor", NOW);

  return (
    <div className="page">
      <section className="hero">
        <span className="eyebrow">Coach attendance view</span>
        <h1>Attendance summaries for assigned teams.</h1>
        <p className="lead">Coach Taylor sees only assigned team events and aggregate RSVP counts.</p>
      </section>

      <section className="grid two">
        {summaries.map((summary) => (
          <article className="card stack" key={summary.event.id}>
            <h2>{summary.event.title}</h2>
            <p className="muted">{summary.team.name} · {formatDate(summary.event.startsAt)}</p>
            <div className="grid three">
              <div className="metric"><span className="muted">Going</span><strong>{summary.going}</strong></div>
              <div className="metric"><span className="muted">Maybe</span><strong>{summary.maybe}</strong></div>
              <div className="metric"><span className="muted">Not going</span><strong>{summary.notGoing}</strong></div>
            </div>
            <p>No response: {summary.noResponse} of {summary.totalPlayers}</p>
          </article>
        ))}
      </section>
    </div>
  );
}

export function ScheduleAlertsClient() {
  const { state, dispatch } = useAppState();
  const [eventId, setEventId] = useState(state.events[0]?.id ?? "");
  const event = state.events.find((item) => item.id === eventId) ?? state.events[0];
  const [startsAt, setStartsAt] = useState(event?.startsAt ?? "");
  const [locationName, setLocationName] = useState(event?.locationName ?? "");
  const [status, setStatus] = useState<EventStatus>(event?.status ?? "scheduled");
  const [message, setMessage] = useState("");
  const eventTeam = event ? state.teams.find((team) => team.id === event.teamId) : undefined;
  const venueRecords = getVenueRecords(state);
  const recurringPreview = event ? previewRecurringEvents(state, { sourceEventId: event.id, count: 3, intervalDays: 7 }) : [];
  const calendarExport = eventTeam ? exportTeamCalendarIcs(state, eventTeam.id) : "";
  const rsvpSyncRows = getScheduleRsvpSyncRows(state).filter((row) => !eventTeam || row.event.teamId === eventTeam.id);
  const scheduleWorkflow = getScheduleNotificationWorkflow(state);
  const eventStatusTracking = getEventStatusTracking(state);
  const channelReadiness = getNotificationChannelReadiness(state);
  const vapidStatus = getVapidSendAdapterStatus();
  const retryLogs = getNotificationRetryLogs(state);
  const deviceSummary = getDeviceManagementSummary(state);
  const emailFallback = getEmailFallbackPlan(state, { notificationType: status === "cancelled" ? "event_cancelled" : "schedule_changed" });
  const smsUrgentAllowed = smsUrgencyAllowed({ notificationType: status === "cancelled" ? "event_cancelled" : "schedule_changed", urgent: status === "cancelled" });
  const openRate = getAlertOpenRateTracking(state);
  const preferenceAllowed = event ? recipientAllowsNotification(state, {
    userId: "user-parent-jordan",
    teamId: event.teamId,
    channel: "push",
    notificationType: status === "cancelled" ? "event_cancelled" : "schedule_changed"
  }) : false;
  const eventWindowMs = event ? new Date(event.endsAt).getTime() - new Date(event.startsAt).getTime() : 60 * 60 * 1000;
  const conflictEndsAt = event ? new Date(new Date(startsAt).getTime() + eventWindowMs).toISOString() : "";
  const scheduleConflicts = event ? detectScheduleConflicts(state, {
    eventId,
    teamId: event.teamId,
    startsAt,
    endsAt: conflictEndsAt,
    locationName
  }) : [];
  const impactPreview = previewScheduleChangeImpact(state, {
    eventId,
    actorUserId: "user-admin",
    actorRole: "admin",
    startsAt,
    locationName,
    status,
    now: NOW
  });

  function selectEvent(nextId: string) {
    const next = state.events.find((item) => item.id === nextId);
    setEventId(nextId);
    setStartsAt(next?.startsAt ?? "");
    setLocationName(next?.locationName ?? "");
    setStatus(next?.status ?? "scheduled");
  }

  return (
    <div className="page">
      <section className="hero">
        <span className="eyebrow">Schedule change alerts</span>
        <h1>Queue alert records when schedule details change.</h1>
        <p className="lead">Admin and assigned coaches can update time, location, or cancellation status. The scaffold creates notification records only; no provider send occurs.</p>
      </section>

      {message ? <p className="notice">{message}</p> : null}
      <section className="grid two">
        <article className="card stack">
          <h2>Edit event</h2>
          <label>
            Event
            <select value={eventId} onChange={(input) => selectEvent(input.target.value)}>
              {state.events.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
            </select>
          </label>
          <label>
            Starts at
            <input value={startsAt} onChange={(input) => setStartsAt(input.target.value)} />
          </label>
          <label>
            Location
            <input value={locationName} onChange={(input) => setLocationName(input.target.value)} />
          </label>
          <label>
            Status
            <select value={status} onChange={(input) => setStatus(input.target.value as EventStatus)}>
              <option value="scheduled">Scheduled</option>
              <option value="cancelled">Cancelled</option>
              <option value="completed">Completed</option>
            </select>
          </label>
          <button
            onClick={() => {
              const input = {
                eventId,
                actorUserId: "user-admin",
                actorRole: "admin" as const,
                startsAt,
                locationName,
                status,
                now: new Date().toISOString()
              };
              const preview = applyScheduleChange(state, input);
              setMessage(preview.message);
              if (preview.ok) dispatch({ type: "applyScheduleChange", input });
            }}
          >
            Queue schedule alert records
          </button>
        </article>

        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Event detail</span>
              <h2>{event?.title ?? "No event selected"}</h2>
            </div>
            <span className={`badge ${status === "cancelled" ? "danger" : status === "completed" ? "ok" : "warning"}`}>{status}</span>
          </div>
          {event ? (
            <>
              <p><strong>{eventTeam?.name ?? "Team"}</strong> · {event.eventType.replace("_", " ")}</p>
              <p className="muted">{formatDate(startsAt)} to {formatDate(conflictEndsAt)} · {locationName}</p>
              <p className="muted">{event.locationAddress}</p>
              <p>Created {formatDate(event.createdAt)} · Updated {formatDate(event.updatedAt)}</p>
            </>
          ) : <p className="muted">No event is available.</p>}
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Schedule CRUD service</span>
              <h2>Create, update, cancel</h2>
            </div>
            <span className="badge ok">Domain-backed</span>
          </div>
          <p>The schedule domain now exposes create and update paths with actor checks, audit records, and provider-safe notification drafts.</p>
          <p className="muted">This screen exercises update/cancel. New event creation uses the same conflict and permission service before adding an event.</p>
        </article>

        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Conflict detection</span>
              <h2>Schedule conflicts</h2>
            </div>
            <span className={`badge ${scheduleConflicts.length ? "danger" : "ok"}`}>{scheduleConflicts.length} conflict(s)</span>
          </div>
          {scheduleConflicts.map((conflict) => (
            <p key={conflict.event.id}>
              <strong>{conflict.event.title}</strong><br />
              <span className="muted">{conflict.reasons.join(", ")} · {formatDate(conflict.event.startsAt)} · {conflict.event.locationName}</span>
            </p>
          ))}
          {!scheduleConflicts.length ? <p className="muted">No team or venue overlap found for the selected event window.</p> : null}
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Venue records</span>
              <h2>Known locations</h2>
            </div>
            <span className="badge">{venueRecords.length} venue(s)</span>
          </div>
          {venueRecords.map((venue) => (
            <p key={`${venue.name}-${venue.address}`}>
              <strong>{venue.name}</strong><br />
              <span className="muted">{venue.address} · {venue.eventCount} event(s) · {venue.teamNames.join(", ")}</span>
            </p>
          ))}
        </article>

        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Recurring events</span>
              <h2>Weekly preview</h2>
            </div>
            <span className="badge warning">Preview</span>
          </div>
          {recurringPreview.map((repeat) => (
            <p key={repeat.id}><strong>{repeat.title}</strong><br /><span className="muted">{formatDate(repeat.startsAt)} · {repeat.locationName}</span></p>
          ))}
          {!recurringPreview.length ? <p className="muted">Select an event to preview recurrence.</p> : null}
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Calendar export</span>
              <h2>ICS feed preview</h2>
            </div>
            <span className="badge ok">{eventTeam?.name ?? "Team"}</span>
          </div>
          <pre>{calendarExport.split("\n").slice(0, 8).join("\n")}</pre>
          <p className="muted">Export text is generated locally; hosted calendar subscriptions need a dedicated read endpoint before production use.</p>
        </article>

        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">RSVP sync</span>
              <h2>Schedule attendance counts</h2>
            </div>
            <span className="badge">{rsvpSyncRows.length} event(s)</span>
          </div>
          {rsvpSyncRows.map((row) => (
            <p key={row.event.id}>
              <strong>{row.event.title}</strong><br />
              <span className="muted">Going {row.going}, maybe {row.maybe}, not going {row.notGoing}, cancelled {row.cancelled}, no response {row.noResponse}</span>
            </p>
          ))}
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <h2>Impact preview</h2>
          <p>{impactPreview.message}</p>
          <p><strong>Affected families:</strong> {impactPreview.affectedFamilies}</p>
          <p><strong>Already RSVP&apos;d:</strong> {impactPreview.rsvpdPlayers} player response(s)</p>
          <p><strong>No response:</strong> {impactPreview.noResponsePlayers} player(s)</p>
          <p><strong>Alerts:</strong> {impactPreview.notificationCount} draft record(s) across {impactPreview.channels.join(", ") || "no channels"}</p>
          {impactPreview.rsvps.slice(0, 4).map((rsvp) => (
            <p className="muted" key={rsvp.id}>{rsvp.player?.firstName ?? "Player"} {rsvp.player?.lastInitial ?? ""}. · {rsvp.parentUser?.name ?? "Parent"} · {rsvp.response.replace("_", " ")}</p>
          ))}
          <p className="notice">Preview only. Saving queues local notification records; provider blast messages are not sent.</p>
        </article>

        <article className="card stack">
          <h2>Queued notifications</h2>
          {state.notifications.filter((notification) => notification.eventId).slice(0, 8).map((notification) => (
            <div key={notification.id}>
              <strong>{notification.title}</strong>
              <p>{notification.body}</p>
              <p className="muted">{notification.channel} · {notification.status}</p>
            </div>
          ))}
          {!state.notifications.some((notification) => notification.eventId) ? <p className="muted">No schedule notifications queued yet.</p> : null}
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Schedule notification workflow</span>
              <h2>Review before delivery</h2>
            </div>
            <span className="badge warning">{scheduleWorkflow.total} draft(s)</span>
          </div>
          <p>{scheduleWorkflow.boundary}</p>
          <p className="muted">Pending {scheduleWorkflow.statusCounts.pending}, sent {scheduleWorkflow.statusCounts.sent}, failed {scheduleWorkflow.statusCounts.failed}, read {scheduleWorkflow.statusCounts.read}</p>
        </article>

        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Event status tracking</span>
              <h2>Schedule state</h2>
            </div>
            <span className="badge ok">{eventStatusTracking.scheduled} scheduled</span>
          </div>
          <p>Scheduled {eventStatusTracking.scheduled}, cancelled {eventStatusTracking.cancelled}, completed {eventStatusTracking.completed}</p>
          <p className="muted">Status changes feed the impact preview before any parent-facing notification records are queued.</p>
        </article>
      </section>

      <section className="grid three">
        {channelReadiness.map((channel) => (
          <article className="card stack" key={channel.channel}>
            <div className="card-header">
              <h2>{channel.label}</h2>
              <span className={`badge ${channel.status}`}>{channel.status}</span>
            </div>
            <p className="muted">{channel.detail}</p>
          </article>
        ))}
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">VAPID send adapter</span>
              <h2>Web push delivery gate</h2>
            </div>
            <span className={`badge ${vapidStatus.configured ? "ok" : "warning"}`}>{vapidStatus.status}</span>
          </div>
          <p className="muted">{vapidStatus.detail}</p>
        </article>

        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Recipient preference enforcement</span>
              <h2>Preference gate</h2>
            </div>
            <span className={`badge ${preferenceAllowed ? "ok" : "warning"}`}>{preferenceAllowed ? "Allowed" : "Suppressed"}</span>
          </div>
          <p className="muted">Schedule notifications must pass channel, type, team, quiet-hours, and unsubscribe preferences before delivery review.</p>
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Unsubscribe flow</span>
              <h2>Opt-out path</h2>
            </div>
            <span className="badge warning">Preference record</span>
          </div>
          <p>Unsubscribes create or update disabled notification preference records for the exact user, channel, and notification type.</p>
          <p className="muted">No global account deletion or provider call is implied by an unsubscribe.</p>
        </article>

        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Retry logs</span>
              <h2>Failed delivery review</h2>
            </div>
            <span className="badge">{retryLogs.length} retry log(s)</span>
          </div>
          {retryLogs.map((log) => (
            <p key={log.notification.id}>
              <strong>{log.notification.title}</strong><br />
              <span className="muted">{log.notification.channel} · next review {formatDate(log.nextRetryAt)} · {log.reason}</span>
            </p>
          ))}
          {!retryLogs.length ? <p className="muted">No failed notification records need retry review.</p> : null}
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Device management</span>
              <h2>Push device records</h2>
            </div>
            <span className="badge">{deviceSummary.registeredUsers} user(s)</span>
          </div>
          <p className="muted">{deviceSummary.detail}</p>
        </article>

        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Email fallback</span>
              <h2>Fallback recipients</h2>
            </div>
            <span className="badge ok">{emailFallback.reachableCount} reachable</span>
          </div>
          <p className="muted">{emailFallback.detail}</p>
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">SMS urgency rules</span>
              <h2>Urgent-only SMS</h2>
            </div>
            <span className={`badge ${smsUrgentAllowed ? "ok" : "warning"}`}>{smsUrgentAllowed ? "Allowed" : "Blocked"}</span>
          </div>
          <p className="muted">SMS delivery is reserved for urgent cancellation or weather cases after consent and provider approval.</p>
        </article>

        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Alert open rate tracking</span>
              <h2>Read telemetry</h2>
            </div>
            <span className="badge">{openRate.openRate}% open</span>
          </div>
          <p className="muted">{openRate.opened} read out of {openRate.deliveredOrOpened} sent/read notification record(s).</p>
        </article>
      </section>

      <section className="grid one">
        <article className="card stack">
          <h2>Coach confidence checklist</h2>
          <p>Review impacted families, RSVP state, alert channels, and no-response count before queueing changes.</p>
          <p className="muted">This prevents accidental blast records and makes schedule edits auditable before production delivery exists.</p>
        </article>
      </section>
    </div>
  );
}

export function ParentReplayClient() {
  const { state, dispatch } = useAppState();
  const [teamId, setTeamId] = useState("team-tigers");
  const [coachUserId, setCoachUserId] = useState("user-coach-taylor");
  const [focusAreas, setFocusAreas] = useState<PracticeFocusArea[]>(["catching", "throwing", "teamwork"]);
  const [message, setMessage] = useState("");
  const [savedReplays, setSavedReplays] = useState<ParentReplayRecord[]>([]);
  const [isReplayPending, startReplayTransition] = useTransition();
  const selectedTeam = state.teams.find((team) => team.id === teamId);
  const draft = useMemo(() => {
    const previewFocusAreas: PracticeFocusArea[] = focusAreas.length ? focusAreas : ["teamwork"];
    return generateParentReplayDraft(state, {
      teamId,
      coachUserId,
      focusAreas: previewFocusAreas,
      now: NOW
    });
  }, [coachUserId, focusAreas, state, teamId]);
  const promptEvalHarness = getPromptEvalHarness();
  const coachWorkspaceDrafts = useMemo(() => buildAiCoachWorkspaceDrafts(state, {
    teamId,
    coachUserId,
    focusAreas,
    now: NOW
  }), [coachUserId, focusAreas, state, teamId]);
  const teamReplays = [...savedReplays, ...state.parentReplays].filter((replay) => replay.teamId === teamId);
  const selectedFocus = new Set(focusAreas);
  const canQueueReplay = focusAreas.length >= 2 && focusAreas.length <= 3;

  function toggleFocus(area: PracticeFocusArea) {
    setFocusAreas((current) => (
      current.includes(area)
        ? current.filter((item) => item !== area)
        : [...current, area]
    ));
  }

  function queueParentReplay() {
    setMessage("");
    startReplayTransition(async () => {
      const response = await authenticatedJsonFetch("/api/coach/parent-replay", {
        teamId,
        coachUserId,
        focusAreas,
        draft
      });
      const result = await response.json().catch(() => null) as {
        ok?: boolean;
        message?: string;
        parentReplay?: ParentReplayRecord;
      } | null;

      if (result?.ok && result.parentReplay) {
        setSavedReplays((current) => [result.parentReplay!, ...current]);
      } else if (response.status === 401) {
        const input = { teamId, coachUserId, focusAreas, now: new Date().toISOString() };
        dispatch({ type: "createParentReplay", input });
      }

      setMessage(result?.message ?? (
        response.status === 401
          ? `Parent Replay queued locally for ${selectedTeam?.name ?? "team"}. Sign in as an assigned coach to publish it to families.`
          : "Parent Replay could not be queued."
      ));
    });
  }

  return (
    <div className="page parent-replay-page">
      <section className="hero parent-replay-hero">
        <span className="eyebrow">Signature feature</span>
        <h1>Parent Replay turns every practice into help parents can use tonight.</h1>
        <p className="lead">
          Coaches click what the team worked on. The scaffold generates home activities, a coach video recommendation, a parent tip, skill cards, and a team quest without sending real provider messages.
        </p>
      </section>

      {message ? <p className="notice">{message}</p> : null}

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Coach practice recap builder</span>
              <h2>Today we worked on</h2>
            </div>
            <span className="badge warning">Coach approval</span>
          </div>

          <div className="grid two">
            <label>
              Team portal
              <select value={teamId} onChange={(event) => setTeamId(event.target.value)}>
                {state.teams.map((team) => (
                  <option key={team.id} value={team.id}>{team.name} - {team.division}</option>
                ))}
              </select>
            </label>
            <label>
              Preview as
              <select value={coachUserId} onChange={(event) => setCoachUserId(event.target.value)}>
                {state.users.filter((user) => user.role !== "parent").map((user) => (
                  <option key={user.id} value={user.id}>{user.name} - {roleLabel(user.role)}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="replay-checklist" aria-label="Practice focus areas">
            {defaultPracticeFocusAreas.map((area) => (
              <label className="clubhouse-checkbox" key={area}>
                <input
                  type="checkbox"
                  checked={selectedFocus.has(area)}
                  onChange={() => toggleFocus(area)}
                />
                {formatFocusArea(area)}
              </label>
            ))}
          </div>

          <p className="muted">Choose 2-3 focus areas so the parent replay stays tiny enough for home.</p>

          <button
            disabled={!canQueueReplay || isReplayPending}
            onClick={queueParentReplay}
          >
            Queue Parent Replay
          </button>
          {!canQueueReplay ? <p className="muted">Select exactly 2 or 3 practice focus areas before queueing.</p> : null}
        </article>

        <article className="card stack parent-replay-preview">
          <div className="card-header">
            <div>
              <span className="eyebrow">Generated parent replay</span>
              <h2>{draft.title}</h2>
            </div>
            <span className="badge ok">Preview</span>
          </div>
          <p>{draft.summary}</p>
          <div className="grid three replay-activities">
            {draft.homeActivities.map((activity) => (
              <div className="replay-activity" key={activity.duration}>
                <span className="badge">{formatReplayDuration(activity.duration)}</span>
                <h3>{activity.title}</h3>
                {activity.coachCue ? <p><strong>Coach cue:</strong> {activity.coachCue}</p> : null}
                {activity.parentGoal ? <p className="muted">{activity.parentGoal}</p> : null}
                <ul className="list compact">
                  {activity.steps.map((step) => <li key={step}>{step}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid three">
        <article className="card stack">
          <span className="badge ok">Translation engine</span>
          <h2>Coach words parents can use</h2>
          {draft.parentTranslations.map((translation) => (
            <p key={translation.coachTerm}>
              <strong>{translation.coachTerm}</strong>
              <br />
              <span className="muted">{translation.parentInstruction}</span>
            </p>
          ))}
        </article>
        <article className="card stack">
          <span className="badge">Healthy streak</span>
          <h2>{draft.microCoachingStreak.label}</h2>
          <p><strong>{draft.microCoachingStreak.completionRate}%</strong> aggregate family completion</p>
          <p className="muted">{draft.microCoachingStreak.completedFamilies} of {draft.microCoachingStreak.totalFamilies} linked families. Coaches see team-level engagement only, not a parent leaderboard.</p>
        </article>
        <article className="card stack">
          <span className="badge warning">Memory timeline</span>
          <h2>{draft.memoryMoment.title}</h2>
          <p>{draft.memoryMoment.detail}</p>
        </article>
      </section>

      <section className="grid three">
        <article className="card stack">
          <span className="badge ok">Coach video</span>
          <h2>{draft.coachVideo.title}</h2>
          <p>{draft.coachVideo.note}</p>
          <a href={draft.coachVideo.url}>Open demo video</a>
        </article>
        <article className="card stack">
          <span className="badge warning">Parent tip</span>
          <h2>Tonight&apos;s coaching cue</h2>
          <p>{draft.parentTip}</p>
          <p className="muted">{draft.parentEducation}</p>
        </article>
        <article className="card stack">
          <span className="badge">Team quest</span>
          <h2>Quest before next practice</h2>
          <p>{draft.teamQuest}</p>
        </article>
      </section>

      <section className="grid one">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">AI Coach Workspace</span>
              <h2>Coach-reviewed family drafts</h2>
            </div>
            <span className="badge warning">Preview - Edit - Approve - Publish</span>
          </div>
          <p className="muted">These drafts are deterministic workspace previews. They do not publish or send until a coach reviews the copy and uses the existing save/queue workflow.</p>
          <div className="grid two">
            {coachWorkspaceDrafts.map((workspaceDraft) => (
              <div className="stack compact" key={workspaceDraft.id}>
                <span className="badge">{workspaceDraft.label}</span>
                <h3>{workspaceDraft.title}</h3>
                <pre className="draft-preview">{workspaceDraft.body}</pre>
                <p className="muted"><strong>Sources:</strong> {workspaceDraft.sourceEvidence.join(", ") || "coach draft"}</p>
                <p className="muted"><strong>Workflow:</strong> {workspaceDraft.workflow.join(" -> ")}</p>
                <p className="notice">{workspaceDraft.boundary}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid one">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Prompt/Eval harness</span>
              <h2>Replay quality checks</h2>
            </div>
            <span className="badge ok">{promptEvalHarness.status}</span>
          </div>
          {promptEvalHarness.checks.map((check) => <p className="muted" key={check}>{check}</p>)}
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <h2>Skill cards</h2>
          {draft.skillCards.map((card) => (
            <p className="notice" key={card}>{card}</p>
          ))}
        </article>
        <article className="card stack">
          <h2>Queued replay history</h2>
          {teamReplays.length ? teamReplays.map((replay) => (
            <div key={replay.id}>
              <strong>{replay.title}</strong>
              <p className="muted">{replay.status} - {replay.focusAreas.map(formatFocusArea).join(", ")} - {formatDate(replay.createdAt)}</p>
            </div>
          )) : <p className="muted">No Parent Replay has been queued for this team in this browser session.</p>}
        </article>
      </section>
    </div>
  );
}

export function FeatureTierHubClient() {
  return (
    <section className="feature-tier-hub">
      {platformFeatureTiers.map((tier) => (
        <article className="card stack" key={tier.tier}>
          <div className="card-header">
            <div>
              <span className="eyebrow">{tier.tier}</span>
              <h2>{tier.promise}</h2>
            </div>
          </div>
          <div className="feature-tier-list">
            {tier.features.map((feature) => (
              <div className="feature-tier-item" key={feature.title}>
                <div className="card-header">
                  <h3>{feature.title}</h3>
                  <span className={`badge ${feature.status === "implemented" ? "ok" : feature.status === "planned" ? "warning" : ""}`}>{feature.status}</span>
                </div>
                <p className="muted">{feature.description}</p>
              </div>
            ))}
          </div>
        </article>
      ))}
    </section>
  );
}

function createEmptyTeamPortalReplay(team: { id: string; coachUserId?: string }): ParentReplayDraft {
  return {
    teamId: team.id,
    coachUserId: team.coachUserId ?? "supabase-team-coach",
    focusAreas: ["catching", "throwing", "teamwork"],
    title: "Parent Replay pending",
    summary: "No Parent Replay has been published for this team yet.",
    homeActivities: [
      {
        duration: "2_minutes",
        title: "Ask your coach for the next home activity.",
        coachCue: "practice recap",
        parentGoal: "Keep the family loop ready until the next coach-approved Replay.",
        steps: ["Check the next practice recap after it is published."]
      }
    ],
    parentTranslations: [
      {
        coachTerm: "practice recap",
        parentInstruction: "Ask your coach for one simple cue to repeat at home."
      }
    ],
    microCoachingStreak: {
      label: "Team home-practice streak",
      completedFamilies: 0,
      totalFamilies: 0,
      completionRate: 0
    },
    memoryMoment: {
      title: "Replay memory pending",
      detail: "Practice memories will appear after the next coach-approved Replay."
    },
    coachVideo: {
      title: "Coach video library",
      url: "#",
      note: "No coach video has been linked yet."
    },
    parentTip: "Coach tips will appear after the next practice recap.",
    teamQuest: "Ask your coach for the next team quest.",
    skillCards: ["Practice cues will appear after the next recap."],
    parentEducation: "Parent education will appear after the next recap.",
    generatedAt: NOW
  };
}

export function TeamPortalClient({ teamPortalData }: { teamPortalData?: TeamPortalData | null } = {}) {
  const { state, dispatch } = useAppState();
  const [remoteBrandingOverrides, setRemoteBrandingOverrides] = useState<Record<string, Pick<Team, "mascot" | "primaryColor" | "secondaryColor" | "themeKey">>>({});
  const sourceTeams = teamPortalData?.teams.length ? teamPortalData.teams : state.teams;
  const teams = sourceTeams.map((item) => {
    const override = remoteBrandingOverrides[item.id];
    return override ? { ...item, ...override } : item;
  });
  const playersSource = teamPortalData?.players ?? state.players;
  const guardianLinksSource = teamPortalData?.guardianLinks ?? state.guardianLinks;
  const parentInvitesSource = teamPortalData?.parentInvites ?? state.parentInvites;
  const teamMembershipsSource = teamPortalData?.teamMemberships ?? state.teamMemberships;
  const usersSource = teamPortalData?.users.length ? teamPortalData.users : state.users;
  const eventsSource = teamPortalData?.events ?? state.events;
  const mediaItemsSource = teamPortalData?.mediaItems ?? state.mediaItems;
  const parentReplaysSource = teamPortalData?.parentReplays ?? state.parentReplays;
  const isSupabaseBacked = Boolean(teamPortalData?.teams.length);
  const [teamId, setTeamId] = useState(() => teamPortalData?.teams[0]?.id ?? "team-tigers");
  const [brandingActorId, setBrandingActorId] = useState("user-coach-taylor");
  const [brandingDrafts, setBrandingDrafts] = useState<Record<string, {
    mascot?: string;
    primaryColor?: string;
    secondaryColor?: string;
    themeKey?: ProgramThemeKey;
  }>>({});
  const [brandingMessage, setBrandingMessage] = useState("");
  const [isBrandingPending, startBrandingTransition] = useTransition();
  const selectedTeamId = teams.some((item) => item.id === teamId) ? teamId : teams[0]?.id ?? state.teams[0]?.id ?? teamId;
  const team = teams.find((item) => item.id === selectedTeamId) ?? teams[0] ?? state.teams[0]!;
  const brandingDraft = brandingDrafts[team.id] ?? {};
  const mascotDraft = brandingDraft.mascot ?? team.mascot;
  const primaryColorDraft = brandingDraft.primaryColor ?? team.primaryColor;
  const secondaryColorDraft = brandingDraft.secondaryColor ?? team.secondaryColor;
  const themeKeyDraft = brandingDraft.themeKey ?? team.themeKey;
  const themePreset = getProgramThemePreset(team.themeKey);
  const brandingActors = usersSource.filter((user) => user.role !== "parent");
  const selectedBrandingActorId = brandingActors.some((user) => user.id === brandingActorId)
    ? brandingActorId
    : brandingActors[0]?.id ?? brandingActorId;
  const brandingCanSave = isSupabaseBacked
    ? usersSource.some((user) => (
      user.id === selectedBrandingActorId &&
      (user.role === "admin" || teamMembershipsSource.some((membership) => (
        membership.teamId === team.id &&
        membership.userId === user.id &&
        membership.role === "coach" &&
        membership.status === "active"
      )))
    ))
    : canUpdateTeamPortalBranding(state, brandingActorId, team.id);
  const portalStyle = teamBrandStyle(team.primaryColor, team.secondaryColor);
  const players = playersSource.filter((player) => player.teamId === team.id);
  const playerIds = new Set(players.map((player) => player.id));
  const guardianLinks = guardianLinksSource.filter((guardian) => playerIds.has(guardian.playerId));
  const parentInvites = parentInvitesSource.filter((invite) => invite.teamId === team.id);
  const teamMemberships = teamMembershipsSource.filter((membership) => membership.teamId === team.id);
  const activeParentMemberships = teamMemberships.filter((membership) => membership.role === "parent" && membership.status === "active");
  const teamEvents = eventsSource
    .filter((event) => event.teamId === team.id && event.status === "scheduled")
    .sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt));
  const upcomingGame = teamEvents.find((event) => event.eventType === "game");
  const nextPractice = teamEvents.find((event) => event.eventType === "practice");
  const embeddedMap = getEmbeddedMapUi(upcomingGame ?? nextPractice);
  const venueMarkers = getVenueMarkers(teamEvents);
  const mapQuotaStatus = getMapQuotaStatus({ requestsToday: 42, dailyLimit: 100 });
  const fieldLayout = getFieldLayoutMetadata(upcomingGame ?? nextPractice);
  const venuePage = getVenuePage(upcomingGame ?? nextPractice);
  const venueAmenityNotes = getVenueAmenityNotes(upcomingGame ?? nextPractice);
  const arrivalInstructions = getArrivalInstructions(upcomingGame ?? nextPractice);
  const venueIntelligence = getVenueIntelligence(upcomingGame ?? nextPractice);
  const mapFallback = getMapFallbackUx({ quotaStatus: mapQuotaStatus.status, directionsUrl: embeddedMap.directionsUrl });
  const locationChange = highlightLocationChange(upcomingGame?.locationName ?? "Field pending", upcomingGame?.locationName ?? "Field pending");
  const facilityNotes = getFacilityNotes(upcomingGame ?? nextPractice);
  const gameRsvps = upcomingGame ? state.rsvps.filter((rsvp) => rsvp.eventId === upcomingGame.id) : [];
  const gameSnackSlots = upcomingGame ? state.snackScheduleSlots.filter((slot) => slot.teamId === team.id && slot.eventId === upcomingGame.id) : [];
  const gameVolunteerSignups = upcomingGame ? state.volunteerSignups.filter((signup) => signup.teamId === team.id && signup.eventId === upcomingGame.id) : [];
  const gameWeatherAlert = upcomingGame ? state.weatherAlerts.find((alert) => alert.eventId === upcomingGame.id) : undefined;
  const media = mediaItemsSource.filter((item) => item.teamId === team.id);
  const privateTeamAlbum = getPrivateTeamAlbum(mediaItemsSource, team.id);
  const teamPortalSponsors = getTeamPortalSponsorPlacement(state.sponsors, team.id);
  const firstPlayerConsent = getPerPlayerMediaConsent(players[0]?.id ?? "player-pending", players.slice(0, 1).map((player) => player.id));
  const parentSubmittedMoments = getParentSubmittedMoments(state, team.id);
  const volunteerMoments = getVolunteerMoments(state, team.id);
  const seasonMemoryExport = exportSeasonMemories(state, team.id);
  const snackReminders = getSnackReminders(state, team.id);
  const snackConflicts = getSnackConflicts(state, team.id);
  const snackAuditTrail = getSnackAuditTrail(state, team.id);
  const snackCancellation = cancelSnackSlot(state, state.snackScheduleSlots.find((slot) => slot.teamId === team.id)?.id ?? "slot-pending", "Family schedule changed.");
  const volunteerRoleCaps = getVolunteerRoleCaps(state, team.id);
  const volunteerReminders = getVolunteerReminders(state, team.id);
  const volunteerCancellation = cancelVolunteerSignup(state, state.volunteerSignups.find((signup) => signup.teamId === team.id)?.id ?? "volunteer-pending", "Family schedule changed.");
  const volunteerApprovalPolicies = getVolunteerApprovalPolicies();
  const snackVolunteerFairness = getSnackVolunteerFairness(state, team.id);
  const dutyRotation = getDutyRotation(state, team.id);
  const familyOptOuts = getFamilyOptOuts(state, team.id);
  const siblingAwareAssignments = getSiblingAwareDutyAssignments(state, team.id);
  const missedSlots = getMissedSlotTracking(state, team.id);
  const latestReplay = parentReplaysSource
    .filter((replay) => replay.teamId === team.id)
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))[0];
  const replayDraft = latestReplay ?? (isSupabaseBacked ? createEmptyTeamPortalReplay(team) : generateParentReplayDraft(state, {
    teamId: team.id,
    coachUserId: team.coachUserId ?? "user-admin",
    focusAreas: ["catching", "throwing", "teamwork"],
    now: NOW
  }));
  const timelineItems = [
    ...teamEvents.map((event) => ({
      id: event.id,
      title: event.title,
      detail: `${event.eventType.replace("_", " ")} - ${formatDate(event.startsAt)}`
    })),
    ...parentReplaysSource.filter((replay) => replay.teamId === team.id).map((replay) => ({
      id: replay.id,
      title: replay.memoryMoment.title,
      detail: replay.memoryMoment.detail
    })),
    ...state.announcements.filter((announcement) => announcement.teamId === team.id).map((announcement) => ({
      id: announcement.id,
      title: announcement.title,
      detail: `Coach note - ${announcement.body}`
    })),
    ...media.map((item) => ({
      id: item.id,
      title: item.title,
      detail: `${item.type.replace("_", " ")} memory`
    })),
    ...state.volunteerSignups.filter((signup) => signup.teamId === team.id && signup.status === "filled").map((signup) => ({
      id: signup.id,
      title: `${signup.role} covered`,
      detail: "Volunteer moment saved to the season story."
    }))
  ].slice(0, 5);

  function updateBrandingDraft(field: "mascot" | "primaryColor" | "secondaryColor" | "themeKey", value: string) {
    setBrandingDrafts((current) => ({
      ...current,
      [team.id]: {
        ...current[team.id],
        [field]: value
      }
    }));
  }

  function applyThemePreset(nextThemeKey: ProgramThemeKey) {
    const preset = getProgramThemePreset(nextThemeKey);
    setBrandingDrafts((current) => ({
      ...current,
      [team.id]: {
        ...current[team.id],
        themeKey: preset.key,
        primaryColor: preset.primaryColor,
        secondaryColor: preset.secondaryColor,
        mascot: current[team.id]?.mascot ?? team.mascot ?? preset.mascotHint
      }
    }));
  }

  function saveBranding() {
    if (isSupabaseBacked) {
      if (!brandingCanSave) {
        setBrandingMessage("Only org admins or the assigned coach can update this team portal.");
        return;
      }

      setBrandingMessage("");
      startBrandingTransition(async () => {
        const response = await authenticatedJsonFetch("/api/admin/team-branding", {
          teamId: team.id,
          mascot: mascotDraft,
          primaryColor: primaryColorDraft,
          secondaryColor: secondaryColorDraft,
          themeKey: themeKeyDraft
        });
        const result = await response.json().catch(() => null) as {
          ok?: boolean;
          message?: string;
          team?: Team;
        } | null;

        if (result?.ok && result.team) {
          setRemoteBrandingOverrides((current) => ({
            ...current,
            [result.team!.id]: {
              mascot: result.team!.mascot,
              primaryColor: result.team!.primaryColor,
              secondaryColor: result.team!.secondaryColor,
              themeKey: result.team!.themeKey
            }
          }));
        }

        setBrandingMessage(result?.message ?? "Team portal branding could not be saved.");
      });
      return;
    }

    const input = {
      teamId: team.id,
      actorUserId: selectedBrandingActorId,
      mascot: mascotDraft,
      primaryColor: primaryColorDraft,
      secondaryColor: secondaryColorDraft,
      themeKey: themeKeyDraft,
      now: new Date().toISOString()
    };
    const preview = updateTeamPortalBranding(state, input);
    setBrandingMessage(preview.message);
    if (preview.ok) {
      dispatch({ type: "updateTeamPortalBranding", input });
    }
  }

  return (
    <div className="page team-portal-page" style={portalStyle}>
      <section className="hero team-portal-hero">
        <div className="team-portal-mark" aria-hidden="true">{team.mascot.slice(0, 1)}</div>
        <span className="eyebrow">Team-specific portal</span>
        <h1>{team.name} portal for schedules, learning, memories, and parent help.</h1>
        <p className="lead">
          {team.mascot} colors carry across this {themePreset.label.toLowerCase()} portal and Team Chat. {isSupabaseBacked
            ? "This portal is reading approved roster, guardian, invite, membership, schedule, branding, media, and replay records from Supabase."
            : "This page is using local seed fallback data because Supabase portal reads are unavailable."}
        </p>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Portal selector</span>
              <h2>{team.name}</h2>
            </div>
            <span className="badge ok">{team.mascot}</span>
          </div>
          <label>
            Team portal
            <select value={team.id} onChange={(event) => setTeamId(event.target.value)}>
              {teams.map((item) => (
                <option key={item.id} value={item.id}>{item.name} - {item.division}</option>
              ))}
            </select>
          </label>
          <div className="team-color-row" aria-label="Current team colors">
            <span style={{ background: team.primaryColor }} />
            <span style={{ background: team.secondaryColor }} />
            <p>{team.primaryColor} / {team.secondaryColor}</p>
          </div>
        </article>

        <article className="card stack team-branding-panel">
          <div className="card-header">
            <div>
              <span className="eyebrow">Coach customization</span>
              <h2>Portal colors and mascot</h2>
            </div>
            <span className={`badge ${brandingCanSave ? "ok" : "warning"}`}>{brandingCanSave ? "Can edit" : "Read only"}</span>
          </div>
          <div className="grid two">
            <label>
              Acting user
              <select value={selectedBrandingActorId} onChange={(event) => setBrandingActorId(event.target.value)}>
                {brandingActors.map((user) => (
                  <option key={user.id} value={user.id}>{user.name} - {roleLabel(user.role)}</option>
                ))}
              </select>
            </label>
            <label>
              Program theme
              <select value={themeKeyDraft} onChange={(event) => applyThemePreset(event.target.value as ProgramThemeKey)}>
                {programThemePresets.map((preset) => (
                  <option key={preset.key} value={preset.key}>{preset.label}</option>
                ))}
              </select>
            </label>
            <label>
              Mascot
              <input value={mascotDraft} onChange={(event) => updateBrandingDraft("mascot", event.target.value)} />
            </label>
            <label>
              Primary color
              <input type="color" value={primaryColorDraft} onChange={(event) => updateBrandingDraft("primaryColor", event.target.value)} />
            </label>
            <label>
              Secondary color
              <input type="color" value={secondaryColorDraft} onChange={(event) => updateBrandingDraft("secondaryColor", event.target.value)} />
            </label>
          </div>
          <div className="team-branding-preview" style={teamBrandStyle(primaryColorDraft, secondaryColorDraft)}>
            <strong>{mascotDraft}</strong>
            <span>{team.name} preview</span>
          </div>
          <div className="toolbar">
            <button onClick={saveBranding} disabled={isBrandingPending}>{isBrandingPending ? "Saving..." : "Save portal branding"}</button>
            <span className="muted">Assigned coaches can update only their own team. Org admins can update any team.</span>
          </div>
          {brandingMessage ? <p className="notice">{brandingMessage}</p> : null}
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Venue pages</span>
              <h2>{venuePage.title}</h2>
            </div>
            <span className="badge ok">Portal</span>
          </div>
          <p>{venuePage.summary}</p>
          <p className="muted">Canonical path: {venuePage.path}</p>
        </article>

        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Parking notes</span>
              <h2>Arrival parking</h2>
            </div>
            <span className="badge">Game day</span>
          </div>
          <p>{venueAmenityNotes.parking}</p>
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Field entrance notes</span>
              <h2>Main entrance</h2>
            </div>
            <span className="badge">Directions</span>
          </div>
          <p>{venueAmenityNotes.entrance}</p>
        </article>

        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Restroom info</span>
              <h2>Facilities</h2>
            </div>
            <span className="badge ok">Family</span>
          </div>
          <p>{venueAmenityNotes.restrooms}</p>
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Arrival instructions</span>
              <h2>Before you leave</h2>
            </div>
            <span className="badge ok">Family</span>
          </div>
          <p>{arrivalInstructions}</p>
        </article>

        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Venue intelligence layer</span>
              <h2>Location readiness</h2>
            </div>
            <span className={`badge ${venueIntelligence.confidence === "ready" ? "ok" : "warning"}`}>{venueIntelligence.confidence}</span>
          </div>
          <p>{venueIntelligence.summary}</p>
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Map fallback UX</span>
              <h2>{mapFallback.label}</h2>
            </div>
            <span className={`badge ${mapFallback.useFallback ? "warning" : "ok"}`}>{mapFallback.useFallback ? "Fallback" : "Embed"}</span>
          </div>
          {mapFallback.href ? <a href={mapFallback.href}>Open fallback directions</a> : <p className="muted">No fallback link is available.</p>}
        </article>

        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Location change highlighting</span>
              <h2>{locationChange.changed ? "Location changed" : "No location change"}</h2>
            </div>
            <span className={`badge ${locationChange.changed ? "warning" : "ok"}`}>{locationChange.changed ? "Review" : "Stable"}</span>
          </div>
          <p>{locationChange.message}</p>
        </article>
      </section>

      <section className="grid one">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Facility notes</span>
              <h2>{facilityNotes.title}</h2>
            </div>
            <span className="badge">Venue</span>
          </div>
          {facilityNotes.notes.map((note) => <p className="muted" key={note}>{note}</p>)}
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Parent-submitted moments</span>
              <h2>Family memories</h2>
            </div>
            <span className="badge">{parentSubmittedMoments.length} moment(s)</span>
          </div>
          {parentSubmittedMoments.map((moment) => <p key={moment.id}><strong>{moment.title}</strong><br /><span className="muted">{moment.source}</span></p>)}
        </article>

        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Volunteer moments</span>
              <h2>Help that became story</h2>
            </div>
            <span className="badge">{volunteerMoments.length} moment(s)</span>
          </div>
          {volunteerMoments.map((moment) => <p key={moment.id}><strong>{moment.title}</strong><br /><span className="muted">{moment.source}</span></p>)}
          {!volunteerMoments.length ? <p className="muted">No volunteer moments are filled yet.</p> : null}
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Exportable season memories</span>
              <h2>{seasonMemoryExport.filename}</h2>
            </div>
            <span className="badge ok">{seasonMemoryExport.rows.length} row(s)</span>
          </div>
          <pre>{seasonMemoryExport.rows.slice(0, 4).join("\n")}</pre>
        </article>

        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Snack reminders</span>
              <h2>Snack duty prompts</h2>
            </div>
            <span className="badge warning">{snackReminders.length} reminder(s)</span>
          </div>
          {snackReminders.map((reminder) => <p key={reminder.id}><strong>{reminder.title}</strong><br /><span className="muted">{reminder.detail}</span></p>)}
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Snack conflict handling</span>
              <h2>Duplicate snack assignments</h2>
            </div>
            <span className="badge">{snackConflicts.length} conflict(s)</span>
          </div>
          {snackConflicts.map((slot) => <p key={slot.id}><strong>{slot.item}</strong><br /><span className="muted">{slot.eventId}</span></p>)}
          {!snackConflicts.length ? <p className="muted">No snack assignment conflicts are detected.</p> : null}
        </article>

        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Snack audit trail</span>
              <h2>Snack changes</h2>
            </div>
            <span className="badge">{snackAuditTrail.length} audit row(s)</span>
          </div>
          {snackAuditTrail.map((audit) => <p key={audit.id}>{audit.summary}</p>)}
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Snack cancellations</span>
              <h2>Cancellation preview</h2>
            </div>
            <span className="badge warning">Preview</span>
          </div>
          <p>{snackCancellation.message}</p>
        </article>

        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Volunteer role caps</span>
              <h2>Role capacity</h2>
            </div>
            <span className="badge">{volunteerRoleCaps.length} role(s)</span>
          </div>
          {volunteerRoleCaps.map((cap) => <p key={cap.role}><strong>{cap.role}</strong><br /><span className="muted">{cap.filled} filled of {cap.cap}</span></p>)}
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Volunteer reminders</span>
              <h2>Volunteer prompts</h2>
            </div>
            <span className="badge warning">{volunteerReminders.length} reminder(s)</span>
          </div>
          {volunteerReminders.map((reminder) => <p key={reminder.id}><strong>{reminder.title}</strong><br /><span className="muted">{reminder.detail}</span></p>)}
        </article>

        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Volunteer cancellation flow</span>
              <h2>Cancellation preview</h2>
            </div>
            <span className="badge warning">Preview</span>
          </div>
          <p>{volunteerCancellation.message}</p>
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Volunteer approval policies</span>
              <h2>Role approval rules</h2>
            </div>
            <span className="badge">Policy</span>
          </div>
          {volunteerApprovalPolicies.map((policy) => <p className="muted" key={policy}>{policy}</p>)}
        </article>

        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Snack and volunteer fairness engine</span>
              <h2>Fairness balance</h2>
            </div>
            <span className="badge">{snackVolunteerFairness.balanceScore} gap</span>
          </div>
          <p>Snack assignments {snackVolunteerFairness.snackAssignments}, volunteer assignments {snackVolunteerFairness.volunteerAssignments}.</p>
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Duty rotation</span>
              <h2>Next family duties</h2>
            </div>
            <span className="badge">{dutyRotation.length} family(ies)</span>
          </div>
          {dutyRotation.map((entry) => <p key={entry.parentUserId}><strong>{entry.order}. {entry.parentUserId}</strong><br /><span className="muted">Next duty: {entry.nextDuty}</span></p>)}
        </article>

        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Family opt-outs</span>
              <h2>Duty preferences</h2>
            </div>
            <span className="badge">{familyOptOuts.filter((entry) => entry.optedOut).length} opt-out(s)</span>
          </div>
          {familyOptOuts.map((entry) => <p key={entry.parentUserId}><strong>{entry.parentUserId}</strong><br /><span className="muted">{entry.reason}</span></p>)}
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Sibling-aware duty assignment</span>
              <h2>Household grouping</h2>
            </div>
            <span className="badge">{siblingAwareAssignments.length} group(s)</span>
          </div>
          {siblingAwareAssignments.map((entry) => <p key={entry.parentUserId}><strong>{entry.siblingGroupKey}</strong><br /><span className="muted">Duty: {entry.nextDuty}</span></p>)}
        </article>

        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Missed-slot tracking</span>
              <h2>Open past duties</h2>
            </div>
            <span className="badge warning">{missedSlots.length} missed</span>
          </div>
          {missedSlots.map((slot) => <p key={slot.id}>{slot.detail}</p>)}
          {!missedSlots.length ? <p className="muted">No missed snack or volunteer slots are detected.</p> : null}
        </article>
      </section>

      <section className="grid one">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Team Portal sponsor placement</span>
              <h2>Team sponsor slots</h2>
            </div>
            <span className="badge">{teamPortalSponsors.length} sponsor(s)</span>
          </div>
          {teamPortalSponsors.map((sponsor) => <p key={sponsor.id}><strong>{sponsor.name}</strong><br /><span className="muted">{sponsor.url}</span></p>)}
          {!teamPortalSponsors.length ? <p className="muted">No active team portal sponsors are placed for this team.</p> : null}
        </article>
      </section>

      <section className="grid three">
        <article className="card stack">
          <span className="badge ok">Weekly digest</span>
          <h2>This week</h2>
          <p><strong>Practice:</strong> {nextPractice ? `${formatDate(nextPractice.startsAt)} at ${nextPractice.locationName}` : "No practice scheduled."}</p>
          <p><strong>Parent Replay:</strong> {replayDraft.summary}</p>
          <p><strong>Team quest:</strong> {replayDraft.teamQuest}</p>
        </article>
        <article className="card stack">
          <span className="badge warning">Game Day Mode</span>
          <h2>{upcomingGame?.title ?? "Next game"}</h2>
          {upcomingGame ? (
            <>
              <p>{formatDate(upcomingGame.startsAt)} - arrive by {formatArrivalTime(upcomingGame.startsAt)}</p>
              <p><strong>Field:</strong> {upcomingGame.locationName} - {upcomingGame.locationAddress}</p>
              <p><strong>Uniform:</strong> {team.primaryColor} jersey / {team.secondaryColor} accent</p>
              <p><strong>RSVP:</strong> {gameRsvps.length} of {players.length} player response(s)</p>
              <p><strong>Snack:</strong> {gameSnackSlots.find((slot) => slot.status === "assigned")?.item ?? "Open snack duty"}</p>
              <p><strong>Parking:</strong> Use the main lot near {upcomingGame.locationName}; check urgent alerts before leaving.</p>
              <p><strong>Weather:</strong> {gameWeatherAlert ? `${gameWeatherAlert.headline} - ${gameWeatherAlert.detail}` : "No weather alert drafted."}</p>
              <p><strong>Urgent help:</strong> {gameVolunteerSignups.filter((signup) => signup.status === "open").map((signup) => signup.role).join(", ") || "Covered"}</p>
              <a href={`https://maps.google.com/?q=${encodeURIComponent(upcomingGame.locationAddress)}`}>Open field map</a>
            </>
          ) : <p className="muted">No game scheduled yet.</p>}
          <p className="notice">Calm Mode keeps only essentials visible before the event. Weather and urgent alerts remain approval-gated; no automatic provider send occurs.</p>
        </article>
        <article className="card stack">
          <span className="badge">Roster</span>
          <h2>Team family view</h2>
          {players.map((player) => (
            <p key={player.id}>
              {player.firstName} {player.lastInitial}. - Jersey {player.jersey}
              <br />
              <span className="muted">
                {guardianLinks.filter((guardian) => guardian.playerId === player.id).length} guardian link(s), {parentInvites.filter((invite) => invite.playerId === player.id).length} invite(s)
              </span>
            </p>
          ))}
          {!players.length ? <p className="muted">No approved players are rostered to this team yet.</p> : null}
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Embedded map UI</span>
              <h2>{embeddedMap.title}</h2>
            </div>
            <span className={`badge ${embeddedMap.status === "ready" ? "ok" : "warning"}`}>{embeddedMap.status}</span>
          </div>
          {embeddedMap.embedUrl ? <iframe title={embeddedMap.title} src={embeddedMap.embedUrl} loading="lazy" /> : <p className="muted">No event location is ready for map embed.</p>}
          {embeddedMap.directionsUrl ? <a href={embeddedMap.directionsUrl}>Open directions</a> : null}
        </article>

        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Venue marker management</span>
              <h2>Map markers</h2>
            </div>
            <span className="badge">{venueMarkers.length} marker(s)</span>
          </div>
          {venueMarkers.map((marker) => (
            <p key={marker.id}><strong>{marker.label}. {marker.title}</strong><br /><span className="muted">{marker.eventTitle} · {marker.address}</span></p>
          ))}
          {!venueMarkers.length ? <p className="muted">No venue markers available.</p> : null}
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Quota handling</span>
              <h2>Map usage guard</h2>
            </div>
            <span className={`badge ${mapQuotaStatus.status}`}>{mapQuotaStatus.remaining} left</span>
          </div>
          <p className="muted">{mapQuotaStatus.detail}</p>
        </article>

        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Field layout metadata</span>
              <h2>{fieldLayout.fieldName}</h2>
            </div>
            <span className="badge ok">Game day</span>
          </div>
          <p><strong>Entrance:</strong> {fieldLayout.entrance}</p>
          <p><strong>Home bench:</strong> {fieldLayout.homeBench}</p>
          <p><strong>Away bench:</strong> {fieldLayout.awayBench}</p>
          <p className="muted">Warmup: {fieldLayout.warmupArea}</p>
        </article>
      </section>

      <section className="grid three">
        <article className="card stack">
          <span className={`badge ${isSupabaseBacked ? "ok" : "warning"}`}>{isSupabaseBacked ? "Supabase live" : "Seed fallback"}</span>
          <h2>Portal data source</h2>
          <p>{isSupabaseBacked ? "Team Portal reads are coming from Supabase." : "Supabase could not return teams, so the portal is showing local seed state."}</p>
          <p className="muted">{teams.length} team(s), {playersSource.length} player(s), {mediaItemsSource.length} media item(s)</p>
        </article>
        <article className="card stack">
          <span className="badge ok">Access records</span>
          <h2>Guardians and memberships</h2>
          <p><strong>{guardianLinks.length}</strong> guardian link(s)</p>
          <p><strong>{teamMemberships.length}</strong> active or invited membership record(s)</p>
          <p><strong>{activeParentMemberships.length}</strong> active parent family account(s)</p>
          {teamMemberships.slice(0, 3).map((membership) => {
            const user = usersSource.find((item) => item.id === membership.userId);
            return (
              <p key={membership.id}>
                {user?.name ?? membership.userId} - {roleLabel(membership.role)} · {membership.status}
              </p>
            );
          })}
        </article>
        <article className="card stack">
          <span className="badge warning">Parent invites</span>
          <h2>Invite status</h2>
          {parentInvites.slice(0, 4).map((invite) => (
            <p key={invite.id}>
              {invite.email}
              <br />
              <span className="muted">{invite.status} · {invite.deliveryStatus} · expires {formatDate(invite.expiresAt)}</span>
            </p>
          ))}
          {!parentInvites.length ? <p className="muted">No parent invites are queued for this team.</p> : null}
        </article>
      </section>

      <section className="grid three">
        <article className="card stack">
          <span className="badge ok">Coach video library</span>
          <h2>Videos</h2>
          <p><strong>{replayDraft.coachVideo.title}</strong><br /><span className="muted">{replayDraft.coachVideo.note}</span></p>
          {media.filter((item) => item.type === "youtube").map((item) => (
            <p key={item.id}>{item.title}</p>
          ))}
        </article>
        <article className="card stack">
          <span className="badge warning">Parent education center</span>
          <h2>Help at home</h2>
          <p>{replayDraft.parentEducation}</p>
          <div className="home-practice-loop">
            {replayDraft.homeActivities.map((activity) => (
              <div className="home-practice-row" key={activity.duration}>
                <span className="badge">{formatReplayDuration(activity.duration)}</span>
                <strong>{activity.title}</strong>
                <span className="muted">{activity.parentGoal ?? activity.steps[0]}</span>
              </div>
            ))}
          </div>
          {replayDraft.parentTranslations.map((translation) => (
            <p key={translation.coachTerm}><strong>{translation.coachTerm}</strong><br /><span className="muted">{translation.parentInstruction}</span></p>
          ))}
          <p className="notice">AI learning plans are represented by local deterministic guidance; no AI provider is connected.</p>
        </article>
        <article className="card stack">
          <span className="badge">Skill cards</span>
          <h2>Practice cues</h2>
          {replayDraft.skillCards.map((card) => <p key={card}>{card}</p>)}
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Per-player media consent</span>
              <h2>{players[0]?.firstName ?? "Player"} consent</h2>
            </div>
            <span className={`badge ${firstPlayerConsent.consent === "granted" ? "ok" : "warning"}`}>{firstPlayerConsent.consent}</span>
          </div>
          <p className="muted">Per-player consent controls whether family-visible media can include a specific rostered player.</p>
        </article>

        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Private team album</span>
              <h2>Approved team media</h2>
            </div>
            <span className="badge ok">{privateTeamAlbum.length} item(s)</span>
          </div>
          {privateTeamAlbum.map((item) => <p key={item.id}><strong>{item.title}</strong><br /><span className="muted">{item.type.replace("_", " ")}</span></p>)}
          {!privateTeamAlbum.length ? <p className="muted">No approved private team album items are visible.</p> : null}
        </article>
      </section>

      <section className="grid three">
        <article className="card stack">
          <span className="badge ok">Skill trees</span>
          <h2>Growth path</h2>
          {replayDraft.focusAreas.map((area, index) => (
            <p key={area}>{formatFocusArea(area)} - Level {index + 1} practice habit</p>
          ))}
        </article>
        <article className="card stack">
          <span className="badge warning">Season storybook</span>
          <h2>Memory timeline</h2>
          {timelineItems.map((item) => (
            <p key={item.id}><strong>{item.title}</strong><br /><span className="muted">{item.detail}</span></p>
          ))}
        </article>
        <article className="card stack">
          <span className="badge">Volunteer center</span>
          <h2>Game help</h2>
          {state.volunteerSignups.filter((signup) => signup.teamId === team.id).map((signup) => (
            <p key={signup.id}>{signup.role}: {signup.status}</p>
          ))}
          <p className="muted">Volunteer signup is displayed from local or loaded team records; parent-facing claim flows remain separate.</p>
        </article>
      </section>
    </div>
  );
}

function mapRealtimeTeamChatMessage(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    channelId: String(row.channel_id),
    organizationId: String(row.organization_id),
    teamId: String(row.team_id),
    authorUserId: String(row.author_user_id),
    authorRole: String(row.author_role) as UserRole,
    kind: String(row.message_kind) as "message" | "announcement",
    topic: row.announcement_topic ? String(row.announcement_topic) as ChatAnnouncementTopic : undefined,
    body: String(row.body ?? ""),
    eventId: row.event_id ? String(row.event_id) : undefined,
    pinned: Boolean(row.pinned),
    moderationStatus: String(row.moderation_status ?? "visible") as "visible" | "hidden" | "deleted",
    readByUserIds: Array.isArray(row.read_by_user_ids) ? row.read_by_user_ids.map((item) => String(item)) : [],
    createdAt: String(row.created_at),
    editedAt: row.edited_at ? String(row.edited_at) : undefined,
    deletedAt: row.deleted_at ? String(row.deleted_at) : undefined,
    moderatedAt: row.moderated_at ? String(row.moderated_at) : undefined,
    moderatedByUserId: row.moderated_by_user_id ? String(row.moderated_by_user_id) : undefined,
    moderationReason: row.moderation_reason ? String(row.moderation_reason) : undefined
  };
}

export function TeamChatClient({ teamChatData }: { teamChatData?: TeamChatData | null } = {}) {
  const { state, dispatch } = useAppState();
  const isSupabaseBacked = Boolean(teamChatData?.teams.length);
  const [remoteMessages, setRemoteMessages] = useState(() => teamChatData?.messages ?? []);
  const [remoteModerationEvents, setRemoteModerationEvents] = useState(() => teamChatData?.moderationEvents ?? []);
  const chatState = isSupabaseBacked ? {
    ...state,
    teams: teamChatData!.teams,
    users: teamChatData!.users.length ? teamChatData!.users : state.users,
    teamMemberships: teamChatData!.teamMemberships,
    events: teamChatData!.events,
    teamChatChannels: teamChatData!.channels,
    chatMessages: remoteMessages,
    chatModerationAuditEvents: remoteModerationEvents
  } : state;
  const [viewerId, setViewerId] = useState(() => teamChatData?.users.find((user) => user.role !== "parent")?.id ?? "user-parent-jordan");
  const [teamId, setTeamId] = useState(() => teamChatData?.teams[0]?.id ?? "team-tigers");
  const [draftMessage, setDraftMessage] = useState("");
  const [linkDraftToGameDay, setLinkDraftToGameDay] = useState(true);
  const [postNotice, setPostNotice] = useState("");
  const [announcementBody, setAnnouncementBody] = useState("");
  const [announcementTopic, setAnnouncementTopic] = useState<ChatAnnouncementTopic>("reminder");
  const [announcementPinned, setAnnouncementPinned] = useState(true);
  const [announcementNotice, setAnnouncementNotice] = useState("");
  const [moderationNotice, setModerationNotice] = useState("");
  const [isChatPending, startChatTransition] = useTransition();
  const selectedViewerId = chatState.users.some((user) => user.id === viewerId) ? viewerId : chatState.users[0]?.id ?? viewerId;
  const selectedTeamId = chatState.teams.some((team) => team.id === teamId) ? teamId : chatState.teams[0]?.id ?? teamId;
  const viewer = chatState.users.find((user) => user.id === selectedViewerId);
  const selectedTeam = chatState.teams.find((team) => team.id === selectedTeamId);
  const chatStyle = teamBrandStyle(selectedTeam?.primaryColor ?? "#1570ef", selectedTeam?.secondaryColor ?? "#dff4ff");

  let view: ReturnType<typeof getTeamChatView> | null = null;
  let deniedReason = "";
  try {
    view = getTeamChatView(chatState, selectedViewerId, selectedTeamId, NOW);
  } catch (error) {
    deniedReason = error instanceof Error ? error.message : "Team Chat is unavailable.";
  }
  const moderationEvents = view
    ? chatState.chatModerationAuditEvents.filter((event) => event.teamId === view.team.id)
    : [];
  const reportingSummary = selectedTeam ? getTeamChatReportingSummary(chatState, selectedTeam.id) : null;
  const retentionJobs = selectedTeam ? getTeamChatRetentionJobs(chatState, selectedTeam.id) : [];
  const policyScreens = getMediaMessagePolicyScreens();

  useEffect(() => {
    if (!isSupabaseBacked) return undefined;
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel("team-chat-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "team_chat_messages" }, (payload) => {
        const message = mapRealtimeTeamChatMessage(payload.new as Record<string, unknown>);
        setRemoteMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "team_chat_messages" }, (payload) => {
        const message = mapRealtimeTeamChatMessage(payload.new as Record<string, unknown>);
        setRemoteMessages((current) => current.map((item) => item.id === message.id ? message : item));
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [isSupabaseBacked]);

  useEffect(() => {
    if (!isSupabaseBacked || !view || !view.messages.length) return;
    const unreadMessageIds = view.messages
      .filter((message) => message.authorUserId !== view!.viewer.id && !message.readByUserIds.includes(view!.viewer.id))
      .map((message) => message.id);
    if (!unreadMessageIds.length) return;
    void authenticatedJsonFetch("/api/team-chat/read-receipts", { messageIds: unreadMessageIds });
  }, [isSupabaseBacked, view]);

  function submitSupabaseChat(input: {
    kind: "message" | "announcement";
    body: string;
    topic?: ChatAnnouncementTopic;
    pinned?: boolean;
    eventId?: string;
    onDone: (message: string, created?: typeof remoteMessages[number]) => void;
  }) {
    if (!view) return;
    startChatTransition(async () => {
      const response = await authenticatedJsonFetch("/api/team-chat/messages", {
        teamId: view!.team.id,
        body: input.body,
        eventId: input.eventId,
        kind: input.kind,
        topic: input.topic,
        pinned: input.pinned
      });
      const result = await response.json().catch(() => null) as {
        ok?: boolean;
        message?: string;
        createdMessage?: typeof remoteMessages[number];
      } | null;
      if (result?.ok && result.createdMessage) {
        setRemoteMessages((current) => current.some((item) => item.id === result.createdMessage!.id) ? current : [...current, result.createdMessage!]);
      }
      input.onDone(result?.message ?? "Team Chat message could not be saved.", result?.createdMessage);
    });
  }

  function moderateSupabaseMessage(messageId: string, action: "message_hidden" | "message_deleted") {
    if (!view) return;
    startChatTransition(async () => {
      const response = await authenticatedJsonFetch("/api/team-chat/moderation", {
        messageId,
        action,
        reason: "Coach or admin moderated this Team Chat message."
      });
      const result = await response.json().catch(() => null) as {
        ok?: boolean;
        message?: string;
        moderatedMessage?: typeof remoteMessages[number];
      } | null;
      if (result?.ok && result.moderatedMessage) {
        setRemoteMessages((current) => current.map((item) => item.id === result.moderatedMessage!.id ? result.moderatedMessage! : item));
        setRemoteModerationEvents((current) => [{
          id: `remote-moderation-${Date.now()}`,
          messageId,
          channelId: result.moderatedMessage!.channelId,
          teamId: result.moderatedMessage!.teamId,
          actorUserId: view!.viewer.id,
          actorRole: view!.viewer.role,
          action,
          reason: "Coach or admin moderated this Team Chat message.",
          createdAt: new Date().toISOString()
        }, ...current]);
      }
      setModerationNotice(result?.message ?? "Team Chat moderation could not be saved.");
    });
  }

  return (
    <div className="page clubhouse-chat-page" style={chatStyle}>
      <section className="hero clubhouse-chat-hero">
        <div className="clubhouse-hero-mark" aria-hidden="true">{selectedTeam?.mascot.slice(0, 1) ?? "T"}</div>
        <span className="eyebrow">Safe family communication</span>
        <h1>{selectedTeam?.name ?? "Team"} Chat for game-day questions and coach notes.</h1>
        <p className="lead">
          A private branded clubhouse for assigned parents, assigned coaches, and org admins. Children do not have chat accounts or direct messages.
        </p>
      </section>

      <section className="clubhouse-toolbar card">
        <label>
          Preview as
          <select value={selectedViewerId} onChange={(event) => setViewerId(event.target.value)}>
            {chatState.users.map((user) => (
              <option key={user.id} value={user.id}>{user.name} · {roleLabel(user.role)}</option>
            ))}
          </select>
        </label>
        <label>
          Team Chat
          <select value={selectedTeamId} onChange={(event) => setTeamId(event.target.value)}>
            {chatState.teams.map((team) => (
              <option key={team.id} value={team.id}>{team.name} · {team.division}</option>
            ))}
          </select>
        </label>
        <div className="clubhouse-toolbar-note">
          <strong>{viewer?.name ?? "Unknown viewer"}</strong>
          <span>{selectedTeam?.name ?? "Unknown team"} access is evaluated from team memberships.</span>
        </div>
      </section>

      <section className="grid three">
        <article className="card stack">
          <span className="eyebrow">Reporting UI</span>
          <h2>Chat report summary</h2>
          <p><strong>{reportingSummary?.reportableMessages ?? 0}</strong> visible message(s) can be reported.</p>
          <p className="muted">{reportingSummary?.hiddenMessages ?? 0} hidden, {reportingSummary?.deletedMessages ?? 0} deleted.</p>
        </article>
        <article className="card stack">
          <span className="eyebrow">Retention jobs</span>
          <h2>Archive cleanup</h2>
          {retentionJobs.map((job) => (
            <p key={job.id}><strong>{job.title}</strong><br /><span className="muted">{job.status} · {job.detail}</span></p>
          ))}
        </article>
        <article className="card stack">
          <span className="eyebrow">Media/message policy screens</span>
          <h2>Policy checks</h2>
          {policyScreens.map((policy) => (
            <p key={policy.title}><strong>{policy.title}</strong><br /><span className="muted">{policy.detail}</span></p>
          ))}
        </article>
      </section>

      {!view ? (
        <section className="card stack">
          <span className="badge danger">Private Team Chat</span>
          <h2>Access limited to assigned families and staff.</h2>
          <p>{deniedReason}</p>
          <p className="muted">Parents can only view chats for teams connected to their rostered child. Coaches can only view assigned teams. Org admins can view all team chats.</p>
        </section>
      ) : (
        <section className="clubhouse-chat-shell">
          <aside className="card clubhouse-team-card">
            <div className="clubhouse-team-mark" aria-hidden="true">{view.team.mascot.slice(0, 1)}</div>
            <span className="badge ok">Team Chat</span>
            <h2>{view.team.name}</h2>
            <p className="muted">{view.team.mascot} · {view.team.division} · {roleLabel(view.viewer.role)} view</p>
            <div className="clubhouse-chip-row" aria-label="Team chat quick topics">
              <span>Arrival</span>
              <span>Uniforms</span>
              <span>Snacks</span>
              <span>Weather</span>
            </div>
            <div className="clubhouse-unread">
              <strong>{view.unreadCount}</strong>
              <span>unread for this preview user</span>
            </div>
            <p className="notice">{view.safetyNote}</p>
            <div className="clubhouse-moderation-log">
              <h3>Moderation Log</h3>
              {moderationEvents.length ? moderationEvents.slice(0, 3).map((event) => (
                <p key={event.id}>
                  <strong>{event.action.replaceAll("_", " ")}</strong>
                  <span>{event.reason}</span>
                </p>
              )) : <p className="muted">No moderation actions recorded for this team.</p>}
            </div>
          </aside>

          <section className="card clubhouse-chat-panel">
            <div className="card-header">
              <div>
                <span className="eyebrow">Private to assigned team members</span>
                <h2>{view.team.mascot} clubhouse</h2>
              </div>
              <span className="badge">{view.access.reason}</span>
            </div>

            {view.pinnedMessage ? (
              <article className="clubhouse-pinned">
                <span className="badge warning">Pinned Reminder</span>
                <h3>Coach Note</h3>
                <p>{view.pinnedMessage.body}</p>
                <small>{formatDate(view.pinnedMessage.createdAt)} · {formatTopic(view.pinnedMessage.topic)}</small>
              </article>
            ) : null}

            {view.upcomingGame ? (
              <article className="clubhouse-game-day">
                <div>
                  <span className="badge ok">Game-Day Questions</span>
                  <h3>{view.upcomingGame.title}</h3>
                  <p className="muted">
                    {formatDate(view.upcomingGame.startsAt)} · Arrive by {formatArrivalTime(view.upcomingGame.startsAt)}
                  </p>
                </div>
                <ul className="list compact">
                  <li>Field: {view.upcomingGame.locationName}</li>
                  <li>Opponent: {view.upcomingGame.opponent ?? "To be announced"}</li>
                  <li><a href={`https://maps.google.com/?q=${encodeURIComponent(view.upcomingGame.locationAddress)}`}>Open map link</a></li>
                  <li>Questions in thread: {view.gameDayMessages.length}</li>
                </ul>
              </article>
            ) : null}

            <form
              className="clubhouse-coach-note"
              onSubmit={(event) => {
                event.preventDefault();
                if (!view?.access.canAnnounce) {
                  setAnnouncementNotice("Only assigned coaches and org admins can send Coach Notes.");
                  return;
                }
                if (!announcementBody.trim()) {
                  setAnnouncementNotice("Write a Coach Note before sending.");
                  return;
                }
                if (isSupabaseBacked) {
                  submitSupabaseChat({
                    kind: "announcement",
                    body: announcementBody,
                    topic: announcementTopic,
                    pinned: announcementPinned,
                    onDone: (message, created) => {
                      if (created) setAnnouncementBody("");
                      setAnnouncementNotice(message);
                    }
                  });
                  return;
                }
                dispatch({
                  type: "sendCoachAnnouncement",
                  input: {
                    teamId: view.team.id,
                    authorUserId: view.viewer.id,
                    body: announcementBody,
                    topic: announcementTopic,
                    pinned: announcementPinned,
                    now: new Date().toISOString()
                  }
                });
                setAnnouncementBody("");
                setAnnouncementNotice(announcementPinned ? "Coach Note posted and pinned." : "Coach Note posted.");
              }}
            >
              <div className="card-header">
                <div>
                  <span className="eyebrow">Coach Announcements</span>
                  <h3>Coach Note</h3>
                </div>
                <span className="badge warning">{view.access.canAnnounce ? "Coach/Admin" : "Read only"}</span>
              </div>
              <div className="grid two">
                <label>
                  Topic
                  <select
                    value={announcementTopic}
                    onChange={(event) => setAnnouncementTopic(event.target.value as ChatAnnouncementTopic)}
                    disabled={!view.access.canAnnounce}
                  >
                    <option value="game_time">Game time</option>
                    <option value="field_location">Field location</option>
                    <option value="uniforms">Uniforms</option>
                    <option value="snacks">Snacks</option>
                    <option value="weather">Weather</option>
                    <option value="reminder">Reminder</option>
                  </select>
                </label>
                <label className="clubhouse-checkbox">
                  <input
                    type="checkbox"
                    checked={announcementPinned}
                    onChange={(event) => setAnnouncementPinned(event.target.checked)}
                    disabled={!view.access.canAnnounce}
                  />
                  Pin as Pinned Reminder
                </label>
              </div>
              <label>
                Message
                <textarea
                  value={announcementBody}
                  onChange={(event) => setAnnouncementBody(event.target.value)}
                  placeholder="Share game time, field location, uniforms, snacks, weather, or reminders."
                  disabled={!view.access.canAnnounce}
                />
              </label>
              <div className="toolbar">
                <button disabled={isChatPending || !view.access.canAnnounce || !announcementBody.trim()}>{isChatPending ? "Saving..." : "Send Coach Note"}</button>
                <span className="muted">Announcements appear visually distinct from normal Team Chat messages.</span>
              </div>
              {announcementNotice ? <p className="notice">{announcementNotice}</p> : null}
            </form>

            <div className="clubhouse-message-list" aria-label="Team Chat messages">
              {view.messages.length ? view.messages.map((message) => (
                <article className={`clubhouse-message ${message.kind}`} key={message.id}>
                  <div className="clubhouse-message-meta">
                    <strong>{roleLabel(message.authorRole)}</strong>
                    <span>{message.kind === "announcement" ? "Coach Note" : "Team Chat"}</span>
                    {message.eventId ? <span>Game linked</span> : null}
                  </div>
                  <p>{message.body}</p>
                  <small>{formatDate(message.createdAt)}</small>
                  {view.access.canModerate ? (
                    <div className="clubhouse-message-actions">
                      <button
                        className="secondary"
                        type="button"
                        onClick={() => {
                          if (isSupabaseBacked) {
                            moderateSupabaseMessage(message.id, "message_hidden");
                            return;
                          }
                          dispatch({
                            type: "moderateTeamChatMessage",
                            input: {
                              messageId: message.id,
                              actorUserId: view.viewer.id,
                              action: "message_hidden",
                              reason: "Coach or admin moderated this Team Chat message.",
                              now: new Date().toISOString()
                            }
                          });
                          setModerationNotice("Message hidden and moderation audit recorded.");
                        }}
                      >
                        Hide
                      </button>
                      <button
                        className="secondary"
                        type="button"
                        onClick={() => {
                          if (isSupabaseBacked) {
                            moderateSupabaseMessage(message.id, "message_deleted");
                            return;
                          }
                          dispatch({
                            type: "moderateTeamChatMessage",
                            input: {
                              messageId: message.id,
                              actorUserId: view.viewer.id,
                              action: "message_deleted",
                              reason: "Coach or admin deleted this Team Chat message.",
                              now: new Date().toISOString()
                            }
                          });
                          setModerationNotice("Message deleted and moderation audit recorded.");
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  ) : null}
                </article>
              )) : (
                <article className="clubhouse-empty">
                  <h3>Team Chat is ready.</h3>
                  <p>Use this space for schedule questions, field details, uniforms, snacks, weather updates, and coach reminders.</p>
                </article>
              )}
            </div>
            {moderationNotice ? <p className="notice">{moderationNotice}</p> : null}

            <form
              className="clubhouse-compose"
              onSubmit={(event) => {
                event.preventDefault();
                if (!view?.access.canPost) {
                  setPostNotice("Only assigned parents, assigned coaches, and org admins can post in this Team Chat.");
                  return;
                }
                const input = {
                  teamId: view.team.id,
                  authorUserId: view.viewer.id,
                  body: draftMessage,
                  eventId: linkDraftToGameDay ? view.upcomingGame?.id : undefined,
                  now: new Date().toISOString()
                };
                if (!draftMessage.trim()) {
                  setPostNotice("Write a message before sending.");
                  return;
                }
                if (isSupabaseBacked) {
                  submitSupabaseChat({
                    kind: "message",
                    body: draftMessage,
                    eventId: input.eventId,
                    onDone: (message, created) => {
                      if (created) setDraftMessage("");
                      setPostNotice(message);
                    }
                  });
                  return;
                }
                dispatch({ type: "postTeamChatMessage", input });
                setDraftMessage("");
                setPostNotice("Team Chat message posted.");
              }}
            >
              <label>
                Team Chat message
                <textarea
                  value={draftMessage}
                  onChange={(event) => setDraftMessage(event.target.value)}
                  placeholder="Ask about field location, jerseys, snacks, arrival time, or reminders."
                  disabled={!view.access.canPost}
                />
              </label>
              {view.upcomingGame ? (
                <label className="clubhouse-checkbox">
                  <input
                    type="checkbox"
                    checked={linkDraftToGameDay}
                    onChange={(event) => setLinkDraftToGameDay(event.target.checked)}
                    disabled={!view.access.canPost}
                  />
                  File under Game-Day Questions for {view.upcomingGame.locationName}
                </label>
              ) : null}
              <div className="toolbar">
                <button disabled={isChatPending || !view.access.canPost || !draftMessage.trim()}>{isChatPending ? "Saving..." : "Send Team Chat Message"}</button>
                <span className="muted">{view.access.canPost ? "Visible to this team only." : "Posting is blocked for this viewer."}</span>
              </div>
              {postNotice ? <p className="notice">{postNotice}</p> : null}
            </form>
          </section>
        </section>
      )}
    </div>
  );
}
