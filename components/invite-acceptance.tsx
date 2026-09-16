"use client";

import { useEffect, useState, useTransition } from "react";
import { createSupabaseBrowserClient, getSupabaseEmailRedirectTo } from "@/lib/supabase/browser";

interface InvitePreview {
  organizationName: string;
  teamName: string;
  childLabel: string;
  emailLabel: string;
  expiresAt: string;
}

export function resolvePendingInviteToken(hash: string, storedToken: string) {
  const fragment = new URLSearchParams(hash.replace(/^#/, ""));
  return fragment.get("code") ?? fragment.get("token") ?? storedToken;
}

export function InviteAcceptanceClient() {
  const [token, setToken] = useState("");
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [message, setMessage] = useState("Open the invitation link or paste its one-time code.");
  const [completed, setCompleted] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const stored = window.sessionStorage.getItem("leaguepilot-pending-invite") ?? "";
    const nextToken = resolvePendingInviteToken(window.location.hash, stored);
    if (nextToken) {
      window.setTimeout(() => setToken(nextToken), 0);
      window.sessionStorage.setItem("leaguepilot-pending-invite", nextToken);
      window.history.replaceState(null, "", "/invite/accept");
    }
    void createSupabaseBrowserClient().auth.getSession().then(({ data }) => {
      setSignedIn(Boolean(data.session));
      const displayName = data.session?.user.user_metadata?.display_name;
      if (typeof displayName === "string") setFullName(displayName);
      if (data.session?.user.email) setEmail(data.session.user.email);
    });
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

  function validateParentDetails(requireAccountCredentials: boolean) {
    if (fullName.trim().split(/\s+/).filter(Boolean).length < 2) return "Enter your full name.";
    const normalizedPhone = phone.replace(/[\s().-]/g, "");
    if (!/^\+[1-9]\d{7,14}$/.test(normalizedPhone)) {
      return "Enter a mobile number with country code, such as +13125551234.";
    }
    if (requireAccountCredentials && !email.trim().includes("@")) return "Enter the email address that received this invitation.";
    if (requireAccountCredentials && password.length < 8) return "Create a password with at least 8 characters.";
    return "";
  }

  async function completeAcceptance(accessToken: string) {
    const response = await fetch("/api/invites/accept", {
      method: "POST",
      headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
      body: JSON.stringify({ token, fullName, phone, smsOptIn })
    });
    const result = await response.json().catch(() => null) as { ok?: boolean; message?: string } | null;
    setMessage(result?.message ?? "Invitation could not be accepted.");
    if (!result?.ok) return false;
    setCompleted(true);
    window.sessionStorage.removeItem("leaguepilot-pending-invite");
    return true;
  }

  function acceptInvitation() {
    const validationMessage = validateParentDetails(false);
    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) {
        setSignedIn(false);
        setMessage("Sign in with the invited email before accepting.");
        return;
      }
      await completeAcceptance(accessToken);
    });
  }

  function createAccount() {
    const validationMessage = validateParentDetails(true);
    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }
    if (!preview) {
      setMessage("Check the invitation before creating your account.");
      return;
    }

    startTransition(async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            data: { display_name: fullName.trim(), default_role: "parent" },
            emailRedirectTo: getSupabaseEmailRedirectTo("/auth/callback?returnTo=/invite/accept")
          }
        });
        if (error) {
          setMessage(error.message);
          return;
        }
        if (data.session?.access_token) {
          setSignedIn(true);
          await completeAcceptance(data.session.access_token);
          return;
        }
        setMessage("Check your email to confirm the new account, then return to this invitation. SMS remains off until signed-in acceptance completes.");
      } catch {
        setMessage("Account creation could not be completed. Try again or contact your league administrator.");
      }
    });
  }

  return (
    <div className="page invite-acceptance-page">
      <section className="hero">
        <span className="eyebrow">Team invitation</span>
        <h1>{preview ? `Join ${preview.teamName}` : "Confirm the child and team the league approved."}</h1>
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
              {completed ? <a className="button secondary" href="/parent/setup">Set language and notifications</a> : null}
            </>
          ) : (
            <>
              <p className="muted">League, team, masked child match, invited email, expiry, and current invitation state appear after the code is verified.</p>
              <a className="button secondary" href="/auth?returnTo=/invite/accept">Sign in with invited email</a>
            </>
          )}
        </article>
      </section>

      <section className="invite-account-section" aria-labelledby="invite-account-heading">
        <form className="card stack invite-account-card" onSubmit={(event) => {
          event.preventDefault();
          if (signedIn) acceptInvitation();
          else createAccount();
        }}>
          <div className="invite-account-heading">
            <div>
              <span className="eyebrow">Your details</span>
              <h2 id="invite-account-heading">Set up your parent account</h2>
            </div>
            <span className="muted">* Required</span>
          </div>
          <p className="muted">
            {preview
              ? `You’re invited as a parent or guardian for ${preview.teamName}. Complete your details below.`
              : "Check your one-time invitation first. Account details stay disabled until its approved scope is visible."}
          </p>
          <label>
            Full name *
            <input autoComplete="name" disabled={!preview || completed} required value={fullName} onChange={(event) => setFullName(event.target.value)} />
          </label>
          {!signedIn ? (
            <>
              <label>
                Invited email *
                <input autoComplete="email" disabled={!preview || completed} required type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
              </label>
              <label>
                Password *
                <input autoComplete="new-password" disabled={!preview || completed} minLength={8} required type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
              </label>
            </>
          ) : null}
          <label>
            Mobile phone *
            <input autoComplete="tel" disabled={!preview || completed} inputMode="tel" placeholder="+13125551234" required type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} />
          </label>
          <label className="check-row invite-sms-consent">
            <input disabled={!preview || completed} type="checkbox" checked={smsOptIn} onChange={(event) => setSmsOptIn(event.target.checked)} />
            <span>
              By checking this box and providing my mobile number, I agree to receive recurring SMS messages from LeaguePilot about team access and essential team updates, including schedule changes, cancellations, and weather alerts. Message frequency may vary. Message and data rates may apply. Reply STOP to opt out. Reply HELP for help. Consent is not a condition of creating an account, accepting this invitation, or using LeaguePilot. See our <a href="/terms">Terms of Service</a> and <a href="/privacy">Privacy Policy</a>.
            </span>
          </label>
          <p className="muted">SMS consent is optional and unchecked by default. Your phone is saved for your adult parent profile. No text is sent when you create or accept the account.</p>
          <button type="submit" disabled={!preview || isPending || completed}>
            {completed ? "Invitation accepted" : isPending ? (signedIn ? "Accepting invitation..." : "Creating account...") : signedIn ? "Accept invitation" : "Create account"}
          </button>
          {!signedIn ? (
            <p className="invite-existing-account">Already have an account? <a href="/auth?returnTo=/invite/accept">Sign in with the invited email</a>.</p>
          ) : null}
        </form>
      </section>
    </div>
  );
}
