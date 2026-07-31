"use client";

import { useState, useTransition } from "react";
import { markLeaguePilotValueExperienced } from "@/app/providers";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { ParentCoachDashboardData } from "@/lib/supabase/dashboard-data";

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

interface FamilyPreferenceDefaults {
  language?: string;
  criticalChannel?: "push" | "email" | "sms";
  routineChannel?: "push" | "email" | "sms";
  quietHoursStart?: string;
  quietHoursEnd?: string;
  translationEnabled?: boolean;
  sharedDevicePreviews?: boolean;
  timezone?: string;
}

function FamilyPreferencesClient({
  mode,
  defaults = {}
}: {
  mode: "setup" | "settings";
  defaults?: FamilyPreferenceDefaults;
}) {
  const [language, setLanguage] = useState(defaults.language ?? "en");
  const [criticalChannel, setCriticalChannel] = useState<"push" | "email" | "sms">(defaults.criticalChannel ?? "email");
  const [routineChannel, setRoutineChannel] = useState<"push" | "email" | "sms">(defaults.routineChannel ?? "email");
  const [quietHoursStart, setQuietHoursStart] = useState(defaults.quietHoursStart ?? "21:00");
  const [quietHoursEnd, setQuietHoursEnd] = useState(defaults.quietHoursEnd ?? "07:00");
  const [translationEnabled, setTranslationEnabled] = useState(defaults.translationEnabled ?? false);
  const [sharedDevicePreviews, setSharedDevicePreviews] = useState(defaults.sharedDevicePreviews ?? false);
  const [message, setMessage] = useState("");
  const [completed, setCompleted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const timezone = defaults.timezone ?? (Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Chicago");
  const isSettings = mode === "settings";

  function markChanged() {
    setCompleted(false);
    setMessage("");
  }

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
    <div className={`page family-first-sign-in${isSettings ? " family-settings-page" : ""}`}>
      <section className="hero">
        <span className="eyebrow">{isSettings ? "Family settings" : "First sign-in"}</span>
        <h1>{isSettings ? "Choose how family updates reach you." : "Choose how LeaguePilot keeps your family informed."}</h1>
        <p className="lead">{isSettings
          ? "Review language, update channels, quiet hours, and shared-device privacy without changing family access."
          : "Set the language you understand, a critical-update channel, ordinary-update channel, quiet hours, and shared-device privacy before opening Mission Control."}</p>
      </section>
      {message ? <p className={`notice ${completed ? "ok" : "warning"}`} aria-live="polite">{message}</p> : null}
      <section className="grid two">
        <article className="card stack">
          <h2>Language and privacy</h2>
          <label>Preferred language
            <select value={language} onChange={(event) => { setLanguage(event.target.value); markChanged(); }}>
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="pt-BR">Português (Brasil)</option>
            </select>
          </label>
          <label className="check-row"><input checked={translationEnabled} onChange={(event) => { setTranslationEnabled(event.target.checked); markChanged(); }} type="checkbox" /> Show a labeled translation when available</label>
          <p className="muted">Official times, places, cancellations, and instructions remain linked to the original league message. Translations may contain errors.</p>
          <label className="check-row"><input checked={sharedDevicePreviews} onChange={(event) => { setSharedDevicePreviews(event.target.checked); markChanged(); }} type="checkbox" /> Allow team names in shared-device previews</label>
          <p className="muted">Child names and private details remain hidden from lock-screen previews by default.</p>
          {isSettings ? (
            <div className="notice">
              <strong>Photos and media visibility</strong>
              <p>Settings never grant media consent or make an item family-visible. Photos appear only after moderation, the existing consent checks, and an explicit family release.</p>
            </div>
          ) : null}
        </article>
        <article className="card stack">
          <h2>Update channels</h2>
          <label>Critical cancellations and safety updates
            <select value={criticalChannel} onChange={(event) => { setCriticalChannel(event.target.value as typeof criticalChannel); markChanged(); }}>
              <option value="email">Email</option><option value="push">Push</option><option value="sms">SMS</option>
            </select>
          </label>
          <label>Routine schedule and Replay updates
            <select value={routineChannel} onChange={(event) => { setRoutineChannel(event.target.value as typeof routineChannel); markChanged(); }}>
              <option value="email">Email</option><option value="push">Push</option><option value="sms">SMS</option>
            </select>
          </label>
          <div className="grid two">
            <label>Quiet hours start<input type="time" value={quietHoursStart} onChange={(event) => { setQuietHoursStart(event.target.value); markChanged(); }} /></label>
            <label>Quiet hours end<input type="time" value={quietHoursEnd} onChange={(event) => { setQuietHoursEnd(event.target.value); markChanged(); }} /></label>
          </div>
          <p className="notice">Choosing a channel saves your preference. It does not prove the channel is verified or that provider delivery is connected.</p>
          <button disabled={isPending || (!isSettings && completed)} onClick={save}>
            {isPending ? "Saving..." : completed ? "Preferences saved" : isSettings ? "Save changes" : "Save preferences"}
          </button>
          {completed && !isSettings ? <a className="button" href="/parent">Open Family Mission Control</a> : null}
          {isSettings ? (
            <nav className="family-settings-links" aria-label="Related family settings">
              <a href="/parent/family-access">Family access</a>
              <a href="/account">Account and sign out</a>
            </nav>
          ) : null}
        </article>
      </section>
    </div>
  );
}

export function FamilyFirstSignInClient() {
  return <FamilyPreferencesClient mode="setup" />;
}

export function FamilySettingsClient({ dashboardData }: { dashboardData: ParentCoachDashboardData }) {
  const preferences = dashboardData.state.notificationPreferences.filter((preference) => (
    preference.userId === dashboardData.parentUserId
  ));
  const criticalPreference = preferences.find((preference) => (
    preference.enabled &&
    (preference.notificationType === "event_cancelled" || preference.notificationType === "weather_alert")
  ));
  const routinePreference = preferences.find((preference) => (
    preference.enabled &&
    (preference.notificationType === "schedule_changed" || preference.notificationType === "parent_replay_ready")
  ));
  const referencePreference = routinePreference ?? criticalPreference ?? preferences[0];

  return (
    <FamilyPreferencesClient
      mode="settings"
      defaults={{
        criticalChannel: criticalPreference?.channel ?? "email",
        routineChannel: routinePreference?.channel ?? "email",
        quietHoursStart: referencePreference?.quietHoursStart ?? "21:00",
        quietHoursEnd: referencePreference?.quietHoursEnd ?? "07:00",
        timezone: referencePreference?.timezone ?? "America/Chicago"
      }}
    />
  );
}
