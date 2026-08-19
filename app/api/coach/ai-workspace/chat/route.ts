import { NextResponse } from "next/server";
import type { UIMessage } from "ai";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireActiveTeamCoachOrOrgAdmin } from "@/lib/supabase/access-control";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";
import {
  getAiCoachProviderReadiness,
  scanAiCoachDraftForProvider,
  scanAiCoachPromptForProvider,
  streamAiCoachWorkspaceConversation
} from "@/lib/services/ai-coach";
import { parseAiCoachWorkspaceDraft } from "@/lib/services/ai-coach/contracts";

export const maxDuration = 30;

const allowedRoles = new Set(["user", "assistant", "system"]);

export async function POST(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "AI Coach Workspace chat body is required." }, { status: 400 });
  }

  const teamId = String((body as { teamId?: unknown }).teamId ?? "");
  const draft = parseAiCoachWorkspaceDraft((body as { draft?: unknown }).draft);
  const messages = parseAiCoachUiMessages((body as { messages?: unknown }).messages);

  if (!teamId || !draft || !messages?.length) {
    return NextResponse.json({
      ok: false,
      message: "AI Coach Workspace chat requires a team id, valid draft, and message history."
    }, { status: 400 });
  }

  const db = createSupabaseAdminClient();
  const access = await requireActiveTeamCoachOrOrgAdmin({
    db,
    teamId,
    userId: auth.user.id,
    action: "chat with AI Coach Workspace"
  });
  if (!access.ok) {
    return NextResponse.json({ ok: false, message: access.message }, { status: 403 });
  }

  const draftSafety = scanAiCoachDraftForProvider(draft);
  if (!draftSafety.ok) {
    return NextResponse.json({ ok: false, message: draftSafety.message }, { status: 400 });
  }

  const latestUserPrompt = getLatestUserPrompt(messages);
  if (!latestUserPrompt) {
    return NextResponse.json({ ok: false, message: "AI Coach Workspace chat needs a user prompt." }, { status: 400 });
  }

  const promptSafety = scanAiCoachPromptForProvider(latestUserPrompt);
  if (!promptSafety.ok) {
    return NextResponse.json({ ok: false, message: promptSafety.message }, { status: 400 });
  }

  const readiness = getAiCoachProviderReadiness();
  if (!readiness.configured) {
    return NextResponse.json({
      ok: false,
      message: readiness.reason,
      provider: readiness.provider,
      model: readiness.model,
      delivery: readiness.delivery
    }, { status: 503 });
  }

  return streamAiCoachWorkspaceConversation({
    actorUserId: auth.user.id,
    draft,
    messages
  });
}

function parseAiCoachUiMessages(value: unknown): UIMessage[] | null {
  if (!Array.isArray(value)) return null;
  const parsed = value.flatMap((item, index) => {
    if (!item || typeof item !== "object") return [];
    const candidate = item as { id?: unknown; role?: unknown; parts?: unknown };
    if (typeof candidate.role !== "string" || !allowedRoles.has(candidate.role)) return [];
    if (!Array.isArray(candidate.parts)) return [];

    const parts = candidate.parts.flatMap((part) => {
      if (!part || typeof part !== "object") return [];
      const textPart = part as { type?: unknown; text?: unknown };
      if (textPart.type !== "text" || typeof textPart.text !== "string") return [];
      const nextText = textPart.text.trim().slice(0, 4000);
      return nextText ? [{ type: "text" as const, text: nextText }] : [];
    });

    if (!parts.length) return [];
    return [{
      id: typeof candidate.id === "string" ? candidate.id : `ai-coach-msg-${index}`,
      role: candidate.role,
      parts
    }] as UIMessage[];
  });

  return parsed.length ? parsed.slice(-12) : null;
}

function getLatestUserPrompt(messages: UIMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role !== "user") continue;
    const text = message.parts
      .filter((part): part is { type: "text"; text: string } => part.type === "text" && typeof part.text === "string")
      .map((part) => part.text.trim())
      .filter(Boolean)
      .join("\n\n");
    if (text) return text;
  }
  return "";
}
