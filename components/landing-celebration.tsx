"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const CURTAIN_MS = 2850;
const FALLBACK_MS = CURTAIN_MS + 650;

/**
 * A short opening curtain for the signed-out landing page.
 *
 * The overlay is present in the server HTML, so it owns the first visual paint.
 * Client code only releases the already-rendered page after the CSS sequence.
 */
export function LandingCelebration() {
  const [visible, setVisible] = useState(true);
  const dismissed = useRef(false);

  const dismiss = useCallback(() => {
    if (dismissed.current) return;
    dismissed.current = true;
    setVisible(false);
  }, []);

  useEffect(() => {
    if (!visible) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      dismiss();
      return;
    }

    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    const coveredSurfaces = Array.from(
      document.querySelectorAll<HTMLElement>(".public-header-gateway, .landing-gateway-hero, .public-legal-footer")
    );

    root.dataset.celebrationIntro = "playing";
    root.style.overflow = "hidden";
    coveredSurfaces.forEach((surface) => surface.setAttribute("inert", ""));

    const fallbackTimer = window.setTimeout(dismiss, FALLBACK_MS);

    return () => {
      window.clearTimeout(fallbackTimer);
      delete root.dataset.celebrationIntro;
      root.style.overflow = previousOverflow;
      coveredSurfaces.forEach((surface) => surface.removeAttribute("inert"));
    };
  }, [dismiss, visible]);

  if (!visible) return null;

  return (
    <div
      className="landing-celebration"
      data-landing-celebration
      aria-hidden="true"
      onAnimationEnd={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.animationName === "landing-celebration-curtain") dismiss();
      }}
    >
      <svg
        className="landing-celebration-scene"
        viewBox="0 0 640 300"
        preserveAspectRatio="xMidYMid meet"
        focusable="false"
      >
        <path
          className="landing-celebration-flight-line"
          d="M 151 146 C 255 44 407 35 525 91"
          pathLength="1"
        />

        <g className="landing-celebration-batter">
          <circle cx="104" cy="146" r="13" />
          <path d="M 103 160 L 96 205 L 76 238 M 96 205 L 126 236" />
          <path d="M 99 172 L 128 187 L 151 163" />
          <path className="landing-celebration-bat" d="M 145 170 L 186 116" />
        </g>

        <circle className="landing-celebration-ball" cx="153" cy="146" r="8" />

        <g className="landing-celebration-crowd">
          <g className="landing-celebration-person is-left" transform="translate(410 230)">
            <circle cx="0" cy="0" r="10" />
            <path className="landing-celebration-body" d="M -14 15 Q 0 7 14 15 L 19 64 L -19 64 Z" />
            <path className="landing-celebration-arms" d="M -11 25 L -34 4 M 11 25 L 29 -5" />
          </g>
          <g className="landing-celebration-person is-mid-left" transform="translate(458 211)">
            <circle cx="0" cy="0" r="12" />
            <path className="landing-celebration-body" d="M -17 17 Q 0 7 17 17 L 23 84 L -23 84 Z" />
            <path className="landing-celebration-arms" d="M -13 29 L -37 -1 M 13 29 L 38 -9" />
          </g>
          <g className="landing-celebration-person is-center" transform="translate(509 219)">
            <circle cx="0" cy="0" r="11" />
            <path className="landing-celebration-body" d="M -16 16 Q 0 7 16 16 L 22 76 L -22 76 Z" />
            <path className="landing-celebration-arms" d="M -12 28 L -36 -9 M 12 28 L 35 -10" />
          </g>
          <g className="landing-celebration-person is-right" transform="translate(556 233)">
            <circle cx="0" cy="0" r="10" />
            <path className="landing-celebration-body" d="M -14 15 Q 0 7 14 15 L 19 61 L -19 61 Z" />
            <path className="landing-celebration-arms" d="M -11 25 L -29 -4 M 11 25 L 33 5" />
          </g>
          <path className="landing-celebration-cheer-line" d="M 425 181 L 416 162 M 459 163 L 457 140 M 506 170 L 514 146 M 548 186 L 563 168" />
        </g>
      </svg>
    </div>
  );
}
