import { AdminSecurityAuditSurface } from "../_surfaces";

export const dynamic = "force-dynamic";

export default async function AdminSecurityAuditPage() {
  return <AdminSecurityAuditSurface />;
}

export const metadata = {
  title: "Security & Audit"
};
