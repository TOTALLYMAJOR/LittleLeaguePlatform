import {
  ParentDashboardClient,
  ParentReplayClient,
  ParentRsvpClient,
  ScheduleAlertsClient
} from "@/components/feature-panels";
import { CommunicationRoom } from "@/components/communication-room";
import { ParentWeeklyDashboard } from "@/components/parent-weekly-dashboard";
import { ParentTransportationClient } from "@/components/family-transportation";
import { FamilyFlightPlanClient } from "@/components/coordination-workbenches";
import { FamilyParentReplay } from "@/components/family-parent-replay";
import { FamilySettingsClient } from "@/components/family-first-sign-in";
import { FamilyPhotos } from "@/components/family-photos";
import { FamilyAccessProgression } from "@/components/family-access-progression";
import { listParentCoachDashboardData } from "@/lib/supabase/dashboard-data";
import { listParentFamilyHandoffs } from "@/lib/supabase/family-flight-plan";
import { listParentNotificationReceipts } from "@/lib/supabase/notification-receipts";
import { listParentEventChangeLogs } from "@/lib/supabase/event-change-log-reads";
import { scopeScheduleOperationsData, scopeTeamChatData, scopeTeamPortalData } from "@/lib/supabase/route-scopes";
import { listScheduleOperationsData } from "@/lib/supabase/schedule-management";
import { requireParentPageAccess } from "@/lib/supabase/shell-access";
import { listTeamChatData } from "@/lib/supabase/team-chat";
import { listTeamPortalData } from "@/lib/supabase/team-portal";
import { listParentAdditionalGuardianData } from "@/lib/supabase/additional-guardians";
import { buildFamilyMissionControl } from "@/lib/family-mission-control";
import { listParentTransportationData } from "@/lib/supabase/transportation";
import { listParentTemporaryCaregiverData } from "@/lib/supabase/temporary-caregivers";
import { listFamilyReplays } from "@/lib/supabase/family-replays";
import { listParentSeasonTransitions } from "@/lib/supabase/season-transitions";

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
  const dashboardData = await listParentCoachDashboardData({
    viewerUserId: pageAccess.access.userId,
    surface: "parent"
  });
  const familyTimeZone = dashboardData.state.notificationPreferences.find((preference) => (
    preference.userId === pageAccess.access.userId && preference.timezone
  ))?.timezone ?? "America/Chicago";
  const [notificationData, handoffData, transportationData, replayData, eventChangeData] = await Promise.all([
    listParentNotificationReceipts({ parentUserId: pageAccess.access.userId }),
    listParentFamilyHandoffs({ parentUserId: pageAccess.access.userId }),
    listParentTransportationData(pageAccess.access.userId),
    listFamilyReplays({ parentUserId: pageAccess.access.userId }),
    listParentEventChangeLogs({ parentUserId: pageAccess.access.userId, timeZone: familyTimeZone })
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
      <ParentWeeklyDashboard
        view={missionControl}
        dashboardData={dashboardData}
        replayData={replayData}
        notificationReceipts={notificationData.receipts}
        notificationLoadOk={notificationData.ok}
        transportationData={transportationData}
        eventChangeData={eventChangeData}
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
    "Showing events for your children's teams."
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

export async function ParentPhotosSurface() {
  const pageAccess = await requireParentPageAccess();
  if (!pageAccess.ok) return <ParentDashboardClient dashboardData={pageAccess.dashboardData} />;
  const teamPortalData = await listTeamPortalData();
  const scopedTeamPortalData = teamPortalData
    ? scopeTeamPortalData(teamPortalData, pageAccess.access.parentTeamIds, {
      audience: "parent",
      viewerUserId: pageAccess.access.userId
    })
    : null;
  const familyReleasedIds = new Set(scopedTeamPortalData?.familyReleasedMediaItemIds ?? []);
  const teamNames = new Map(scopedTeamPortalData?.teams.map((team) => [team.id, team.name]) ?? []);
  const photos = (scopedTeamPortalData?.mediaItems ?? [])
    .filter((item) => familyReleasedIds.has(item.id) && item.moderationStatus === "approved")
    .map((item) => ({
      ...item,
      teamName: teamNames.get(item.teamId) ?? "Linked team"
    }));
  const childLabels = (scopedTeamPortalData?.players ?? []).map((player) => (
    `${player.firstName} ${player.lastInitial}.`
  ));
  return (
    <FamilyPhotos
      photos={photos}
      childLabels={childLabels}
      isCurrent={Boolean(scopedTeamPortalData)}
    />
  );
}

export async function ParentPracticeRecapsSurface() {
  const pageAccess = await requireParentPageAccess();
  if (!pageAccess.ok || !pageAccess.access.userId) {
    return <ParentDashboardClient dashboardData={pageAccess.dashboardData} />;
  }
  const data = await listFamilyReplays({ parentUserId: pageAccess.access.userId });
  return <FamilyParentReplay data={data} />;
}

export async function ParentFamilyAccessSurface() {
  const pageAccess = await requireParentPageAccess();
  if (!pageAccess.ok || !pageAccess.access.userId) {
    return <ParentDashboardClient dashboardData={pageAccess.dashboardData} />;
  }
  const [guardianData, caregiverData, transitionData] = await Promise.all([
    listParentAdditionalGuardianData(pageAccess.access.userId),
    listParentTemporaryCaregiverData(pageAccess.access.userId),
    listParentSeasonTransitions(pageAccess.access.userId)
  ]);
  return <FamilyAccessProgression
    guardianData={guardianData}
    caregiverData={caregiverData}
    transitionData={transitionData}
  />;
}

export async function ParentTransportationSurface() {
  const pageAccess = await requireParentPageAccess();
  if (!pageAccess.ok || !pageAccess.access.userId) {
    return <ParentDashboardClient dashboardData={pageAccess.dashboardData} />;
  }
  const [data, dashboardData, handoffData] = await Promise.all([
    listParentTransportationData(pageAccess.access.userId),
    listParentCoachDashboardData({ viewerUserId: pageAccess.access.userId, surface: "parent" }),
    listParentFamilyHandoffs({ parentUserId: pageAccess.access.userId })
  ]);
  return (
    <>
      <ParentTransportationClient data={data} />
      <div id="caregiver-coordination">
        <FamilyFlightPlanClient
          state={dashboardData.state}
          parentUserId={pageAccess.access.userId}
          initialHandoffs={handoffData.handoffs}
          message={handoffData.message}
        />
      </div>
    </>
  );
}

export async function ParentSettingsSurface() {
  const pageAccess = await requireParentPageAccess();
  if (!pageAccess.ok || !pageAccess.access.userId) {
    return <ParentDashboardClient dashboardData={pageAccess.dashboardData} />;
  }
  const dashboardData = await listParentCoachDashboardData({
    viewerUserId: pageAccess.access.userId,
    surface: "parent"
  });
  return <FamilySettingsClient dashboardData={dashboardData} />;
}

export async function ParentReplayReadSurface() {
  const pageAccess = await requireParentPageAccess();
  if (!pageAccess.ok) return <ParentDashboardClient dashboardData={pageAccess.dashboardData} />;
  const dashboardData = await listParentCoachDashboardData({ viewerUserId: pageAccess.access.userId, surface: "parent" });
  return <ParentReplayClient dashboardData={dashboardData} />;
}
