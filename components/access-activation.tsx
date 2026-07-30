"use client";

import { useState, useTransition } from "react";
import type { FamilyAccessStatus } from "@/lib/supabase/access-activation";

export function AccessStatusClient({
  initialReference = "",
  reviewWindow = "within two business days"
}: {
  initialReference?: string;
  reviewWindow?: string;
}) {
  const [reference, setReference] = useState(initialReference);
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<FamilyAccessStatus | null>(null);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function checkStatus() {
    setMessage("");
    setResult(null);
    startTransition(async () => {
      const response = await fetch("/api/registration-requests/status", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reference, email })
      });
      const payload = await response.json().catch(() => null) as {
        message?: string;
        request?: FamilyAccessStatus;
      } | null;
      setMessage(payload?.message ?? "Request status is temporarily unavailable.");
      setResult(payload?.request ?? null);
    });
  }

  return (
    <div className="page access-activation-page">
      <section className="hero">
        <span className="eyebrow">Team access status</span>
        <h1>See where your family request stands.</h1>
        <p className="lead">Use the reference from your receipt and the same email you submitted. We reveal only a masked child match and the requested team.</p>
      </section>
      {message ? <p className={`notice ${result ? "ok" : "warning"}`}>{message}</p> : null}
      <section className="grid two">
        <article className="card stack">
          <h2>Check your request</h2>
          <label>Request reference<input autoComplete="off" value={reference} onChange={(event) => setReference(event.target.value)} /></label>
          <label>Your email<input autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <button disabled={isPending || !reference.trim() || !email.trim()} onClick={checkStatus}>
            {isPending ? "Checking..." : "Check status"}
          </button>
          <a className="button secondary" href="/invite/recover">Invitation help</a>
          <p className="muted">Most reviews are completed {reviewWindow}. Status checks do not approve access or send an invitation.</p>
        </article>
        <article className="card stack" aria-live="polite">
          <h2>{result ? result.statusLabel : "What you will see"}</h2>
          {result ? (
            <>
              <dl className="public-event-facts">
                <div><dt>Child match</dt><dd aria-label="Masked child name">{result.childLabel}</dd></div>
                <div><dt>Team</dt><dd>{result.teamName}</dd></div>
                <div><dt>Submitted</dt><dd>{new Date(result.submittedAt).toLocaleDateString()}</dd></div>
                <div><dt>Reference</dt><dd>{result.reference}</dd></div>
              </dl>
              <p className="notice">{result.nextStep}</p>
              {result.status === "approved" ? <a className="button" href="/auth">Sign in</a> : null}
              <a className="button secondary" href="/invite/recover">Invitation help</a>
            </>
          ) : (
            <p className="muted">Your review state, masked match, expected next step, and support reference will appear here. Other family information stays hidden.</p>
          )}
        </article>
      </section>
    </div>
  );
}

export function InviteRecoveryClient() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function requestReview() {
    setMessage("");
    startTransition(async () => {
      const response = await fetch("/api/invites/recover", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email })
      });
      const payload = await response.json().catch(() => null) as { message?: string } | null;
      setMessage(payload?.message ?? "Invitation recovery is temporarily unavailable.");
    });
  }

  return (
    <div className="page access-activation-page">
      <section className="hero">
        <span className="eyebrow">Invitation help</span>
        <h1>Ask the league to review your invitation.</h1>
        <p className="lead">Use the email connected to the child and team. For privacy, the result is the same whether or not a matching invitation exists.</p>
      </section>
      {message ? <p className="notice" aria-live="polite">{message}</p> : null}
      <section className="grid two">
        <article className="card stack">
          <h2>Request invitation review</h2>
          <label>Email connected to the invitation<input autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <button disabled={isPending || !email.trim()} onClick={requestReview}>
            {isPending ? "Requesting review..." : "Request review"}
          </button>
          <p className="muted">This does not resend a message, approve a guardian link, or open private team details.</p>
        </article>
        <article className="card stack">
          <h2>What happens next</h2>
          <p>The league checks whether the invitation is current, expired, already accepted, or needs correction.</p>
          <p>Only an authorized league administrator can renew or change the approved child and team scope.</p>
          <a className="button secondary" href="/access/status">Check a team-access request</a>
          <a className="button secondary" href="/auth">Sign in</a>
        </article>
      </section>
    </div>
  );
}
