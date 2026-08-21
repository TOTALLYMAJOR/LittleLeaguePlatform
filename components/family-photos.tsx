"use client";

import { ExternalLink, Flag, Images, ShieldCheck } from "lucide-react";
import { useState, useTransition } from "react";
import type { MediaItem } from "@/lib/domain";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export interface FamilyPhotoItem extends MediaItem {
  teamName: string;
}

export interface FamilyPhotoReportResult {
  ok?: boolean;
  message?: string;
}

export interface FamilyPhotoFeedback {
  tone: "success" | "error";
  message: string;
}

interface FamilyPhotoConsentResult {
  ok?: boolean;
  granted?: boolean;
  message?: string;
}

export interface FamilyPhotoChild {
  playerId: string;
  label: string;
  granted: boolean;
}

export function applyFamilyPhotoReportResult(
  photos: FamilyPhotoItem[],
  mediaItemId: string,
  result: FamilyPhotoReportResult | null
): { photos: FamilyPhotoItem[]; feedback: FamilyPhotoFeedback } {
  if (result?.ok) {
    return {
      photos: photos.filter((item) => item.id !== mediaItemId),
      feedback: {
        tone: "success",
        message: result.message ?? "Report saved for staff review."
      }
    };
  }
  return {
    photos,
    feedback: {
      tone: "error",
      message: result?.message ?? "The report could not be saved. Try again."
    }
  };
}

async function reportWithSession(mediaItemId: string) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  try {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) headers.authorization = `Bearer ${data.session.access_token}`;
  } catch {
    // The authenticated route fails closed when a session cannot be confirmed.
  }
  return fetch("/api/media/report", {
    method: "POST",
    headers,
    body: JSON.stringify({
      mediaItemId,
      reason: "Parent requested a staff review from Family Photos."
    })
  });
}

async function saveConsentWithSession(playerId: string, granted: boolean) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  try {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) headers.authorization = `Bearer ${data.session.access_token}`;
  } catch {
    // The authenticated route fails closed when a session cannot be confirmed.
  }
  return fetch("/api/parent/media-consents", {
    method: "POST",
    headers,
    body: JSON.stringify({ playerId, granted })
  });
}

export function FamilyPhotos({
  photos,
  linkedChildren,
  consentLoadOk,
  isCurrent
}: {
  photos: FamilyPhotoItem[];
  linkedChildren: FamilyPhotoChild[];
  consentLoadOk: boolean;
  isCurrent: boolean;
}) {
  const [state, setState] = useState<{
    visiblePhotos: FamilyPhotoItem[];
    children: FamilyPhotoChild[];
    feedback: FamilyPhotoFeedback | null;
  }>({ visiblePhotos: photos, children: linkedChildren, feedback: null });
  const [isPending, startTransition] = useTransition();

  function report(photo: FamilyPhotoItem) {
    setState((current) => ({ ...current, feedback: null }));
    startTransition(async () => {
      let result: FamilyPhotoReportResult | null = null;
      try {
        const response = await reportWithSession(photo.id);
        result = await response.json().catch(() => null) as FamilyPhotoReportResult | null;
      } catch {
        // Keep the item visible and return an explicit retryable error state.
      }
      setState((current) => {
        const next = applyFamilyPhotoReportResult(current.visiblePhotos, photo.id, result);
        return { ...current, visiblePhotos: next.photos, feedback: next.feedback };
      });
    });
  }

  function changeConsent(child: FamilyPhotoChild) {
    const granted = !child.granted;
    setState((current) => ({ ...current, feedback: null }));
    startTransition(async () => {
      let result: FamilyPhotoConsentResult | null = null;
      try {
        const response = await saveConsentWithSession(child.playerId, granted);
        result = await response.json().catch(() => null) as FamilyPhotoConsentResult | null;
      } catch {
        // Keep the prior decision visible and return a retryable error.
      }
      setState((current) => ({
        ...current,
        children: result?.ok
          ? current.children.map((item) => item.playerId === child.playerId
            ? { ...item, granted: result?.granted ?? granted }
            : item)
          : current.children,
        feedback: result?.ok
          ? { tone: "success", message: result.message ?? "Media consent updated." }
          : { tone: "error", message: result?.message ?? "Media consent could not be updated. Try again." }
      }));
    });
  }

  const { visiblePhotos, children: currentChildren, feedback } = state;

  return (
    <div className="page family-photos-page">
      <section className="hero family-photos-hero">
        <span className="eyebrow">Family Photos</span>
        <h1>Released team memories, without the portal clutter.</h1>
        <p className="lead">Only approved items with explicit family-release evidence appear for linked teams.</p>
      </section>

      <section className="family-photo-trust" aria-label="Photo privacy and consent status">
        <ShieldCheck aria-hidden="true" size={22} strokeWidth={2.2} />
        <div>
          <strong>{isCurrent ? "Current family-media read" : "Media records need verification"}</strong>
          <p>Visible items passed moderation and family-release checks. Each verified guardian controls their own consent for each linked child.</p>
          <small>
            Consent does not publish media by itself. Every current guardian, safety review, and explicit family release are still required.
          </small>
        </div>
      </section>

      <section className="card stack" aria-label="Per-player media consent controls">
        <h2>Media consent</h2>
        {!consentLoadOk ? <p className="notice danger">Consent status is unavailable. No decision can be changed right now.</p> : null}
        {currentChildren.map((child) => (
          <div className="family-photo-consent-row" key={child.playerId}>
            <span><strong>{child.label}</strong><br /><small>Your team-family consent is {child.granted ? "granted" : "not granted"}.</small></span>
            <button
              type="button"
              className={child.granted ? "secondary" : undefined}
              disabled={isPending || !consentLoadOk}
              onClick={() => changeConsent(child)}
            >
              {child.granted ? "Revoke consent" : "Grant consent"}
            </button>
          </div>
        ))}
        {!currentChildren.length ? <p className="muted">No actively linked children are available for consent.</p> : null}
      </section>

      {feedback ? (
        <p
          className={`notice ${feedback.tone === "success" ? "ok" : "danger"}`}
          role={feedback.tone === "success" ? "status" : "alert"}
          aria-live={feedback.tone === "success" ? "polite" : undefined}
        >
          {feedback.message}
        </p>
      ) : null}

      {visiblePhotos.length ? (
        <section className="family-photo-grid" aria-label="Released family photos">
          {visiblePhotos.map((photo) => (
            <article className="family-photo-card" data-media-id={photo.id} key={photo.id}>
              <div className="family-photo-card-art" aria-hidden="true">
                <Images size={30} strokeWidth={1.8} />
              </div>
              <div>
                <span>{photo.teamName}</span>
                <h2>{photo.title}</h2>
                <p>{new Date(photo.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric"
                })}</p>
              </div>
              <div className="family-photo-actions">
                <a
                  href={photo.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Open released photo: ${photo.title}`}
                >
                  Open released item <ExternalLink aria-hidden="true" size={15} />
                </a>
                <button
                  type="button"
                  className="secondary"
                  disabled={isPending}
                  onClick={() => report(photo)}
                  aria-label={`Report ${photo.title} for staff review`}
                >
                  <Flag aria-hidden="true" size={15} /> Report for review
                </button>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="family-photo-empty">
          <Images aria-hidden="true" size={32} strokeWidth={1.8} />
          <h2>No released photos yet</h2>
          <p>A coach or admin can add media, but it stays hidden here until moderation, safety checks, required consent evidence, and family release are complete.</p>
          <a className="button secondary" href="/parent/messages">Ask the team a question</a>
        </section>
      )}
    </div>
  );
}
