import { TeamPortalClient } from "@/components/feature-panels";
import { listTeamPortalData } from "@/lib/supabase/team-portal";

export const dynamic = "force-dynamic";

export default async function TeamPortalPage() {
  const teamPortalData = await listTeamPortalData();
  return <TeamPortalClient teamPortalData={teamPortalData} />;
}
