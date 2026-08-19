"use client";

import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "leaguepilot-intro-seen:v1";
const INTRO_MS = 20000;
const LEAVE_MS = 600;

const MASCOT_BADGES = [
  { color: "#c62f2f", glyph: "M60 34 66 52h19l-15 11 6 19-16-12-16 12 6-19-15-11h19z" },
  { color: "#1f5fbf", glyph: "M66 30 44 66h13l-7 24 26-38H62z" },
  { color: "#1f7a4d", glyph: "M60 40c-8 0-13 6-13 12 0 9 13 22 13 22s13-13 13-22c0-6-5-12-13-12zM43 36a6 6 0 1 1 0 12 6 6 0 0 1 0-12zm34 0a6 6 0 1 1 0 12 6 6 0 0 1 0-12z" },
  { color: "#6b3fa0", glyph: "M34 66c10-22 42-30 52-28-4 8-10 10-16 12 6 1 10 1 14 0-6 12-24 20-38 18l-12 8z" },
  { color: "#d97a1f", glyph: "M60 30c4 12 18 18 18 32a18 18 0 0 1-36 0c0-14 14-20 18-32z" },
  { color: "#0e7c86", glyph: "M38 74c8-24 30-38 46-40-4 8-6 16-14 22l10 2c-10 10-24 16-34 16z" },
  { color: "#b3323f", glyph: "M42 76V50l18-16 18 16v26H66V60H54v16z" },
  { color: "#c9962a", glyph: "M60 32a26 26 0 1 0 18 44l-8-6a16 16 0 1 1 0-24l8-6a26 26 0 0 0-18-8z" }
];

const BOARD_ROWS = [
  { team: "Rockets", color: "#c62f2f", line: "Sat 9:00 · Field 2 · Coach Maya R." },
  { team: "Comets", color: "#1f5fbf", line: "Sat 10:30 · Court 1 · Coach Dre W." },
  { team: "Pioneers", color: "#1f7a4d", line: "Sat 12:00 · Diamond 3 · Coach Ana S." },
  { team: "Stars", color: "#6b3fa0", line: "Sat 1:30 · Field 5 · Coach Sam K." },
  { team: "Wolves", color: "#d97a1f", line: "Sat 3:00 · Track · Coach Lee P." }
];

// Eight youth sports, one badge each — small, soft, cheery. Positioned outside
// li-world so they read in full color from frame one, against the still-gray field.
const JOY_SPORTS = [
  { key: "soccer", color: "#c62f2f", cx: 90, cy: 630 },
  { key: "basketball", color: "#1f5fbf", cx: 235, cy: 690 },
  { key: "baseball", color: "#1f7a4d", cx: 380, cy: 620 },
  { key: "football", color: "#6b3fa0", cx: 525, cy: 685 },
  { key: "track", color: "#d97a1f", cx: 670, cy: 625 },
  { key: "swimming", color: "#0e7c86", cx: 815, cy: 690 },
  { key: "volleyball", color: "#b3323f", cx: 960, cy: 620 },
  { key: "tennis", color: "#c9962a", cx: 1105, cy: 685 }
];

const TICKER_ITEMS = [
  "GAME POSTPONED - RAIN",
  "ROCKETS VS COMETS MOVED TO NEXT SATURDAY",
  "FAMILIES NOTIFIED VIA LEAGUEPILOT",
  "COACH APPROVED THE CALL"
];

