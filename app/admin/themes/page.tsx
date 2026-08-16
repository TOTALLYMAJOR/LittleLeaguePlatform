import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminThemesPage() {
  redirect("/admin/branding");
}

export const metadata = {
  title: "Branding"
};
