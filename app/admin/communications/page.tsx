import { AdminCommunicationsSurface } from "../_surfaces";

export const dynamic = "force-dynamic";

export default async function AdminCommunicationsPage() {
  return <AdminCommunicationsSurface />;
}

export const metadata = {
  title: "Communications"
};
