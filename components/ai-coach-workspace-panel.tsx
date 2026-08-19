"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useMemo, useState } from "react";
import type { AiCoachWorkspaceDraft } from "@/lib/domain";
import type { AiCoachProviderReadiness } from "@/lib/services/ai-coach";
import { StatusBadge } from "@/components/ui/primitives";

const defaultTrustEvidence = {
  includedSources: ["Visible team schedule", "Approved roster-safe names", "Coach-selected focus"],
  excludedSources: ["Private parent notes", "Contact details", "Unapproved media", "Cross-team records"]
};

export function AiCoachWorkspacePanel({
  teamId,
  drafts,
  providerReadiness,
  providerMessage,
  trustEvidence,
  onRequestRewrite,
  isRewritePending
}: {
  teamId: string;
  drafts: AiCoachWorkspaceDraft[];
  providerReadiness: AiCoachProviderReadiness;
  providerMessage: string;
  trustEvidence: {
    includedSources: string[];
    excludedSources: string[];
    generatedAt?: string;
    model: string;
    humanReviewRequired: true;
    runId?: string;
  } | null;
  onRequestRewrite: (draft: AiCoachWorkspaceDraft) => void;
  isRewritePending: boolean;
}) {
  const [selectedDraftId, setSelectedDraftId] = useState(drafts[0]?.id ?? "");

  const selectedDraft = useMemo(
    () => drafts.find((draft) => draft.id === selectedDraftId) ?? drafts[0] ?? null,
    [drafts, selectedDraftId]
  );
  const trust = trustEvidence ?? {
    ...defaultTrustEvidence,
    model: providerReadiness.model,
    humanReviewRequired: true as const
  };

  if (!selectedDraft) {
    return (
      <div className="ai-coach-workspace-grid">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">AI Coach Workspace</span>
              <h3>No workspace draft is ready</h3>
            </div>
          </div>
          <p className="muted">Pick a practice focus or save a Parent Replay draft before opening the coach console.</p>
        </article>
      </div>
    );
  }

  return (
    <div className="ai-coach-workspace-grid">
      <article className="card stack ai-coach-workspace-catalog">
        <div className="card-header">
          <div>
            <span className="eyebrow">Coach draft set</span>
            <h3>Choose the draft to refine</h3>
          </div>
          <span className="badge">{drafts.length} workspaces</span>
        </div>
        <p className="muted">Open the coach console on any draft, then ask for a shorter version, a warmer tone, stronger source discipline, or a publish-safe checklist.</p>
        <div className="ai-coach-draft-list" role="tablist" aria-label="AI Coach drafts">
          {drafts.map((draft) => {
            const active = draft.id === selectedDraft.id;
            return (
              <button
                type="button"
                key={draft.id}
                role="tab"
                aria-selected={active}
                className={`ai-coach-draft-card${active ? " active" : ""}`}
                onClick={() => setSelectedDraftId(draft.id)}
              >
                <span className="badge">{draft.label}</span>
                <strong>{draft.title}</strong>
                <span className="muted">Sources: {draft.sourceEvidence.join(", ") || "coach draft"}</span>
                <span className="muted">Workflow: {draft.workflow.join(" -> ")}</span>
              </button>
            );
          })}
        </div>
        <div className="toolbar ai-coach-draft-actions">
          <button type="button" disabled={isRewritePending} onClick={() => onRequestRewrite(selectedDraft)}>
            {isRewritePending ? "Requesting..." : "Request full AI rewrite"}
          </button>
        </div>
        <p className="notice">{selectedDraft.boundary}</p>
      </article>

      <AiCoachConversationConsole
        key={`${teamId}-${selectedDraft.id}-${selectedDraft.title}`}
        teamId={teamId}
        draft={selectedDraft}
        providerReadiness={providerReadiness}
        providerMessage={providerMessage}
        trust={trust}
      />
    </div>
  );
}

