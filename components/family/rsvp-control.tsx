"use client";

import { Check, CircleHelp, CircleX } from "lucide-react";
import { useState } from "react";
import { markLeaguePilotValueExperienced } from "@/app/providers";
import type { RsvpResponse } from "@/lib/domain";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { StatusChip } from "./status-chip";

type RsvpAnswer = Extract<RsvpResponse, "going" | "maybe" | "not_going">;

const rsvpOptions: Array<{
  response: RsvpAnswer;
  label: string;
  Icon: typeof Check;
}> = [
  { response: "going", label: "Going", Icon: Check },
  { response: "maybe", label: "Maybe", Icon: CircleHelp },
  { response: "not_going", label: "Can’t go", Icon: CircleX }
];

export function responseLabel(response?: RsvpResponse) {
  if (response === "going") return "Going";
  if (response === "maybe") return "Maybe";
  if (response === "not_going") return "Can’t attend";
  if (response === "cancelled") return "Cancelled";
  return "Needs reply";
}

async function authenticatedPost(url: string, payload: unknown, extraHeaders?: Record<string, string>) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...extraHeaders
  };
  try {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) headers.authorization = `Bearer ${data.session.access_token}`;
  } catch {
    // Private routes fail closed when the browser session cannot be confirmed.
  }
  return fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });
}

function actionId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `rsvp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function RsvpControl({
  eventId,
  playerId,
  childLabel,
  eventTitle,
  scheduleVersion,
  currentResponse,
  currentLockVersion,
  disabled,
  onSaved
}: {
  eventId: string;
  playerId: string;
  childLabel: string;
  eventTitle: string;
  scheduleVersion: number;
  currentResponse?: RsvpResponse;
  currentLockVersion: number;
  disabled: boolean;
  onSaved?: (result: { response: RsvpAnswer; lockVersion: number; scheduleVersion: number; message: string }) => void;
}) {
  const [pendingResponse, setPendingResponse] = useState<RsvpAnswer | "">("");
  const [message, setMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function save(response: RsvpAnswer) {
    if (disabled || pendingResponse) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setSuccessMessage("");
      setMessage("Connect before changing this RSVP. No response was saved.");
      return;
    }
    setPendingResponse(response);
    setMessage("");
    setSuccessMessage("");

    try {
      const apiResponse = await authenticatedPost("/api/rsvps", {
        eventId,
        playerId,
        response,
        expectedLockVersion: currentLockVersion,
        expectedScheduleVersion: scheduleVersion
      }, { "Idempotency-Key": actionId() });
      const result = await apiResponse.json().catch(() => null) as {
        ok?: boolean;
        code?: string;
        message?: string;
        currentResponse?: RsvpResponse;
        lockVersion?: number;
        lock_version?: number;
      } | null;

      if (!result?.ok) {
        if (apiResponse.status === 409 && result?.code === "schedule_changed") {
          setMessage("The schedule changed since this page loaded. Review the new event details, then retry.");
        } else if (apiResponse.status === 409 && result?.code === "guardian_conflict") {
          setMessage(`Another guardian already answered${result.currentResponse ? ` ${responseLabel(result.currentResponse)}` : ""}. Review the stored RSVP, then retry if it still needs to change.`);
        } else {
          setMessage(result?.message ?? "RSVP could not be saved. Retry when records are reachable.");
        }
        return;
      }

      const lockVersion = result.lockVersion ?? result.lock_version ?? currentLockVersion + 1;
      const storedFact = `RSVP saved for ${childLabel} — ${responseLabel(response)}, schedule v${scheduleVersion}.`;
      markLeaguePilotValueExperienced("parent_rsvp_confirmed");
      setSuccessMessage(storedFact);
      onSaved?.({ response, lockVersion, scheduleVersion, message: storedFact });
    } catch {
      setMessage("Team records could not be reached. No RSVP change was confirmed.");
    } finally {
      setPendingResponse("");
    }
  }

  return (
    <div className="family-rsvp-control" aria-label={`RSVP for ${childLabel} at ${eventTitle}`}>
      <div className="family-rsvp-current">
        <span>Persisted RSVP</span>
        <StatusChip tone={currentResponse && currentResponse !== "cancelled" ? "confirmed" : "action"}>
          {responseLabel(currentResponse)}
        </StatusChip>
      </div>
      <div className="family-rsvp-options">
        {rsvpOptions.map(({ response, label, Icon }) => (
          <button
            type="button"
            key={response}
            className={currentResponse === response ? "is-selected" : ""}
            data-response={response}
            aria-pressed={currentResponse === response}
            disabled={disabled || Boolean(pendingResponse)}
            onClick={() => save(response)}
          >
            <Icon aria-hidden="true" size={16} strokeWidth={2.2} />
            <span>{pendingResponse === response ? "Saving" : label}</span>
          </button>
        ))}
      </div>
      {successMessage ? <p className="family-rsvp-message success" role="status">{successMessage}</p> : null}
      {message ? <p className="family-rsvp-message" role="alert">{message}</p> : null}
    </div>
  );
}
