import {
  ParentDashboardClient,
  ParentReplayClient,
  ParentRsvpClient,
  ScheduleAlertsClient,
  TeamPortalClient
} from "@/components/feature-panels";
import { CommunicationRoom } from "@/components/communication-room";
import { ParentAdditionalGuardianClient } from "@/components/additional-guardian-access";
import { FamilyMissionControlClient } from "@/components/family-mission-control";
import { ParentTransportationClient } from "@/components/family-transportation";
import {
  FamilyFlightPlanClient,
  ParentNotificationReceiptsClient
} from "@/components/coordination-workbenches";
import { listParentCoachDashboardData } from "@/lib/supabase/dashboard-data";
import { listParentFamilyHandoffs } from "@/lib/supabase/family-flight-plan";
import { listParentNotificationReceipts } from "@/lib/supabase/notification-receipts";
import { scopeScheduleOperationsData, scopeTeamChatData, scopeTeamPortalData } from "@/lib/supabase/route-scopes";
import { listScheduleOperationsData } from "@/lib/supabase/schedule-management";
import { requireParentPageAccess } from "@/lib/supabase/shell-access";
import { listTeamChatData } from "@/lib/supabase/team-chat";
import { listTeamPortalData } from "@/lib/supabase/team-portal";
import { listParentAdditionalGuardianData } from "@/lib/supabase/additional-guardians";
import { buildFamilyMissionControl } from "@/lib/family-mission-control";
import { listParentTransportationData } from "@/lib/supabase/transportation";

export async function loadParentDashboardForPage() {
  const pageAccess = await requireParentPageAccess();
  if (!pageAccess.ok) return pageAccess.dashboardData;
  return listParentCoachDashboardData({ viewerUserId: pageAccess.access.userId, surface: "parent" });
}

export async function ParentHomeSurface() {
  const pageAccess = await requireParentPageAccess();
  if (!pageAccess.ok || !pageAccess.access.userId) {
    return <ParentDashboardClient dashboardData={pageAccess.dashboardData} />;
  }
  const [dashboardData, notificationData, handoffData, transportationData] = await Promise.all([
    listParentCoachDashboardData({ viewerUserId: pageAccess.access.userId, surface: "parent" }),
    listParentNotificationReceipts({ parentUserId: pageAccess.access.userId }),
    listParentFamilyHandoffs({ parentUserId: pageAccess.access.userId }),
    listParentTransportationData(pageAccess.access.userId)
  ]);
  const missionControl = buildFamilyMissionControl({
    state: dashboardData.state,
    parentUserId: pageAccess.access.userId,
    handoffs: handoffData.handoffs,
    transportationResponsibilities: transportationData.responsibilities,
    accessStatus: dashboardData.accessStatus,
    isSupabaseBacked: dashboardData.isSupabaseBacked,
    message: dashboardData.message,
    now: new Date().toISOString()
  });
  return (
    <>
      <FamilyMissionControlClient view={missionControl} />
      <FamilyFlightPlanClient
        state={dashboardData.state}
        parentUserId={pageAccess.access.userId}
        initialHandoffs={handoffData.handoffs}
        message={handoffData.message}
      />
      <ParentDashboardClient dashboardData={dashboardData} />
      <ParentNotificationReceiptsClient
        initialReceipts={notificationData.receipts}
        message={notificationData.message}
      />
    </>
  );
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
  const viewerUserId = pageAccess.access.userId ?? "";
  const [teamChatData, dashboardData, notificationData] = await Promise.all([
    listTeamChatData(),
    listParentCoachDashboardData({ viewerUserId, surface: "parent" }),
    listParentNotificationReceipts({ parentUserId: viewerUserId, limit: 50 })
  ]);
  const scopedTeamChatData = scopeTeamChatData(teamChatData, pageAccess.access.parentTeamIds, viewerUserId);
  return (
    <CommunicationRoom
      dashboardData={dashboardData}
      initialReceipts={notificationData.receipts}
      receiptLoadOk={notificationData.ok}
      receiptMessage={notificationData.message}
      teamChatData={scopedTeamChatData}
      viewerUserId={viewerUserId}
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

export async function ParentFamilyAccessSurface() {
  const pageAccess = await requireParentPageAccess();
  if (!pageAccess.ok || !pageAccess.access.userId) {
    return <ParentDashboardClient dashboardData={pageAccess.dashboardData} />;
  }
  const data = await listParentAdditionalGuardianData(pageAccess.access.userId);
  return <ParentAdditionalGuardianClient data={data} />;
}

export async function ParentTransportationSurface() {
  const pageAccess = await requireParentPageAccess();
  if (!pageAccess.ok || !pageAccess.access.userId) {
    return <ParentDashboardClient dashboardData={pageAccess.dashboardData} />;
  }
  const data = await listParentTransportationData(pageAccess.access.userId);
  return <ParentTransportationClient data={data} />;
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
