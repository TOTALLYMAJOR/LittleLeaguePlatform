import { createHash } from "node:crypto";
import type { AiCoachWorkspaceDraft } from "@/lib/domain";
import type { AiCoachProviderResult } from "@/lib/services/ai-coach";
import { createSupabaseAdminClient } from "./admin";
import { withSupabaseTimeout } from "./timeout";

type UnsafeSupabase = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
};

export async function recordAiCoachGenerationEvidence(input: {
  organizationId: string;
  teamId: string;
  actorUserId: string;
  sourceDraft: AiCoachWorkspaceDraft;
  result: AiCoachProviderResult;
}) {
  const observedAt = new Date().toISOString();
  const sourceManifest = input.sourceDraft.sourceEvidence.map((label) => ({
    label,
    included: true,
    observedAt
  }));
  const sourceHashes = input.sourceDraft.sourceEvidence.map((source) => (
    createHash("sha256").update(source).digest("hex")
  ));
  const promptHash = createHash("sha256").update(JSON.stringify({
    id: input.sourceDraft.id,
    title: input.sourceDraft.title,
    body: input.sourceDraft.body,
    sourceEvidence: input.sourceDraft.sourceEvidence,
    boundary: input.sourceDraft.boundary
  })).digest("hex");

  try {
    const db = createSupabaseAdminClient() as unknown as UnsafeSupabase;
    const { data, error } = await withSupabaseTimeout(db
      .from("ai_generation_runs")
      .insert({
        organization_id: input.organizationId,
        team_id: input.teamId,
        actor_user_id: input.actorUserId,
        feature: "weekly_digest",
        provider: input.result.provider,
        model: input.result.model,
        prompt_hash: promptHash,
        output_json: input.result.ok ? input.result.draft : {},
        review_status: "draft",
        source_manifest_json: sourceManifest,
        source_hashes: sourceHashes,
        source_observed_at: observedAt,
        refusal_text: input.result.refusalText ?? null,
        validation_error: input.result.validationError ?? null
      })
      .select("id,created_at,review_status")
      .single(), 7000) as {
        data: { id: string; created_at: string; review_status: string } | null;
        error: { message?: string } | null;
      };
    if (error || !data) {
      return { ok: false, message: "AI generation evidence could not be recorded." };
    }
    return {
      ok: true,
      message: "AI source manifest and review evidence recorded.",
      generationRun: data
    };
  } catch {
    return { ok: false, message: "AI generation evidence could not reach team records." };
  }
}
