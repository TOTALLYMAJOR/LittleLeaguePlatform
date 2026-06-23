import { AdminThemesClient } from "@/components/feature-panels";
import { listAdminThemeData } from "@/lib/supabase/team-branding";

export const dynamic = "force-dynamic";

export default async function AdminThemesPage() {
  const initialData = await listAdminThemeData();
  return <AdminThemesClient initialData={initialData} />;
}
