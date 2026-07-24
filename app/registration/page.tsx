import { RegistrationClient } from "@/components/feature-panels";
import { listRegistrationTeamOptions } from "@/lib/supabase/registrations";

export const dynamic = "force-dynamic";

export default async function RegistrationPage() {
  const teams = await listRegistrationTeamOptions();
  const reviewWindow = process.env.PUBLIC_ACCESS_REVIEW_WINDOW?.trim() || "within two business days";

  return <RegistrationClient reviewWindow={reviewWindow} teamOptions={teams} />;
}
