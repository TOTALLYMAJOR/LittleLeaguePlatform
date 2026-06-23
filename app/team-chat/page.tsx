import { TeamChatClient } from "@/components/feature-panels";
import { listTeamChatData } from "@/lib/supabase/team-chat";

export const dynamic = "force-dynamic";

export default async function TeamChatPage() {
  const teamChatData = await listTeamChatData();
  return <TeamChatClient teamChatData={teamChatData} />;
}