function JoySportGlyph({ sport }: { sport: (typeof JOY_SPORTS)[number] }) {
  switch (sport.key) {
    case "soccer":
      return (
        <>
          <path d="M0 -14 12 -4 7 12 -7 12 -12 -4Z" fill="#fff" opacity="0.9" />
          <path d="M0 -14 0 -20M12 -4 20 -8M7 12 11 20M-7 12 -11 20M-12 -4 -20 -8" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
        </>
      );
    case "basketball":
      return (
        <>
          <circle r="16" fill="none" stroke="#fff" strokeWidth="2.5" opacity="0.9" />
          <path d="M-16 0H16M0 -16V16M-11 -11Q0 0 -11 11M11 -11Q0 0 11 11" stroke="#fff" strokeWidth="2.2" fill="none" opacity="0.9" strokeLinecap="round" />
        </>
      );
    case "baseball":
      return (
        <>
          <path d="M-18 18 18 -18" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0.85" />
          <circle r="13" fill="#fff" opacity="0.92" />
          <path d="M-9 -6Q0 -12 9 -6M-9 6Q0 12 9 6" stroke="#b3323f" strokeWidth="1.6" fill="none" opacity="0.8" />
        </>
      );
    case "football":
      return (
        <>
          <ellipse rx="20" ry="12" fill="#fff" opacity="0.92" />
          <path d="M-9 0H9M-4 -4V4M0 -5V5M4 -4V4" stroke="#6b3fa0" strokeWidth="1.8" strokeLinecap="round" />
        </>
      );
    case "track":
      return (
        <>
          <path d="M-8 6 -14 22 -4 16Z M8 6 14 22 4 16Z" fill="#fff" opacity="0.75" />
          <circle cy="-4" r="13" fill="#fff" opacity="0.92" />
          <circle cy="-4" r="7" fill="none" stroke="#d97a1f" strokeWidth="1.6" opacity="0.7" />
        </>
      );
    case "swimming":
      return (
        <>
          <path d="M-20 -6Q-14 -12 -8 -6T4 -6T16 -6" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.9" />
          <path d="M-20 6Q-14 0 -8 6T4 6T16 6" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.75" />
          <path d="M-20 18Q-14 12 -8 18T4 18T16 18" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.55" />
        </>
      );
    case "volleyball":
      return (
        <>
          <circle r="15" fill="none" stroke="#fff" strokeWidth="2.5" opacity="0.9" />
          <path d="M-15 0Q0 -14 15 0M-15 0Q0 14 15 0M-11 -10Q4 0 -6 12" stroke="#fff" strokeWidth="2" fill="none" opacity="0.85" strokeLinecap="round" />
          <path d="M-21 20H21" stroke="#fff" strokeWidth="2" opacity="0.5" strokeDasharray="2 3" />
        </>
      );
    case "tennis":
      return (
        <>
          <rect x="-2.5" y="9" width="5" height="16" rx="2.5" fill="#fff" opacity="0.9" />
          <ellipse cy="-6" rx="12" ry="15" fill="none" stroke="#fff" strokeWidth="3" opacity="0.9" />
          <path d="M-8 -18Q0 -6 8 -18M-8 6Q0 -6 8 6M-11 -6H11" stroke="#fff" strokeWidth="1.4" fill="none" opacity="0.6" />
          <circle cx="14" cy="16" r="6" fill="#fff" opacity="0.85" />
        </>
      );
    default:
      return null;
  }
}

/**
 * Plays once per browser session on the public landing, on top of the app.
 * Pure CSS timeline; JS only decides visibility (session replay guard,
 * prefers-reduced-motion opt-out, Skip button, Escape).
 */
