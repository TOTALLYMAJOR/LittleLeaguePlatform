import { createOpenAI } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage
} from "ai";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import type { AiCoachWorkspaceDraft } from "../../domain";

export type AiCoachProviderDelivery = "direct_openai" | "netlify_gateway";

export interface AiCoachProviderConfig {
  apiKey?: string;
  enabled?: boolean;
  model?: string;
  endpoint?: string;
  fetcher?: typeof fetch;
}

export interface AiCoachProviderReadiness {
  configured: boolean;
  delivery: AiCoachProviderDelivery;
  provider: "openai";
  model: string;
  reason: string;
}

export interface AiCoachProviderResult {
  ok: boolean;
  message: string;
  provider: "openai";
  model: string;
  source: "openai" | "deterministic";
  draft: AiCoachWorkspaceDraft;
  reviewNotes: string[];
  refusalText?: string;
  validationError?: string;
  trust: {
    includedSources: string[];
    excludedSources: string[];
    generatedAt?: string;
    model: string;
    humanReviewRequired: true;
  };
}

const ProviderDraftSchema = z.object({
  title: z.string().min(1).max(160),
  body: z.string().min(1).max(5000),
  reviewNotes: z.array(z.string().min(1).max(240)).max(6)
});

const DEFAULT_MODEL = "gpt-5.5";
const DEFAULT_ENDPOINT = "https://api.openai.com/v1/responses";
const CONTACT_PATTERN = /(?:\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b)/i;
const PRIVATE_DETAIL_PATTERN = /\b(?:medical|diagnosis|allergy|custody|billing proof|payment proof|private rsvp note|private note|hidden message|home address)\b/i;
const UNSUPPORTED_AUTOMATION_PATTERN = /\b(?:was|were|has been|have been|is|are)\s+(?:already\s+)?(?:sent|delivered|published|emailed|texted|pushed)\s+(?:to|for)\b|\b(?:sent|delivered|published|emailed|texted|pushed)\s+to\s+(?:families|parents|guardians|the team)\b|\b(?:send|email|text|push|publish|deliver)\s+(?:this|it|now|to all|to families|to parents)\b/i;
const UNSOURCED_CLAIM_PATTERN = /\b(?:i inferred|i found online|i checked email|i looked up|according to parents|medical record|private note says)\b/i;

export function getAiCoachProviderConfigFromEnv(env: NodeJS.ProcessEnv = process.env): AiCoachProviderConfig {
  return {
    apiKey: env.OPENAI_API_KEY,
    enabled: env.AI_COACH_PROVIDER_ENABLED === "true",
    model: env.OPENAI_AI_COACH_MODEL || DEFAULT_MODEL,
    endpoint: env.OPENAI_BASE_URL || undefined
  };
}

export function getAiCoachProviderReadiness(config: AiCoachProviderConfig = getAiCoachProviderConfigFromEnv()): AiCoachProviderReadiness {
  const model = config.model || DEFAULT_MODEL;
  const delivery: AiCoachProviderDelivery = config.endpoint ? "netlify_gateway" : "direct_openai";

  if (!config.enabled) {
    return {
      configured: false,
      delivery,
      provider: "openai",
      model,
      reason: "AI Coach provider is disabled. Set AI_COACH_PROVIDER_ENABLED=true after eval and privacy gates pass."
    };
  }

  if (!config.apiKey) {
    return {
      configured: false,
      delivery,
      provider: "openai",
      model,
      reason: config.endpoint
        ? "OPENAI_API_KEY is missing in this runtime. Netlify AI Gateway normally injects OPENAI_API_KEY and OPENAI_BASE_URL after AI is enabled and the site has a production deploy."
        : "OPENAI_API_KEY is missing, so AI Coach Workspace remains deterministic."
    };
  }

  return {
    configured: true,
    delivery,
    provider: "openai",
    model,
    reason: config.endpoint
      ? "Netlify AI Gateway is configured for coach-reviewed AI workspace drafting."
      : "OpenAI Responses API is configured for coach-reviewed AI workspace drafts."
  };
}

export function scanAiCoachDraftForProvider(draft: AiCoachWorkspaceDraft) {
  return scanAiCoachProviderContent(
    [draft.title, draft.body, ...draft.sourceEvidence].join("\n"),
    "Draft"
  );
}

export function scanAiCoachPromptForProvider(prompt: string) {
  return scanAiCoachProviderContent(prompt, "Prompt");
}

