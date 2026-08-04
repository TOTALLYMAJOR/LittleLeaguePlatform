import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminSecurityProofPage() {
  redirect("/admin/security-audit");
}

export const metadata = {
  title: "Security & Audit"
};
