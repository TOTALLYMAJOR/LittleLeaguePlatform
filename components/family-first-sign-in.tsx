"use client";

import { useState, useTransition } from "react";
import { markLeaguePilotValueExperienced } from "@/app/providers";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

async function saveWithSession(payload: unknown) {
  const supabase = createSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return new Response(JSON.stringify({ ok: false, message: "Sign in again before saving preferences." }), { status: 401 });
  return fetch("/api/parent/setup", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
}

export function FamilyFirstSignInClient() {
  const [language, setLanguage] = useState("en");
  const [criticalChannel, setCriticalChannel] = useState<"push" | "email" | "sms">("email");
  const [routineChannel, setRoutineChannel] = useState<"push" | "email" | "sms">("email");
  const [quietHoursStart, setQuietHoursStart] = useState("21:00");
  const [quietHoursEnd, setQuietHoursEnd] = useState("07:00");
  const [translationEnabled, setTranslationEnabled] = useState(false);
  const [sharedDevicePreviews, setSharedDevicePreviews] = useState(false);
  const [message, setMessage] = useState("");
  const [completed, setCompleted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Chicago";

  function save() {
    setMessage("");
    startTransition(async () => {
      const response = await saveWithSession({
        language,
        criticalChannel,
        routineChannel,
        quietHoursStart,
        quietHoursEnd,
        timezone,
        translationEnabled,
        sharedDevicePreviews
      });
      const result = await response.json().catch(() => null) as { ok?: boolean; message?: string } | null;
      setMessage(result?.message ?? "Preferences could not be saved.");
      if (result?.ok) {
        setCompleted(true);
        markLeaguePilotValueExperienced("family_first_sign_in_completed");
      }
    });
  }

  return (
    <div className="page family-first-sign-in">
      <section className="hero">
        <span className="eyebrow">First sign-in</span>
        <h1>Choose how LeaguePilot keeps your family informed.</h1>
        <p className="lead">Set the language you understand, a critical-update channel, ordinary-update channel, quiet hours, and shared-device privacy before opening Mission Control.</p>
      </section>
      {message ? <p className={`notice ${completed ? "ok" : "warning"}`} aria-live="polite">{message}</p> : null}
      <section className="grid two">
        <article className="card stack">
          <h2>Language and privacy</h2>
          <label>Preferred language
            <select value={language} onChange={(event) => setLanguage(event.target.value)}>
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="pt-BR">Português (Brasil)</option>
            </select>
          </label>
          <label className="check-row"><input checked={translationEnabled} onChange={(event) => setTranslationEnabled(event.target.checked)} type="checkbox" /> Show a labeled translation when available</label>
          <p className="muted">Official times, places, cancellations, and instructions remain linked to the original league message. Translations may contain errors.</p>
          <label className="check-row"><input checked={sharedDevicePreviews} onChange={(event) => setSharedDevicePreviews(event.target.checked)} type="checkbox" /> Allow team names in shared-device previews</label>
          <p className="muted">Child names and private details remain hidden from lock-screen previews by default.</p>
        </article>
        <article className="card stack">
          <h2>Update channels</h2>
          <label>Critical cancellations and safety updates
            <select value={criticalChannel} onChange={(event) => setCriticalChannel(event.target.value as typeof criticalChannel)}>
              <option value="email">Email</option><option value="push">Push</option><option value="sms">SMS</option>
            </select>
          </label>
          <label>Routine schedule and Replay updates
            <select value={routineChannel} onChange={(event) => setRoutineChannel(event.target.value as typeof routineChannel)}>
              <option value="email">Email</option><option value="push">Push</option><option value="sms">SMS</option>
            </select>
          </label>
          <div className="grid two">
            <label>Quiet hours start<input type="time" value={quietHoursStart} onChange={(event) => setQuietHoursStart(event.target.value)} /></label>
            <label>Quiet hours end<input type="time" value={quietHoursEnd} onChange={(event) => setQuietHoursEnd(event.target.value)} /></label>
          </div>
          <p className="notice">Choosing a channel saves your preference. It does not prove the channel is verified or that provider delivery is connected.</p>
          <button disabled={isPending || completed} onClick={save}>{isPending ? "Saving..." : completed ? "Preferences saved" : "Save preferences"}</button>
          {completed ? <a className="button" href="/parent">Open Family Mission Control</a> : null}
        </article>
      </section>
    </div>
  );
}
