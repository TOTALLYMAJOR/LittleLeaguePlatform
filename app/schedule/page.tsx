import { ScheduleAlertsClient } from "@/components/feature-panels";
import { listScheduleOperationsData } from "@/lib/supabase/schedule-management";

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const scheduleData = await listScheduleOperationsData();
  return <ScheduleAlertsClient scheduleData={scheduleData} />;
}
