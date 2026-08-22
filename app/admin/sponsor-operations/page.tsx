import { AdminDashboardSurface } from "../_surfaces";

export const dynamic = "force-dynamic";

export default async function AdminSponsorOperationsPage() {
  return <AdminDashboardSurface surface="sponsors" />;
}

export const metadata = {
  title: "Sponsor Operations"
};
