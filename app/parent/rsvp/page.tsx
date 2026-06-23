import { ParentRsvpClient } from "@/components/feature-panels";
import { listParentCoachDashboardData } from "@/lib/supabase/dashboard-data";
import { getSupabaseServerUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ParentRsvpPage() {
  const user = await getSupabaseServerUser();
  const dashboardData = await listParentCoachDashboardData({ viewerUserId: user?.id, surface: "parent" });
  return <ParentRsvpClient dashboardData={dashboardData} />;
}
