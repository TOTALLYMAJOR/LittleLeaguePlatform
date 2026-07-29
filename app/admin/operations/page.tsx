import { AdminOperationsSurface } from "../_surfaces";

export const dynamic = "force-dynamic";

export default async function AdminOperationsPage() {
  return <AdminOperationsSurface />;
}

export const metadata = {
  title: "Operations"
};
