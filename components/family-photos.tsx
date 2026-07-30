"use client";

import { ExternalLink, Flag, Images, ShieldCheck } from "lucide-react";
import { useState, useTransition } from "react";
import type { MediaItem } from "@/lib/domain";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export interface FamilyPhotoItem extends MediaItem {
  teamName: string;
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

export function FamilyPhotos({
  photos,
  childLabels,
  isCurrent
}: {
  photos: FamilyPhotoItem[];
  childLabels: string[];
  isCurrent: boolean;
}) {
  const [visiblePhotos, setVisiblePhotos] = useState(photos);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function report(photo: FamilyPhotoItem) {
    setMessage("");
    startTransition(async () => {
      const response = await reportWithSession(photo.id);
      const result = await response.json().catch(() => null) as { ok?: boolean; message?: string } | null;
      setMessage(result?.message ?? "The report could not be saved.");
      if (result?.ok) {
        setVisiblePhotos((current) => current.filter((item) => item.id !== photo.id));
      }
    });
  }

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
          <p>Visible items passed moderation and family-release checks. Settings do not grant consent, and this page has no consent writer.</p>
          <small>
            Linked children: {childLabels.length ? childLabels.join(", ") : "No linked child names available"}.
            Consent changes require league staff review.
          </small>
        </div>
      </section>

      {message ? <p className="notice" role="status">{message}</p> : null}

      {visiblePhotos.length ? (
        <section className="family-photo-grid" aria-label="Released family photos">
          {visiblePhotos.map((photo) => (
            <article className="family-photo-card" key={photo.id}>
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
                <a href={photo.url} target="_blank" rel="noreferrer">
                  Open released item <ExternalLink aria-hidden="true" size={15} />
                </a>
                <button type="button" className="secondary" disabled={isPending} onClick={() => report(photo)}>
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
