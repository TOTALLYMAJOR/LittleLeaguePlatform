import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import {
  buildDeterministicOperationsCopilotBrief,
  type OperationsCopilotBrief,
  type OperationsCopilotCandidate
} from "@/lib/domain";

export interface OperationsCopilotProviderConfig {
  enabled: boolean;
  apiKey?: string;
  baseUrl?: string;
  model: string;
}

export interface OperationsCopilotProviderReadiness {
  configured: boolean;
  delivery: "direct_openai" | "netlify_gateway";
  model: string;
  reason: string;
}

const ProviderBriefSchema = z.object({
  items: z.array(z.object({
    proposalKey: z.string().min(1).max(240),
    rationale: z.string().min(1).max(1000),
    recommendedNextStep: z.string().min(1).max(500)
  })).max(8)
});

export function getOperationsCopilotProviderConfig(
  env: NodeJS.ProcessEnv = process.env
): OperationsCopilotProviderConfig {
  return {
    enabled: env.AI_OPERATIONS_COPILOT_ENABLED === "true",
    apiKey: env.OPENAI_API_KEY,
    baseUrl: env.OPENAI_BASE_URL,
    model: env.OPENAI_OPERATIONS_COPILOT_MODEL || env.OPENAI_AI_COACH_MODEL || "gpt-5.5"
  };
}

export function getOperationsCopilotProviderReadiness(
  config: OperationsCopilotProviderConfig = getOperationsCopilotProviderConfig()
): OperationsCopilotProviderReadiness {
  const delivery = config.baseUrl ? "netlify_gateway" : "direct_openai";
  if (!config.enabled) {
    return {
      configured: false,
      delivery,
      model: config.model,
      reason: "AI Operations Copilot is disabled. Deterministic queue ranking remains available."
    };
  }
  if (!config.apiKey) {
    return {
      configured: false,
      delivery,
      model: config.model,
      reason: "OPENAI_API_KEY is unavailable. Deterministic queue ranking remains available."
    };
  }
  return {
    configured: true,
    delivery,
    model: config.model,
    reason: delivery === "netlify_gateway"
      ? "Netlify AI Gateway is configured for review-only operations ranking."
      : "OpenAI is configured for review-only operations ranking."
  };
}

export async function generateOperationsCopilotBrief(input: {
  candidates: OperationsCopilotCandidate[];
  config?: OperationsCopilotProviderConfig;
}): Promise<OperationsCopilotBrief> {
  const deterministic = buildDeterministicOperationsCopilotBrief(input.candidates);
  const config = input.config ?? getOperationsCopilotProviderConfig();
  const readiness = getOperationsCopilotProviderReadiness(config);
  if (!readiness.configured || !input.candidates.length) {
    return { ...deterministic, message: input.candidates.length ? readiness.reason : deterministic.message };
  }

  try {
    const client = new OpenAI({
      apiKey: config.apiKey,
      ...(config.baseUrl ? { baseURL: normalizeBaseUrl(config.baseUrl) } : {})
    });
    const response = await client.responses.parse({
      model: readiness.model,
      store: false,
      instructions: [
        "You are LeaguePilot Operations Copilot.",
        "Rank and explain only the supplied aggregate operational candidates.",
        "Do not invent records, identities, counts, deadlines, provider outcomes, or completed actions.",
        "Do not approve, execute, send, publish, modify, or claim completion.",
        "Return each supplied proposalKey at most once. Keep advice specific and concise.",
        "Every recommendation is review-only and must preserve its stated boundary."
      ].join(" "),
      input: [{
        role: "user",
        content: JSON.stringify(input.candidates.map((candidate) => ({
          proposalKey: candidate.proposalKey,
          title: candidate.title,
          summary: candidate.summary,
          priority: candidate.priority,
          evidence: candidate.evidence,
          boundary: candidate.boundary
        })))
      }],
      text: { format: zodTextFormat(ProviderBriefSchema, "leaguepilot_operations_brief") }
    });
    const parsed = ProviderBriefSchema.safeParse(response.output_parsed);
    if (!parsed.success) {
      return { ...deterministic, message: "AI output was invalid. LeaguePilot used deterministic queue ranking." };
    }

    const candidatesByKey = new Map(input.candidates.map((candidate) => [candidate.proposalKey, candidate]));
    const seen = new Set<string>();
    const proposals: OperationsCopilotBrief["proposals"] = parsed.data.items.flatMap((item) => {
      const candidate = candidatesByKey.get(item.proposalKey);
      if (!candidate || seen.has(item.proposalKey)) return [];
      seen.add(item.proposalKey);
      return [{
        ...candidate,
        rationale: item.rationale.trim(),
        recommendedNextStep: item.recommendedNextStep.trim(),
        source: "openai" as const,
        status: "pending" as const,
        createdAt: new Date().toISOString()
      }];
    });

    for (const fallbackProposal of deterministic.proposals) {
      if (!seen.has(fallbackProposal.proposalKey)) proposals.push(fallbackProposal);
    }

    return {
      source: "openai",
      provider: "openai",
      model: readiness.model,
      message: "AI ranked the current operational queues for administrator review. Nothing was approved or executed.",
      proposals
    };
  } catch {
    return {
      ...deterministic,
      message: "AI ranking was unavailable. LeaguePilot used deterministic queue ranking."
    };
  }
}

function normalizeBaseUrl(value: string) {
  return value.replace(/\/responses\/?$/, "").replace(/\/+$/, "");
}