function AiCoachConversationConsole({
  teamId,
  draft,
  providerReadiness,
  providerMessage,
  trust
}: {
  teamId: string;
  draft: AiCoachWorkspaceDraft;
  providerReadiness: AiCoachProviderReadiness;
  providerMessage: string;
  trust: {
    includedSources: string[];
    excludedSources: string[];
    generatedAt?: string;
    model: string;
    humanReviewRequired: true;
    runId?: string;
  };
}) {
  const [prompt, setPrompt] = useState("");
  const suggestionPrompts = useMemo(() => buildSuggestionPrompts(draft), [draft]);
  const {
    messages,
    sendMessage,
    status,
    stop,
    error,
    regenerate
  } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/coach/ai-workspace/chat",
      prepareSendMessagesRequest: ({ id, messages }) => ({
        body: {
          id,
          teamId,
          draft,
          messages
        }
      })
    }),
    throttle: 50
  });

  const chatBusy = status === "submitted" || status === "streaming";
  const canPrompt = providerReadiness.configured && !chatBusy;

  function submitPrompt(text: string) {
    const nextText = text.trim();
    if (!nextText || !providerReadiness.configured) return;
    sendMessage({ text: nextText });
    setPrompt("");
  }

  return (
    <article className="card stack ai-coach-console">
      <div className="card-header">
        <div>
          <span className="eyebrow">AI Coach Console</span>
          <h3>{draft.title}</h3>
        </div>
        <StatusBadge
          label={providerReadiness.delivery === "netlify_gateway" ? "Netlify AI Gateway" : "OpenAI direct"}
          variant={providerReadiness.configured ? "success" : "warning"}
          dot
        />
      </div>

      <p className="muted">This assistant works only from the selected draft and source evidence. It cannot publish, send, grant access, or pull hidden family/team data.</p>

      <aside className="ai-trust-panel" aria-label="AI source and review evidence">
        <div className="card-header">
          <div>
            <span className="eyebrow">AI Trust Panel</span>
            <h3>{trust.runId ? "Generation evidence recorded" : "Review boundary ready"}</h3>
          </div>
          <span className="badge warning">Human review required</span>
        </div>
        <div className="grid two">
          <div>
            <strong>Included sources</strong>
            <ul className="list compact">
              {trust.includedSources.map((source) => <li key={source}>{source}</li>)}
            </ul>
          </div>
          <div>
            <strong>Always excluded</strong>
            <ul className="list compact">
              {trust.excludedSources.map((source) => <li key={source}>{source}</li>)}
            </ul>
          </div>
        </div>
        <p className="muted">
          Model: {trust.model}
          {trust.generatedAt ? ` · Generated ${formatDate(trust.generatedAt)}` : ""}
          {trust.runId ? ` · Evidence run ${trust.runId}` : ""}
        </p>
      </aside>

      {providerMessage ? <p className="notice">{providerMessage}</p> : null}
      {!providerReadiness.configured ? <p className="notice warning">{providerReadiness.reason}</p> : null}
      {error ? <p className="notice warning">AI coach chat failed closed. Try again or request a full rewrite instead.</p> : null}

      <div className="ai-coach-console-chat" aria-live="polite">
        {messages.length ? messages.map((message) => (
          <article key={message.id} className={`ai-chat-turn ${message.role === "user" ? "user" : "assistant"}`}>
            <div className="ai-chat-turn-meta">
              <strong>{message.role === "user" ? "Coach prompt" : "AI coach"}</strong>
            </div>
            <div className="ai-chat-bubble">
              <p className="ai-chat-bubble-body">{getMessageText(message)}</p>
            </div>
          </article>
        )) : (
          <article className="ai-chat-turn assistant">
            <div className="ai-chat-turn-meta">
              <strong>AI coach</strong>
            </div>
            <div className="ai-chat-bubble">
              <p className="ai-chat-bubble-body">Ask for a shorter version, a warmer tone, a publish-safe checklist, or a review of weakly sourced claims in this draft.</p>
            </div>
          </article>
        )}
      </div>

      <div className="ai-coach-suggestion-row">
        {suggestionPrompts.map((suggestion) => (
          <button
            type="button"
            className="button secondary sm"
            key={suggestion}
            disabled={!canPrompt}
            onClick={() => submitPrompt(suggestion)}
          >
            {suggestion}
          </button>
        ))}
      </div>

      <form
        className="ai-coach-prompt-form"
        onSubmit={(event) => {
          event.preventDefault();
          submitPrompt(prompt);
        }}
      >
        <label>
          Coach prompt
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            disabled={!providerReadiness.configured}
            placeholder="Example: shorten this for busy parents and flag any line that sounds unsourced."
          />
        </label>
        <div className="toolbar">
          {chatBusy ? (
            <button type="button" className="button secondary" onClick={() => stop()}>
              Stop
            </button>
          ) : null}
          {messages.length && !chatBusy ? (
            <button type="button" className="button secondary" onClick={() => regenerate()}>
              Regenerate last answer
            </button>
          ) : null}
          <button type="submit" disabled={!canPrompt || !prompt.trim()}>
            {chatBusy ? "Streaming..." : "Ask AI coach"}
          </button>
        </div>
      </form>
    </article>
  );
}

function buildSuggestionPrompts(draft: AiCoachWorkspaceDraft) {
  const shared = [
    "Make this shorter for busy parents.",
    "Rewrite this in a warmer coach voice without implying it was already sent.",
    "Flag any sentence that is weakly sourced or should stay out of family-facing copy."
  ];

  switch (draft.id) {
    case "announcement_cleaner":
      return [...shared, "Turn this into a publish-safe field update with a simple action list."];
    case "smart_faq":
      return [...shared, "Rewrite this answer so it stays inside the cited schedule facts only."];
    case "team_onboarding_brief":
      return [...shared, "Turn this into a first-day onboarding brief for a new volunteer coach."];
    default:
      return [...shared, "Give me a bullet-point version a coach can approve quickly."];
  }
}

function getMessageText(message: UIMessage) {
  return message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text.trim())
    .filter(Boolean)
    .join("\n\n");
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}
