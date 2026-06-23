import { RegistrationReviewClient } from "@/components/feature-panels";
import { listRegistrationReviewData } from "@/lib/supabase/registration-approvals";

export const dynamic = "force-dynamic";

export default async function RegistrationReviewPage() {
  const data = await listRegistrationReviewData();

  return <RegistrationReviewClient initialData={data} />;
}
