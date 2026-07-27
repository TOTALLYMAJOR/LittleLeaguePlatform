import { AdminAccessDeniedSurface } from "../_surfaces";
import { SponsorHub } from "@/components/sponsor-hub";
import { requireAdminPageAccess } from "@/lib/supabase/shell-access";
import { listSponsorAdminData } from "@/lib/supabase/sponsors";

export const dynamic = "force-dynamic";

export default async function AdminSponsorsPage() {
  const pageAccess = await requireAdminPageAccess();
  if (!pageAccess.ok) return <AdminAccessDeniedSurface message={pageAccess.message} />;

  const organizationId = pageAccess.access.contexts?.find((context) => context.role === "admin")?.organizationId
    ?? pageAccess.access.adminOrganizationIds[0];
  if (!organizationId) {
    return <AdminAccessDeniedSurface message="An active organization context is required for Sponsor Hub." />;
  }

  const sponsorData = await listSponsorAdminData({ organizationId });
  return <SponsorHub initialData={sponsorData} />;
}
