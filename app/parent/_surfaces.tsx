import {
  ParentDashboardClient,
  ParentReplayClient,
  ParentRsvpClient,
  ScheduleAlertsClient,
  TeamChatClient,
  TeamPortalClient
} from "@/components/feature-panels";
import { listParentCoachDashboardData } from "@/lib/supabase/dashboard-data";
import { scopeScheduleOperationsData, scopeTeamChatData, scopeTeamPortalData } from "@/lib/supabase/route-scopes";
import { listScheduleOperationsData } from "@/lib/supabase/schedule-management";
import { requireParentPageAccess } from "@/lib/supabase/shell-access";
import { listTeamChatData } from "@/lib/supabase/team-chat";
import { listTeamPortalData } from "@/lib/supabase/team-portal";

export async function loadParentDashboardForPage() {
  const pageAccess = await requireParentPageAccess();
  if (!pageAccess.ok) return pageAccess.dashboardData;
  return listParentCoachDashboardData({ viewerUserId: pageAccess.access.userId, surface: "parent" });
}

export async function ParentHomeSurface() {
  const dashboardData = await loadParentDashboardForPage();
  return <ParentDashboardClient dashboardData={dashboardData} />;
}

export async function ParentRsvpSurface() {
  const dashboardData = await loadParentDashboardForPage();
  return <ParentRsvpClient dashboardData={dashboardData} />;
}

export async function ParentScheduleSurface() {
  const pageAccess = await requireParentPageAccess();
  if (!pageAccess.ok) return <ParentDashboardClient dashboardData={pageAccess.dashboardData} />;
  const [scheduleData, dashboardData] = await Promise.all([
    listScheduleOperationsData(),
    listParentCoachDashboardData({ viewerUserId: pageAccess.access.userId, surface: "parent" })
  ]);
  const scopedScheduleData = scopeScheduleOperationsData(
    scheduleData,
    pageAccess.access.parentTeamIds,
    "Showing schedule rows scoped to the signed-in parent's linked teams."
  );
  return <ScheduleAlertsClient scheduleData={scopedScheduleData} dashboardData={dashboardData} mode="parent" />;
}

export async function ParentMessagesSurface() {
  const pageAccess = await requireParentPageAccess();
  if (!pageAccess.ok) return <ParentDashboardClient dashboardData={pageAccess.dashboardData} />;
  const teamChatData = await listTeamChatData();
  const scopedTeamChatData = scopeTeamChatData(teamChatData, pageAccess.access.parentTeamIds, pageAccess.access.userId ?? "");
  return (
    <TeamChatClient
      teamChatData={scopedTeamChatData}
      viewerUserId={pageAccess.access.userId}
      lockedTeamId={scopedTeamChatData.teams[0]?.id}
    />
  );
}

export async function ParentPortalSurface({ audience = "parent" }: { audience?: "parent" | "coach" | "admin" } = {}) {
  const pageAccess = await requireParentPageAccess();
  if (!pageAccess.ok) return <ParentDashboardClient dashboardData={pageAccess.dashboardData} />;
  const teamPortalData = await listTeamPortalData();
  const scopedTeamPortalData = teamPortalData
    ? scopeTeamPortalData(teamPortalData, pageAccess.access.parentTeamIds, {
      audience,
      viewerUserId: pageAccess.access.userId
    })
    : null;
  return <TeamPortalClient teamPortalData={scopedTeamPortalData} audience={audience} />;
}

export async function ParentPracticeRecapsSurface() {
  return <ParentPortalSurface audience="parent" />;
}

export async function ParentSettingsSurface() {
  const dashboardData = await loadParentDashboardForPage();
  return <ParentDashboardClient dashboardData={dashboardData} />;
}

export async function ParentReplayReadSurface() {
  const pageAccess = await requireParentPageAccess();
  if (!pageAccess.ok) return <ParentDashboardClient dashboardData={pageAccess.dashboardData} />;
  const dashboardData = await listParentCoachDashboardData({ viewerUserId: pageAccess.access.userId, surface: "parent" });
  return <ParentReplayClient dashboardData={dashboardData} />;
}
