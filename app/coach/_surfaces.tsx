import {
  CoachDashboardClient,
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
  const [dashboardData, drillVideoData, practiceRunData] = await Promise.all([
    listParentCoachDashboardData({ viewerUserId: pageAccess.access.userId, surface: "coach" }),
    listCoachDrillVideoLibraryData({
      coachTeamIds: pageAccess.access.coachTeamIds,
      viewerUserId: pageAccess.access.userId
    }),
    listPracticeRunReceipts({ teamIds: pageAccess.access.coachTeamIds })
  ]);
  return (
    <CoachPracticeReplayWorkbench
      state={dashboardData.state}
      initialReceipts={practiceRunData.receipts}
      dashboardData={dashboardData}
      drillVideoData={drillVideoData}
    />
  );
}

export async function CoachScheduleSurface() {
  const pageAccess = await requireCoachPageAccess();
  if (!pageAccess.ok) return <CoachDashboardClient dashboardData={pageAccess.dashboardData} />;
  const [scheduleData, dashboardData, resolutionData] = await Promise.all([
    listScheduleOperationsData(),
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
      <ScheduleAlertsClient scheduleData={scopedScheduleData} dashboardData={dashboardData} mode="coach" />
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
