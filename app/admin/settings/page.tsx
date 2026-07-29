import { AdminOperationsSurface } from "../_surfaces";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  return <AdminOperationsSurface />;
}

export const metadata = {
  title: "League Settings"
};
