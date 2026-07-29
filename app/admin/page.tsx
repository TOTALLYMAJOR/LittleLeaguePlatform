import { AdminDashboardSurface } from "./_surfaces";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  return <AdminDashboardSurface />;
}

export const metadata = {
  title: "League Admin"
};
