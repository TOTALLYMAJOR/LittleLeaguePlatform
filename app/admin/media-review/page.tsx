import { AdminDashboardSurface } from "../_surfaces";

export const dynamic = "force-dynamic";

export default async function AdminMediaReviewPage() {
  return <AdminDashboardSurface surface="media" />;
}

export const metadata = {
  title: "Media Review"
};
