import { AdminDashboardClient } from "@/components/feature-panels";
import { listMediaGovernanceData } from "@/lib/supabase/media-governance";
import { listRegistrationRequests } from "@/lib/supabase/registrations";
import { listSponsorAdminData } from "@/lib/supabase/sponsors";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [registrationRequests, sponsorData, mediaData] = await Promise.all([
    listRegistrationRequests(),
    listSponsorAdminData(),
    listMediaGovernanceData()
  ]);

  return <AdminDashboardClient registrationRequests={registrationRequests} sponsorData={sponsorData} mediaData={mediaData} />;
}
