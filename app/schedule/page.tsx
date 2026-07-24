import { ScheduleAlertsClient } from "@/components/feature-panels";
import { listPublicScheduleOperationsData } from "@/lib/supabase/schedule-management";

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const scheduleData = await listPublicScheduleOperationsData();
  return <ScheduleAlertsClient scheduleData={scheduleData} mode="readonly" />;
}
