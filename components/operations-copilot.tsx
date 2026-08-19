"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { CheckCircle2, ClipboardCheck, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import type { OperationsCopilotApprovalStatus } from "@/lib/domain";
import type { OperationsCopilotWorkspace } from "@/lib/supabase/operations-copilot";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

interface OperationsCopilotProps {
  organizationId: string;
  initialWorkspace: OperationsCopilotWorkspace;
}

function requestKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `operations-copilot-${crypto.randomUUID()}`
    : `operations-copilot-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function authenticatedPost(path: string, body: unknown, idempotencyKey?: string) {
  const supabase = createSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    return new Response(JSON.stringify({ ok: false, message: "Sign in again before using Operations Copilot." }), {
      status: 401,
      headers: { "content-type": "application/json" }
    });
  }
  return fetch(path, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...(idempotencyKey ? { "idempotency-key": idempotencyKey } : {})
    },
    body: JSON.stringify(body)
  });
}

function statusLabel(status: OperationsCopilotApprovalStatus) {
  if (status === "approved") return "Plan approved";
  if (status === "rejected") return "Plan declined";
  if (status === "cancelled") return "Cancelled";
  return "Needs review";
}

export function OperationsCopilot({ organizationId, initialWorkspace }: OperationsCopilotProps) {
  const router = useRouter();
  const [workspace, setWorkspace] = useState(initialWorkspace);
  const [reviewReasons, setReviewReasons] = useState<Record<string, string>>({});
  const [message, setMessage] = useState(initialWorkspace.message);
  const [messageOk, setMessageOk] = useState(initialWorkspace.available);
  const [pendingAction, setPendingAction] = useState("");
  const [isPending, startTransition] = useTransition();
  const pendingCount = useMemo(
    () => workspace.proposals.filter((proposal) => proposal.status === "pending" && proposal.id).length,
    [workspace.proposals]
  );

  function refreshBriefing() {
    setPendingAction("generate");
    setMessage("Creating a scoped briefing and recording its review evidence...");
    startTransition(async () => {
      const response = await authenticatedPost(
        "/api/admin/operations-copilot/generate",
        { organizationId },
        requestKey()
      );
      const result = await response.json().catch(() => null) as { ok?: boolean; message?: string } | null;
      setMessageOk(Boolean(result?.ok));
      setMessage(result?.message ?? "Operations Copilot did not return a usable response.");
      setPendingAction("");
      if (result?.ok) router.refresh();
    });
  }

  function reviewProposal(id: string, decision: "approved" | "rejected") {
    const reason = reviewReasons[id]?.trim() ?? "";
    if (reason.length < 10) return;
    setPendingAction(`${decision}:${id}`);
    setMessage("Recording the administrator decision...");
    startTransition(async () => {
      const response = await authenticatedPost(`/api/admin/operations-copilot/${id}/review`, {
        organizationId,
        decision,
        reason
      });
      const result = await response.json().catch(() => null) as {
        ok?: boolean;
        message?: string;
        approval?: { status?: OperationsCopilotApprovalStatus; reviewedAt?: string; reviewReason?: string };
      } | null;
      setMessageOk(Boolean(result?.ok));
      setMessage(result?.message ?? "The proposal review did not return a usable response.");
      setPendingAction("");
      if (result?.ok && result.approval?.status) {
        setWorkspace((current) => ({
          ...current,
          proposals: current.proposals.map((proposal) => proposal.id === id ? {
            ...proposal,
            status: result.approval?.status ?? proposal.status,
            reviewedAt: result.approval?.reviewedAt,
            reviewReason: result.approval?.reviewReason
          } : proposal)
        }));
      }
    });
  }

  return (
    <section className="operations-copilot" aria-labelledby="operations-copilot-title">
      <div className="operations-copilot-heading">
        <div>
          <span className="eyebrow">Operations Copilot</span>
          <h2 id="operations-copilot-title">Turn scattered queues into reviewable next actions.</h2>
          <p>
            The copilot ranks organization-scoped signals and records a proposed plan. An administrator still
            decides, then completes the real work in the authoritative queue.
          </p>
        </div>
        <button
          type="button"
          onClick={refreshBriefing}
          disabled={!workspace.available || isPending}
        >
          <RefreshCw aria-hidden="true" size={18} />
          {pendingAction === "generate" ? "Building briefing..." : "Refresh briefing"}
        </button>
      </div>

      <div className="operations-copilot-trust" aria-label="Operations Copilot boundaries">
        <div><ClipboardCheck aria-hidden="true" size={20} /><span><strong>{pendingCount}</strong> pending proposal{pendingCount === 1 ? "" : "s"}</span></div>
        <div><ShieldCheck aria-hidden="true" size={20} /><span><strong>Human decision</strong> required for every plan</span></div>
        <div><CheckCircle2 aria-hidden="true" size={20} /><span><strong>No automatic execution</strong> or provider send</span></div>
      </div>

      <p className={`notice ${messageOk ? "ok" : "warning"}`} aria-live="polite">{message}</p>
      <p className="muted operations-copilot-provider">
        {workspace.providerReadiness.reason} Current delivery: {workspace.providerReadiness.delivery === "netlify_gateway" ? "Netlify AI Gateway" : "OpenAI direct"}.
      </p>

      {!workspace.proposals.length ? (
        <div className="operations-copilot-empty">
          <CheckCircle2 aria-hidden="true" size={28} />
          <div>
            <h3>No supported queue needs review</h3>
            <p className="muted">Registration, delivery, and media review counts are currently clear.</p>
          </div>
        </div>
      ) : (
        <div className="operations-copilot-list">
          {workspace.proposals.map((proposal) => {
            const durable = Boolean(proposal.id);
            const pending = proposal.status === "pending";
            const reason = proposal.id ? reviewReasons[proposal.id] ?? "" : "";
            return (
              <article className="operations-copilot-proposal" key={proposal.id ?? proposal.proposalKey}>
                <header>
                  <div>
                    <span className={`badge ${proposal.priority === "critical" ? "danger" : proposal.priority === "high" ? "warning" : ""}`}>
                      {proposal.priority} priority
                    </span>
                    <h3>{proposal.title}</h3>
                  </div>
                  <span className={`status-pill ${proposal.status === "approved" ? "ok" : pending ? "warning" : ""}`}>
                    {statusLabel(proposal.status)}
                  </span>
                </header>

                <p>{proposal.summary}</p>
                <div className="operations-copilot-reasoning">
                  <div><strong>Why now</strong><span>{proposal.rationale}</span></div>
                  <div><strong>Recommended next step</strong><span>{proposal.recommendedNextStep}</span></div>
                </div>
                <div className="operations-copilot-evidence" aria-label="Proposal evidence">
                  {proposal.evidence.map((item) => (
                    <span key={`${item.label}-${item.observedAt}`}><strong>{item.value}</strong> {item.label}</span>
                  ))}
                </div>
                <p className="muted"><strong>Boundary:</strong> {proposal.boundary}</p>

                {pending && durable ? (
                  <div className="operations-copilot-review">
                    <label htmlFor={`operations-review-${proposal.id}`}>
                      Administrator review reason
                    </label>
                    <textarea
                      id={`operations-review-${proposal.id}`}
                      rows={2}
                      maxLength={1000}
                      value={reason}
                      onChange={(event) => setReviewReasons((current) => ({ ...current, [proposal.id ?? ""]: event.target.value }))}
                    />
                    <small>At least 10 characters. Approval records the plan only and does not execute it.</small>
                    <div className="operations-copilot-actions">
                      <Link className="button secondary" href={proposal.actionHref}>Inspect queue</Link>
                      <button
                        type="button"
                        className="secondary"
                        disabled={isPending || reason.trim().length < 10}
                        onClick={() => reviewProposal(proposal.id ?? "", "rejected")}
                      >
                        <XCircle aria-hidden="true" size={18} />
                        {pendingAction === `rejected:${proposal.id}` ? "Recording..." : "Decline plan"}
                      </button>
                      <button
                        type="button"
                        disabled={isPending || reason.trim().length < 10}
                        onClick={() => reviewProposal(proposal.id ?? "", "approved")}
                      >
                        <CheckCircle2 aria-hidden="true" size={18} />
                        {pendingAction === `approved:${proposal.id}` ? "Recording..." : "Approve plan"}
                      </button>
                    </div>
                  </div>
                ) : pending ? (
                  <p className="notice warning">Preview only. Durable approval storage is not available.</p>
                ) : (
                  <div className="operations-copilot-decision">
                    <strong>{statusLabel(proposal.status)}</strong>
                    <span>{proposal.reviewReason ?? "A decision was recorded without an available display reason."}</span>
                    <Link href={proposal.actionHref}>Open authoritative queue</Link>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
