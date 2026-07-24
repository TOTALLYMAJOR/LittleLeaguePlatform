import { AccessStatusClient } from "@/components/access-activation";

export const dynamic = "force-dynamic";

export default async function AccessStatusPage({
  searchParams
}: {
  searchParams: Promise<{ reference?: string }>;
}) {
  const { reference = "" } = await searchParams;
  const reviewWindow = process.env.PUBLIC_ACCESS_REVIEW_WINDOW?.trim() || "within two business days";
  return <AccessStatusClient initialReference={reference} reviewWindow={reviewWindow} />;
}
