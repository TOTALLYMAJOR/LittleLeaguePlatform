"use client";

import { useEffect, useState, useTransition } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

interface InvitePreview {
  organizationName: string;
  teamName: string;
  childLabel: string;
  emailLabel: string;
  expiresAt: string;
}

export function InviteAcceptanceClient() {
  const [token, setToken] = useState("");
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [message, setMessage] = useState("Open the invitation link or paste its one-time code.");
  const [completed, setCompleted] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const stored = window.sessionStorage.getItem("leaguepilot-pending-invite") ?? "";
    const nextToken = fragment.get("code") ?? stored;
    if (nextToken) {
      window.setTimeout(() => setToken(nextToken), 0);
      window.sessionStorage.setItem("leaguepilot-pending-invite", nextToken);
      window.history.replaceState(null, "", "/invite/accept");
    }
    void createSupabaseBrowserClient().auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
  }, []);

  function checkInvitation() {
    setPreview(null);
    startTransition(async () => {
      const response = await fetch("/api/invites/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token })
      });
      const result = await response.json().catch(() => null) as { message?: string; invitation?: InvitePreview } | null;
      setMessage(result?.message ?? "Invitation status is temporarily unavailable.");
      setPreview(result?.invitation ?? null);
      if (result?.invitation) window.sessionStorage.setItem("leaguepilot-pending-invite", token);
    });
  }

  function acceptInvitation() {
    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) {
        setSignedIn(false);
        setMessage("Sign in with the invited email before accepting.");
        return;
      }
      const response = await fetch("/api/invites/accept", {
        method: "POST",
        headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
        body: JSON.stringify({ token })
      });
      const result = await response.json().catch(() => null) as { ok?: boolean; message?: string } | null;
      setMessage(result?.message ?? "Invitation could not be accepted.");
      if (result?.ok) {
        setCompleted(true);
        window.sessionStorage.removeItem("leaguepilot-pending-invite");
      }
    });
  }

  return (
    <div className="page invite-acceptance-page">
      <section className="hero">
        <span className="eyebrow">Team invitation</span>
        <h1>Confirm the child and team the league approved.</h1>
        <p className="lead">The invitation proves its approved scope. Signing in proves identity. Neither step can add a different child, team, or guardian permission.</p>
      </section>
      <p className={`notice ${completed ? "ok" : ""}`} aria-live="polite">{message}</p>
      <section className="grid two">
        <article className="card stack">
          <h2>Check invitation</h2>
          <label>One-time invitation code<input autoComplete="one-time-code" value={token} onChange={(event) => setToken(event.target.value)} /></label>
          <button disabled={isPending || token.trim().length < 24} onClick={checkInvitation}>{isPending ? "Checking..." : "Check invitation"}</button>
          <p className="muted">Codes are secret, short-lived, single-use, and never included in analytics.</p>
        </article>
        <article className="card stack">
          <h2>{preview ? "Approved invitation scope" : "What you will confirm"}</h2>
          {preview ? (
            <>
              <dl className="public-event-facts">
                <div><dt>League</dt><dd>{preview.organizationName}</dd></div>
                <div><dt>Team</dt><dd>{preview.teamName}</dd></div>
                <div><dt>Child match</dt><dd aria-label="Masked child name">{preview.childLabel}</dd></div>
                <div><dt>Invited email</dt><dd>{preview.emailLabel}</dd></div>
              </dl>
              <p className="muted">Expires {new Date(preview.expiresAt).toLocaleString()}.</p>
              {signedIn ? (
                <button disabled={isPending || completed} onClick={acceptInvitation}>{completed ? "Invitation accepted" : "Accept invitation"}</button>
              ) : (
                <a className="button" href="/auth?returnTo=/invite/accept">Sign in with invited email</a>
              )}
              {completed ? <a className="button secondary" href="/parent/setup">Set language and notifications</a> : null}
            </>
          ) : <p className="muted">League, team, masked child match, invited email, expiry, and current invitation state appear after the code is verified.</p>}
        </article>
      </section>
    </div>
  );
}
