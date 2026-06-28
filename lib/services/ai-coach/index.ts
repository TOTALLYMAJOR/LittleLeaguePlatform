import type { AiCoachWorkspaceDraft } from "../../domain";

export interface AiCoachProviderConfig {
  apiKey?: string;
  enabled?: boolean;
  model?: string;
  endpoint?: string;
  fetcher?: typeof fetch;
}

export interface AiCoachProviderReadiness {
  configured: boolean;
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
}

interface OpenAiResponsesPayload {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
}

interface ProviderDraftPayload {
  title?: unknown;
  body?: unknown;
  reviewNotes?: unknown;
}

const DEFAULT_MODEL = "gpt-5.5";
const DEFAULT_ENDPOINT = "https://api.openai.com/v1/responses";
const CONTACT_PATTERN = /(?:\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b)/i;
const PRIVATE_DETAIL_PATTERN = /\b(?:medical|diagnosis|allergy|custody|billing proof|payment proof|private rsvp note|private note|hidden message|home address)\b/i;

export function getAiCoachProviderConfigFromEnv(env: NodeJS.ProcessEnv = process.env): AiCoachProviderConfig {
  return {
    apiKey: env.OPENAI_API_KEY,
    enabled: env.AI_COACH_PROVIDER_ENABLED === "true",
    model: env.OPENAI_AI_COACH_MODEL || DEFAULT_MODEL
  };
}

export function getAiCoachProviderReadiness(config: AiCoachProviderConfig = getAiCoachProviderConfigFromEnv()): AiCoachProviderReadiness {
  const model = config.model || DEFAULT_MODEL;
  if (!config.enabled) {
    return {
      configured: false,
      provider: "openai",
      model,
      reason: "AI Coach provider is disabled. Set AI_COACH_PROVIDER_ENABLED=true after eval and privacy gates pass."
    };
  }

  if (!config.apiKey) {
    return {
      configured: false,
      provider: "openai",
      model,
      reason: "OPENAI_API_KEY is missing, so AI Coach Workspace remains deterministic."
    };
  }

  return {
    configured: true,
    provider: "openai",
    model,
    reason: "OpenAI Responses API is configured for coach-reviewed AI workspace drafts."
  };
}

export function scanAiCoachDraftForProvider(draft: AiCoachWorkspaceDraft) {
  const content = [draft.title, draft.body, ...draft.sourceEvidence].join("\n");
  if (CONTACT_PATTERN.test(content)) {
    return {
      ok: false,
      message: "Draft contains contact details and cannot be sent to an AI provider."
    };
  }

  if (PRIVATE_DETAIL_PATTERN.test(content)) {
    return {
      ok: false,
      message: "Draft contains private player or family details and cannot be sent to an AI provider."
    };
  }

  return { ok: true, message: "Draft is provider-safe." };
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
      reviewNotes: ["Provider call skipped; deterministic draft is unchanged."]
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
      reviewNotes: ["Provider call blocked by local privacy filter."]
    };
  }

  const fetcher = config.fetcher ?? fetch;
  const response = await fetcher(config.endpoint ?? DEFAULT_ENDPOINT, {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: readiness.model,
      store: false,
      instructions: providerInstructions(),
      input: JSON.stringify({
        title: draft.title,
        body: draft.body,
        sourceEvidence: draft.sourceEvidence,
        workflow: draft.workflow,
        boundary: draft.boundary
      })
    })
  });

  if (!response.ok) {
    return {
      ok: false,
      message: "AI provider request failed; deterministic draft is unchanged.",
      provider: "openai",
      model: readiness.model,
      source: "deterministic",
      draft,
      reviewNotes: [`Provider HTTP status ${response.status}.`]
    };
  }

  const payload = await response.json().catch(() => null) as OpenAiResponsesPayload | null;
  const providerDraft = parseProviderDraft(extractOutputText(payload));
  if (!providerDraft) {
    return {
      ok: false,
      message: "AI provider returned an unreadable draft; deterministic draft is unchanged.",
      provider: "openai",
      model: readiness.model,
      source: "deterministic",
      draft,
      reviewNotes: ["Provider output did not match the expected JSON shape."]
    };
  }

  const nextDraft: AiCoachWorkspaceDraft = {
    ...draft,
    title: providerDraft.title,
    body: providerDraft.body,
    sourceEvidence: [...draft.sourceEvidence, "OpenAI Responses API draft rewrite"],
    boundary: `${draft.boundary} AI provider output remains coach-reviewed and cannot publish automatically.`
  };

  const outputSafety = scanAiCoachDraftForProvider(nextDraft);
  if (!outputSafety.ok) {
    return {
      ok: false,
      message: "AI provider output failed the local privacy filter; deterministic draft is unchanged.",
      provider: "openai",
      model: readiness.model,
      source: "deterministic",
      draft,
      reviewNotes: ["Provider output was discarded."]
    };
  }

  return {
    ok: true,
    message: "AI provider draft created for coach review. Nothing was published or sent.",
    provider: "openai",
    model: readiness.model,
    source: "openai",
    draft: nextDraft,
    reviewNotes: providerDraft.reviewNotes
  };
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

function extractOutputText(payload: OpenAiResponsesPayload | null) {
  if (!payload) return "";
  if (typeof payload.output_text === "string") return payload.output_text;
  return payload.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => content.text)
    .filter((text): text is string => Boolean(text))
    .join("\n") ?? "";
}

function parseProviderDraft(outputText: string) {
  const cleaned = outputText
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");

  let parsed: ProviderDraftPayload;
  try {
    parsed = JSON.parse(cleaned) as ProviderDraftPayload;
  } catch {
    return null;
  }

  if (typeof parsed.title !== "string" || typeof parsed.body !== "string") return null;
  const reviewNotes = Array.isArray(parsed.reviewNotes)
    ? parsed.reviewNotes.filter((note): note is string => typeof note === "string").slice(0, 6)
    : [];

  return {
    title: parsed.title.trim().slice(0, 160),
    body: parsed.body.trim().slice(0, 5000),
    reviewNotes
  };
}
