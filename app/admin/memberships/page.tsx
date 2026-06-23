import { MembershipAdminClient } from "@/components/feature-panels";
import { listAdminMembershipData } from "@/lib/supabase/memberships";

export const dynamic = "force-dynamic";

export default async function MembershipAdminPage() {
  const data = await listAdminMembershipData();

  return <MembershipAdminClient initialData={data} />;
}
