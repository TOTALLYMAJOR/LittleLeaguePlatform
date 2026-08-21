import {
  CoachDashboardClient,
  CoachCommunityClient,
  CoachDraftsClient,
  CoachRsvpsClient,
  ParentReplayClient,
  ScheduleAlertsClient,
  TeamChatClient,
  TeamPortalClient
} from "@/components/feature-panels";
import {
  CoachPracticeReplayWorkbench,
  GameDayResolutionRoomClient
} from "@/components/coordination-workbenches";
import { listParentCoachDashboardData } from "@/lib/supabase/dashboard-data";
import { listCoachInjuryContacts } from "@/lib/supabase/coach-injury-contacts";
import { listCoachDraftReviewData } from "@/lib/supabase/coach-drafts";
import { listCoachDrillVideoLibraryData } from "@/lib/supabase/drill-videos";
import { listGameDayResolutionReviews } from "@/lib/supabase/game-day-resolution";
import { listPracticeRunReceipts } from "@/lib/supabase/practice-runs";
import { scopeScheduleOperationsData, scopeTeamChatData, scopeTeamPortalData } from "@/lib/supabase/route-scopes";
import { listScheduleOperationsData } from "@/lib/supabase/schedule-management";
import { requireCoachPageAccess } from "@/lib/supabase/shell-access";
import { listTeamChatData } from "@/lib/supabase/team-chat";
import { listTeamPortalData } from "@/lib/supabase/team-portal";

export async function loadCoachDashboardForPage() {
  const pageAccess = await requireCoachPageAccess();
  if (!pageAccess.ok) return pageAccess.dashboardData;
  return listParentCoachDashboardData({ viewerUserId: pageAccess.access.userId, surface: "coach" });
}

export async function CoachHomeSurface() {
  const dashboardData = await loadCoachDashboardForPage();
  return <CoachDashboardClient dashboardData={dashboardData} />;
}

export async function CoachAttendanceSurface() {
  const dashboardData = await loadCoachDashboardForPage();
  return <CoachRsvpsClient dashboardData={dashboardData} />;
}

export async function CoachPracticeRecapsSurface() {
  const pageAccess = await requireCoachPageAccess();
  if (!pageAccess.ok) return <ParentReplayClient dashboardData={pageAccess.dashboardData} />;
  const [dashboardData, drillVideoData, practiceRunData, injuryContactData] = await Promise.all([
    listParentCoachDashboardData({ viewerUserId: pageAccess.access.userId, surface: "coach" }),
    listCoachDrillVideoLibraryData({
      coachTeamIds: pageAccess.access.coachTeamIds,
      viewerUserId: pageAccess.access.userId
    }),
    listPracticeRunReceipts({ teamIds: pageAccess.access.coachTeamIds }),
    listCoachInjuryContacts({
      actorUserId: pageAccess.access.userId ?? "",
      teamIds: pageAccess.access.coachTeamIds
    })
  ]);
  return (
    <CoachPracticeReplayWorkbench
      state={dashboardData.state}
      initialReceipts={practiceRunData.receipts}
      injuryContacts={injuryContactData.contacts}
      injuryContactMessage={injuryContactData.message}
      dashboardData={dashboardData}
      drillVideoData={drillVideoData}
    />
  );
}

export async function CoachScheduleSurface() {
  const pageAccess = await requireCoachPageAccess();
  if (!pageAccess.ok) return <CoachDashboardClient dashboardData={pageAccess.dashboardData} />;
  const organizationIds = [...new Set((pageAccess.access.contexts ?? [])
    .filter((context) => context.role === "coach")
    .map((context) => context.organizationId))];
  const [scheduleData, dashboardData, resolutionData] = await Promise.all([
    listScheduleOperationsData({ organizationIds }),
    listParentCoachDashboardData({ viewerUserId: pageAccess.access.userId, surface: "coach" }),
    listGameDayResolutionReviews({ teamIds: pageAccess.access.coachTeamIds })
  ]);
  const scopedScheduleData = scopeScheduleOperationsData(
    scheduleData,
    pageAccess.access.coachTeamIds,
    "Showing schedule rows scoped to the signed-in coach's active teams."
  );
  return (
    <>
      <GameDayResolutionRoomClient
        state={dashboardData.state}
        initialReviews={resolutionData.reviews}
        mode="coach"
        message={resolutionData.message}
      />
      <details className="compact-disclosure schedule-edit-disclosure">
        <summary><span><strong>Edit a scheduled event</strong><small>Open the auditable event form only when the Resolution Room decision requires a schedule change.</small></span><span className="badge">Event form</span></summary>
        <ScheduleAlertsClient scheduleData={scopedScheduleData} dashboardData={dashboardData} mode="coach" />
      </details>
    </>
  );
}

export async function CoachMessagesSurface() {
  const pageAccess = await requireCoachPageAccess();
  if (!pageAccess.ok) return <CoachDashboardClient dashboardData={pageAccess.dashboardData} />;
  const teamChatData = await listTeamChatData();
  const scopedTeamChatData = scopeTeamChatData(teamChatData, pageAccess.access.coachTeamIds, pageAccess.access.userId ?? "");
  return (
    <TeamChatClient
      teamChatData={scopedTeamChatData}
      viewerUserId={pageAccess.access.userId}
      lockedTeamId={scopedTeamChatData.teams[0]?.id}
    />
  );
}

export async function CoachRosterSurface() {
  const pageAccess = await requireCoachPageAccess();
  if (!pageAccess.ok) return <CoachDashboardClient dashboardData={pageAccess.dashboardData} />;
  const teamPortalData = await listTeamPortalData();
  const scopedTeamPortalData = teamPortalData
    ? scopeTeamPortalData(teamPortalData, pageAccess.access.coachTeamIds, {
      audience: "coach",
      viewerUserId: pageAccess.access.userId
    })
    : null;
  return <TeamPortalClient teamPortalData={scopedTeamPortalData} audience="coach" />;
}

export async function CoachDashboardSliceSurface() {
  return <CoachHomeSurface />;
}

export async function CoachDraftsSurface() {
  const pageAccess = await requireCoachPageAccess();
  if (!pageAccess.ok) {
    return (
      <CoachDraftsClient
        dashboardData={pageAccess.dashboardData}
        draftData={{ drafts: [], isSupabaseBacked: false, message: pageAccess.dashboardData?.message ?? "Coach draft access is unavailable." }}
      />
    );
  }
  const [dashboardData, draftData] = await Promise.all([
    listParentCoachDashboardData({ viewerUserId: pageAccess.access.userId, surface: "coach" }),
    listCoachDraftReviewData({ teamIds: pageAccess.access.coachTeamIds })
  ]);
  return <CoachDraftsClient dashboardData={dashboardData} draftData={draftData} />;
}

export async function CoachCommunitySurface() {
  const dashboardData = await loadCoachDashboardForPage();
  return <CoachCommunityClient dashboardData={dashboardData} />;
}

export async function CoachWeatherFieldsSurface() {
  const pageAccess = await requireCoachPageAccess();
  if (!pageAccess.ok) return <CoachDashboardClient dashboardData={pageAccess.dashboardData} />;
  const [dashboardData, resolutionData] = await Promise.all([
    listParentCoachDashboardData({ viewerUserId: pageAccess.access.userId, surface: "coach" }),
    listGameDayResolutionReviews({ teamIds: pageAccess.access.coachTeamIds })
  ]);
  return (
    <GameDayResolutionRoomClient
      state={dashboardData.state}
      initialReviews={resolutionData.reviews}
      mode="coach"
      message={resolutionData.message}
    />
  );
}