export async function enhanceAiCoachWorkspaceDraft(
  draft: AiCoachWorkspaceDraft,
  config: AiCoachProviderConfig = getAiCoachProviderConfigFromEnv()
): Promise<AiCoachProviderResult> {
  const readiness = getAiCoachProviderReadiness(config);
  if (!readiness.configured) {
    return {
      ok: false,
      message: readiness.reason,
      provider: "openai",
      model: readiness.model,
      source: "deterministic",
      draft,
      reviewNotes: ["Provider call skipped; deterministic draft is unchanged."],
      trust: buildTrustEvidence(draft, readiness.model)
    };
  }

  const safety = scanAiCoachDraftForProvider(draft);
  if (!safety.ok) {
    return {
      ok: false,
      message: safety.message,
      provider: "openai",
      model: readiness.model,
      source: "deterministic",
      draft,
      reviewNotes: ["Provider call blocked by local privacy filter."],
      validationError: safety.message,
      trust: buildTrustEvidence(draft, readiness.model)
    };
  }

  try {
    const client = createAiCoachOpenAiClient(config);
    const response = await client.responses.parse({
      model: readiness.model,
      store: false,
      instructions: providerInstructions(),
      input: [{
        role: "user",
        content: JSON.stringify({
          title: draft.title,
          body: draft.body,
          sourceEvidence: draft.sourceEvidence,
          workflow: draft.workflow,
          boundary: draft.boundary
        })
      }],
      text: {
        format: zodTextFormat(ProviderDraftSchema, "leaguepilot_ai_coach_draft")
      }
    });
    const refusalText = extractRefusal(response.output);
    if (refusalText) {
      return {
        ok: false,
        message: "AI provider declined the draft. The deterministic draft is unchanged.",
        provider: "openai",
        model: readiness.model,
        source: "deterministic",
        draft,
        reviewNotes: ["Provider refusal recorded for authorized review."],
        refusalText,
        trust: buildTrustEvidence(draft, readiness.model)
      };
    }
    const providerDraft = response.output_parsed;
    const validation = ProviderDraftSchema.safeParse(providerDraft);
    if (!validation.success) {
      return {
        ok: false,
        message: "AI provider returned an invalid structured draft. The deterministic draft is unchanged.",
        provider: "openai",
        model: readiness.model,
        source: "deterministic",
        draft,
        reviewNotes: ["Structured output did not pass the required schema."],
        validationError: z.prettifyError(validation.error),
        trust: buildTrustEvidence(draft, readiness.model)
      };
    }

    const nextDraft: AiCoachWorkspaceDraft = {
      ...draft,
      title: validation.data.title.trim(),
      body: validation.data.body.trim(),
      sourceEvidence: [...draft.sourceEvidence, "OpenAI Responses API structured draft"],
      boundary: `${draft.boundary} AI provider output remains coach-reviewed and cannot publish automatically.`
    };
    const outputSafety = scanAiCoachDraftForProvider(nextDraft);
    if (!outputSafety.ok) {
      return {
        ok: false,
        message: "AI provider output failed the local privacy filter. The deterministic draft is unchanged.",
        provider: "openai",
        model: readiness.model,
        source: "deterministic",
        draft,
        reviewNotes: ["Provider output was discarded."],
        validationError: outputSafety.message,
        trust: buildTrustEvidence(draft, readiness.model)
      };
    }
    return {
      ok: true,
      message: "AI provider draft created for coach review. Nothing was published or sent.",
      provider: "openai",
      model: readiness.model,
      source: "openai",
      draft: nextDraft,
      reviewNotes: validation.data.reviewNotes,
      trust: buildTrustEvidence(draft, readiness.model, response.created_at)
    };
  } catch (error) {
    return {
      ok: false,
      message: "AI provider request failed; deterministic draft is unchanged.",
      provider: "openai",
      model: readiness.model,
      source: "deterministic",
      draft,
      reviewNotes: ["Provider request failed closed."],
      validationError: error instanceof Error ? error.message.slice(0, 500) : "Unknown provider error.",
      trust: buildTrustEvidence(draft, readiness.model)
    };
  }
}

