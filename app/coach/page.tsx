import { CoachDashboardClient } from "@/components/feature-panels";
import { listParentCoachDashboardData } from "@/lib/supabase/dashboard-data";
import { getSupabaseServerUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CoachDashboardPage() {
  const user = await getSupabaseServerUser();
  const dashboardData = await listParentCoachDashboardData({ viewerUserId: user?.id, surface: "coach" });
  return <CoachDashboardClient dashboardData={dashboardData} />;
}
