import { createHash } from "node:crypto";
import { RegistrationClient } from "@/components/feature-panels";
import { listRegistrationTeamOptions } from "@/lib/supabase/registrations";

export const dynamic = "force-dynamic";

function publicOrganizationFingerprint(organizationId: string | undefined) {
  const normalized = organizationId?.trim().toLowerCase() ?? "";
  if (!normalized) return undefined;
  return createHash("sha256").update(normalized).digest("hex").slice(0, 16);
}

export default async function RegistrationPage() {
  const teams = await listRegistrationTeamOptions();
  const configuredReviewWindow = process.env.PUBLIC_ACCESS_REVIEW_WINDOW?.trim() ?? "";
  const reviewWindow = configuredReviewWindow || "within two business days";

  return (
    <RegistrationClient
      proofMetadata={{
        publicOrganizationFingerprint: publicOrganizationFingerprint(process.env.PUBLIC_ORGANIZATION_ID),
        reviewWindowConfigured: Boolean(configuredReviewWindow)
      }}
      reviewWindow={reviewWindow}
      teamOptions={teams}
    />
  );
}