export async function streamAiCoachWorkspaceConversation(input: {
  actorUserId: string;
  draft: AiCoachWorkspaceDraft;
  messages: UIMessage[];
  config?: AiCoachProviderConfig;
}) {
  const config = input.config ?? getAiCoachProviderConfigFromEnv();
  const readiness = getAiCoachProviderReadiness(config);
  const provider = createOpenAI({
    ...(config.apiKey ? { apiKey: config.apiKey } : {}),
    ...(config.endpoint ? { baseURL: providerBaseUrl(config.endpoint) } : {})
  });

  const result = streamText({
    model: provider.responses(readiness.model),
    instructions: providerConversationInstructions(input.draft),
    providerOptions: {
      openai: {
        store: false,
        user: input.actorUserId
      }
    },
    messages: await convertToModelMessages(input.messages)
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream
    })
  });
}

function providerInstructions() {
  return [
    "Rewrite the supplied youth sports coach workspace draft for clarity and parent/coach usefulness.",
    "Use only supplied source evidence. Do not invent schedules, player details, medical details, contact details, or provider-send claims.",
    "Use child/player references only as first name plus last initial or jersey number if already supplied.",
    "Keep the result draft/review-only. Do not say it was sent, published, approved, or delivered.",
    "Return JSON only with keys title, body, and reviewNotes. reviewNotes must be an array of short strings."
  ].join(" ");
}

function providerConversationInstructions(draft: AiCoachWorkspaceDraft) {
  return [
    "You are LeaguePilot AI Coach Workspace, a review-only youth sports draft assistant.",
    "Use only the supplied draft and source evidence. If the draft does not establish a fact, say that clearly instead of guessing.",
    "Never invent schedules, attendance promises, contact details, medical details, private notes, hidden messages, or cross-team facts.",
    "Never say anything was sent, published, approved, delivered, queued, or shared externally.",
    "Keep responses concise and practical for a coach editing family-facing copy. Use bullets only when it improves clarity.",
    "Preserve child privacy. Use first name plus last initial or jersey numbers only if already present in the draft.",
    `Active draft label: ${draft.label}`,
    `Active draft title: ${draft.title}`,
    `Active draft workflow: ${draft.workflow.join(" -> ")}`,
    `Active draft boundary: ${draft.boundary}`,
    "Draft body:",
    draft.body,
    "Source evidence:",
    draft.sourceEvidence.length ? draft.sourceEvidence.map((item) => `- ${item}`).join("\n") : "- No explicit source evidence was supplied."
  ].join("\n\n");
}

function providerBaseUrl(endpoint?: string) {
  const value = endpoint ?? DEFAULT_ENDPOINT;
  return value.replace(/\/responses\/?$/, "");
}

function extractRefusal(output: OpenAI.Responses.ResponseOutputItem[]) {
  for (const item of output) {
    if (item.type !== "message") continue;
    for (const content of item.content) {
      if (content.type === "refusal") return content.refusal;
    }
  }
  return undefined;
}

function buildTrustEvidence(
  draft: AiCoachWorkspaceDraft,
  model: string,
  createdAtSeconds?: number
): AiCoachProviderResult["trust"] {
  return {
    includedSources: [...draft.sourceEvidence],
    excludedSources: [
      "Private parent notes",
      "Contact details",
      "Unapproved media",
      "Deleted or cross-team messages"
    ],
    generatedAt: createdAtSeconds ? new Date(createdAtSeconds * 1000).toISOString() : undefined,
    model,
    humanReviewRequired: true
  };
}

function createAiCoachOpenAiClient(config: AiCoachProviderConfig) {
  return new OpenAI({
    ...(config.apiKey ? { apiKey: config.apiKey } : {}),
    baseURL: providerBaseUrl(config.endpoint),
    fetch: config.fetcher
  });
}

function scanAiCoachProviderContent(content: string, subject: string) {
  if (CONTACT_PATTERN.test(content)) {
    return {
      ok: false,
      message: `${subject} contains contact details and cannot be sent to an AI provider.`
    };
  }

  if (PRIVATE_DETAIL_PATTERN.test(content)) {
    return {
      ok: false,
      message: `${subject} contains private player or family details and cannot be sent to an AI provider.`
    };
  }

  if (UNSUPPORTED_AUTOMATION_PATTERN.test(content)) {
    return {
      ok: false,
      message: `${subject} claims a provider send, publish, or delivery action that the AI provider cannot perform.`
    };
  }

  if (UNSOURCED_CLAIM_PATTERN.test(content)) {
    return {
      ok: false,
      message: `${subject} appears to rely on unsourced private or external claims and cannot be sent to an AI provider.`
    };
  }

  return { ok: true, message: `${subject} is provider-safe.` };
}
