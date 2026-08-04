import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CoachRsvpsPage() {
  redirect("/coach/attendance");
}

export const metadata = {
  title: "RSVPs"
};
