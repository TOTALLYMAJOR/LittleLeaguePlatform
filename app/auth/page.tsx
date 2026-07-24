import { AuthClient } from "@/components/feature-panels";

export default async function AuthPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const { returnTo = "" } = await searchParams;
  const safeReturnTo = returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "";
  return <AuthClient returnTo={safeReturnTo} />;
}
