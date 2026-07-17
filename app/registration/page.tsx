import { RegistrationClient } from "@/components/feature-panels";
import { listRegistrationTeamOptions } from "@/lib/supabase/registrations";

export const dynamic = "force-dynamic";

export default async function RegistrationPage() {
  const teams = await listRegistrationTeamOptions();

  return <RegistrationClient teamOptions={teams} />;
}
