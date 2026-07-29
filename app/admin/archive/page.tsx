import { AdminReportsArchiveSurface } from "../_surfaces";

export const dynamic = "force-dynamic";

export default async function AdminArchivePage() {
  return <AdminReportsArchiveSurface />;
}

export const metadata = {
  title: "Archive"
};
