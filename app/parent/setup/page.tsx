import { redirect } from "next/navigation";
import { FamilyFirstSignInClient } from "@/components/family-first-sign-in";
import { getServerShellAccess } from "@/lib/supabase/shell-access";

export const dynamic = "force-dynamic";

export default async function ParentSetupPage() {
  const access = await getServerShellAccess();
  if (!access.signedIn) redirect("/auth");
  if (!access.canParent) redirect("/account");
  return <FamilyFirstSignInClient />;
}

export const metadata = {
  title: "Family Setup"
};
