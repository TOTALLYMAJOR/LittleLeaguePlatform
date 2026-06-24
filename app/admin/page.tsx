import { AdminDashboardClient } from "@/components/feature-panels";
import { listRegistrationRequests } from "@/lib/supabase/registrations";
import { listSponsorAdminData } from "@/lib/supabase/sponsors";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [registrationRequests, sponsorData] = await Promise.all([
    listRegistrationRequests(),
    listSponsorAdminData()
  ]);

  return <AdminDashboardClient registrationRequests={registrationRequests} sponsorData={sponsorData} />;
}
