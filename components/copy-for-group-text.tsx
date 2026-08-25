"use client";

import { useState } from "react";

/**
 * Builds the message a coach pastes into their existing group text. This is the
 * zero-provider communication path: the app drafts, a human sends on their own
 * channel. Neutral wording only — it names the event and the ask, never a
 * family's history or a response rate.
 */
export function buildGroupTextMessage(input: {
  eventTitle: string;
  playerDisplayNames: string[];
}) {
  const players = input.playerDisplayNames.filter(Boolean);
  const who = players.length
    ? players.join(" & ")
    : "a few families";
  return [
    `Heads up from Coach — ${input.eventTitle}.`,
    `We still need an answer for ${who}.`,
    "Reply here or answer in LeaguePilot when you have a second. Thanks!"
  ].join(" ");
}

/**
 * Copies prepared text to the clipboard so a coach can paste it into the group
 * text, email, or any channel families already use. No provider is called and
 * nothing is sent by the app; the human presses send on their own device.
 */
export function CopyForGroupText({ text, label = "Copy for group text" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const area = document.createElement("textarea");
        area.value = text;
        area.setAttribute("readonly", "true");
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        document.execCommand("copy");
        area.remove();
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button type="button" className="secondary" onClick={copy} aria-live="polite">
      {copied ? "Copied — paste into your group text" : label}
    </button>
  );
}
