import { ParentReplayClient } from "@/components/feature-panels";
import { listParentCoachDashboardData } from "@/lib/supabase/dashboard-data";
import { getSupabaseServerUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CoachParentReplayPage() {
  const user = await getSupabaseServerUser();
  const dashboardData = await listParentCoachDashboardData({ viewerUserId: user?.id, surface: "coach" });
  return <ParentReplayClient dashboardData={dashboardData} />;
}
