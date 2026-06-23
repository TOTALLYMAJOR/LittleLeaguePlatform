import { RegistrationClient } from "@/components/feature-panels";
import { listRegistrationRequests, listRegistrationTeamOptions } from "@/lib/supabase/registrations";

export const dynamic = "force-dynamic";

export default async function RegistrationPage() {
  const [teams, registrationRequests] = await Promise.all([
    listRegistrationTeamOptions(),
    listRegistrationRequests()
  ]);

  return <RegistrationClient registrationRequests={registrationRequests} teamOptions={teams} />;
}
