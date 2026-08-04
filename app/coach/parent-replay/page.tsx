import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CoachParentReplayPage() {
  redirect("/coach/practice-recaps");
}

export const metadata = {
  title: "Parent Replay"
};
