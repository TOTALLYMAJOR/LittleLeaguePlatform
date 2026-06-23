import { AdminDashboardClient } from "@/components/feature-panels";
import { listRegistrationRequests } from "@/lib/supabase/registrations";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const registrationRequests = await listRegistrationRequests();

  return <AdminDashboardClient registrationRequests={registrationRequests} />;
}
