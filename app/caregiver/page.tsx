import { CaregiverPortalClient } from "@/components/temporary-caregiver-access";
import { getSupabaseServerUser } from "@/lib/supabase/server";
import { listCaregiverPortalData } from "@/lib/supabase/temporary-caregivers";

export const dynamic = "force-dynamic";

export default async function CaregiverPage() {
  const user = await getSupabaseServerUser();
  const data = await listCaregiverPortalData(user?.id ?? "");
  return <CaregiverPortalClient data={data} />;
}

export const metadata = {
  title: "Temporary Caregiver"
};