export function LandingIntroOverlay() {
  const [phase, setPhase] = useState<"hidden" | "playing" | "leaving">("hidden");
  const dismissed = useRef(false);
  const leaveTimer = useRef<number | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  function clearLeaveTimer() {
    if (leaveTimer.current !== null) {
      window.clearTimeout(leaveTimer.current);
      leaveTimer.current = null;
    }
  }

  function dismiss() {
    if (dismissed.current) return;
    dismissed.current = true;
    try {
      window.sessionStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // Storage failure only means the intro may replay next visit.
    }
    setPhase("leaving");
    clearLeaveTimer();
    leaveTimer.current = window.setTimeout(() => setPhase("hidden"), LEAVE_MS);
  }

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        if (window.sessionStorage.getItem(STORAGE_KEY) === "true") return;
      } catch {
        return;
      }
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      setPhase("playing");
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    function onReplay() {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      clearLeaveTimer();
      dismissed.current = false;
      try {
        window.sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore: replay still works for this page view.
      }
      setPhase("hidden");
      window.requestAnimationFrame(() => setPhase("playing"));
    }
    window.addEventListener("leaguepilot:intro-replay", onReplay);
    return () => window.removeEventListener("leaguepilot:intro-replay", onReplay);
  }, []);

  useEffect(() => {
    if (phase !== "playing") return;
    // The overlay is transparent and pointer-transparent, so the page underneath is
    // both visible and usable from the first frame — someone can hit Sign in without
    // waiting out the animation. (This deliberately replaces the earlier `inert`
    // containment, which existed only because the overlay used to be opaque and hid
    // the controls it was trapping focus away from; with the page in plain view,
    // blocking it would be the accessibility problem rather than the fix.)
    // Any interaction with the page also ends the intro, so it never fights the user.
    document.documentElement.dataset.intro = "playing";
    function onInteract(event: Event) {
      if (event.target instanceof Element && event.target.closest(".landing-intro")) return;
      dismiss();
    }
    window.addEventListener("pointerdown", onInteract);
    window.addEventListener("focusin", onInteract);
    return () => {
      delete document.documentElement.dataset.intro;
      window.removeEventListener("pointerdown", onInteract);
      window.removeEventListener("focusin", onInteract);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    if (phase !== "playing") return;
    // The exit is driven by the li-overlay-out animationend; this timer is only
    // a fallback in case animations are suspended (e.g. background tab).
    const timer = window.setTimeout(dismiss, INTRO_MS + 4000);
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") dismiss();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKeyDown);
    };
    // dismiss is a stable-enough plain function re-created each render; depending on
    // it here would re-arm the fallback timer every render instead of once per phase.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  if (phase === "hidden") return null;

  return (
    <div
      ref={rootRef}
      className={`landing-intro${phase === "leaving" ? " is-leaving" : ""}`}
      role="region"
      aria-label="Season intro animation"
      onAnimationEnd={(event) => {
        if (event.animationName === "li-overlay-out") dismiss();
      }}
    >
      {/* No kicker or dedication here: the live landing page behind the transparent
          overlay already shows both, so repeating them would double the text. */}
      <button type="button" id="landing-intro-skip" className="landing-intro-skip" onClick={dismiss}>
        Skip intro
      </button>

      <p className="sr-only">
        Cheerful icons for eight different youth sports appear one by one under drifting
        clouds, then fade as the color drains: nobody gets paid, and the season does not run
        itself. A news-style ticker announces the game is postponed for rain. Coaches,
        parents, sponsors, and league admins arrive on their phones, a gear truck pulls up,
        and a schedule board fills in with team colors. Team mascots flash past like trading
        cards, the sun breaks through, and the season returns in full color, organized.
      </p>

      {/* li-stage is the positioned ancestor for the ticker and mascot layers, so their
          inset:0/percentage offsets resolve against just this scene row — not the full
          fixed overlay (header + captions included), which would misplace them. */}
      <div className="li-stage">
      <svg className="landing-intro-scene" viewBox="0 0 1200 800" aria-hidden="true" focusable="false">
        <defs>
          {/* A soft person mark — rounded head + shoulders, no stick limbs — so the
              cast reads as modern iconography rather than a cartoon sketch. */}
          <g id="li-adult">
            <circle cx="0" cy="-30" r="13" />
            <path d="M-21 6a21 21 0 0 1 42 0z" />
          </g>
          <g id="li-truck">
            <rect x="0" y="-46" width="120" height="46" rx="9" />
            <rect x="116" y="-34" width="46" height="34" rx="10" />
            <rect x="126" y="-27" width="22" height="13" rx="4" fill="#e8eef4" />
            <circle cx="30" cy="6" r="12" fill="#2a2f36" />
            <circle cx="138" cy="6" r="12" fill="#2a2f36" />
            <rect x="12" y="-68" width="30" height="22" rx="6" opacity="0.9" />
            <rect x="48" y="-62" width="24" height="16" rx="5" opacity="0.72" />
          </g>
        </defs>

        {/* No backdrop rects: the overlay is transparent so the real landing page shows
            through behind every element. Everything inside li-world starts grayscale and
            resolves to color at the finale, so the animation dissolves into the live page. */}
        <g className="li-world">
          <g className="li-sun">
            <circle cx="690" cy="88" r="40" fill="#f2c14e" />
            <g stroke="#f2c14e" strokeWidth="6" strokeLinecap="round">
              <path d="M690 24v-16M690 152v16M626 88h-16M754 88h16M645 43l-12-12M735 133l12 12M735 43l12-12M645 133l-12 12" />
            </g>
          </g>

          <g className="li-order">
            <g className="li-adults" fill="#33404d" color="#33404d">
              <g className="li-adult-1"><use href="#li-adult" transform="translate(180 545)" /><text x="180" y="580" textAnchor="middle" className="li-role">Coach</text></g>
              <g className="li-adult-2"><use href="#li-adult" transform="translate(330 545)" /><text x="330" y="580" textAnchor="middle" className="li-role">Parent</text></g>
              <g className="li-adult-3"><use href="#li-adult" transform="translate(480 545)" /><text x="480" y="580" textAnchor="middle" className="li-role">Sponsor</text></g>
              <g className="li-adult-4"><use href="#li-adult" transform="translate(630 545)" /><text x="630" y="580" textAnchor="middle" className="li-role">League admin</text></g>
            </g>

            <g className="li-truck-roll" fill="#5a6b7d">
              <use href="#li-truck" transform="translate(940 540)" />
            </g>

            <g className="li-board">
              <rect x="770" y="130" width="360" height="300" rx="10" fill="#fbf7ef" stroke="#c9bfae" strokeWidth="2" />
              <rect x="770" y="130" width="360" height="44" rx="10" fill="#17324d" />
              <text x="950" y="159" textAnchor="middle" className="li-board-title">Saturday Schedule</text>
              {BOARD_ROWS.map((row, index) => (
                <g key={row.team} className={`li-board-row li-board-row-${index + 1}`}>
                  <rect x="790" y={196 + index * 46} width="22" height="22" rx="5" fill={row.color} />
                  <text x="824" y={212 + index * 46} className="li-board-team">{row.team}</text>
                  <text x="824" y={228 + index * 46} className="li-board-line">{row.line}</text>
                </g>
              ))}
            </g>
          </g>
        </g>

        {/* No clouds here: the landing page's own drifting sky (LandingSky) shows
            through the transparent overlay, so a second cloud layer would double it. */}

        {/* Sport badges sit outside li-world so they pop in full, cheery color
            against the still-gray field — same device the phones use below. */}
        {/* Outer <g> carries the SVG position attribute untouched; CSS only ever
            animates the inner, un-positioned group — same rule as the chaos
            figures used to follow, so a transform animation can never collide
            with an attribute transform and collapse every badge to the origin. */}
        <g className="li-joy">
          {JOY_SPORTS.map((sport, index) => (
            <g key={sport.key} transform={`translate(${sport.cx} ${sport.cy})`}>
              <g className={`li-joy-badge li-joy-badge-${index + 1}`}>
                <circle r="34" fill={sport.color} />
                <ellipse cx="-10" cy="-12" rx="15" ry="9" fill="#fff" opacity="0.22" />
                <JoySportGlyph sport={sport} />
              </g>
            </g>
          ))}
        </g>

        {/* Phone screens sit outside li-world so they are the FIRST color on screen. */}
        <g className="li-phones">
          <rect x="199" y="519" width="15" height="24" rx="4" />
          <rect x="349" y="519" width="15" height="24" rx="4" />
          <rect x="499" y="519" width="15" height="24" rx="4" />
          <rect x="649" y="519" width="15" height="24" rx="4" />
        </g>
      </svg>

      <div className="li-ticker" aria-hidden="true">
        <span className="li-ticker-tag">
          <span className="li-ticker-dot" />
          Alert
        </span>
        <div className="li-ticker-track">
          {["a", "b"].map((group) => (
            <span className="li-ticker-group" key={group}>
              {TICKER_ITEMS.map((item) => (
                <span className="li-ticker-item" key={`${group}-${item}`}>{item} <span aria-hidden="true">•</span></span>
              ))}
            </span>
          ))}
        </div>
      </div>

      <div className="li-mascots" aria-hidden="true">
        {MASCOT_BADGES.map((badge, index) => (
          <svg key={badge.color} className={`li-badge li-badge-${index + 1}`} viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" fill={badge.color} stroke="#fff" strokeWidth="5" />
            <path d={badge.glyph} fill="#fff" />
          </svg>
        ))}
        <svg className="li-badge li-badge-final" viewBox="0 0 120 120">
          <path d="M60 10 22 25v30c0 26 16.5 45.6 38 53 21.5-7.4 38-27 38-53V25L60 10z" fill="#17324d" stroke="#fff" strokeWidth="4" />
          <text x="60" y="74" textAnchor="middle" fontSize="36" fontWeight="800" fill="#fff">LP</text>
        </svg>
      </div>
      </div>

      <div className="landing-intro-captions" aria-hidden="true">
        <p className="li-cap li-cap-1">The joy is easy. Every sport, every Saturday.</p>
        <p className="li-cap li-cap-2">The work is not. Nobody gets paid, and the season does not run itself.</p>
        <p className="li-cap li-cap-3">Communication is the key to all of it.</p>
      </div>
    </div>
  );
}
