"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import parentPhoto from "@/public/images/leaguepilot-game-day-parent.png";
import fieldPhoto from "@/public/images/leaguepilot-baseball-field-overhead.webp";

const STORAGE_KEY = "leaguepilot-intro-seen:v1";
const INTRO_MS = 18000;
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
  const previousFocus = useRef<HTMLElement | null>(null);

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
    const hero = rootRef.current?.nextElementSibling as HTMLElement | null;
    const header = document.querySelector<HTMLElement>(".public-header");
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (hero) hero.inert = true;
    if (header) header.inert = true;
    document.getElementById("landing-intro-skip")?.focus();
    return () => {
      if (hero) hero.inert = false;
      if (header) header.inert = false;
      previousFocus.current?.focus();
    };
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
      <header className="landing-intro-top">
        <span className="landing-intro-kicker">LeaguePilot</span>
        <p className="landing-intro-dedication">
          Built in honor of Pearl River Youth Sport Administrators and Volunteers
        </p>
        <button type="button" id="landing-intro-skip" className="landing-intro-skip" onClick={dismiss}>
          Skip intro
        </button>
      </header>

      <p className="sr-only">
        Five youth teams play in joyful disorder under gathering clouds. The color drains and
        rain falls on an empty field: nobody gets paid, and the season does not run itself.
        A parent loads the car before dawn; families watch a game from the bleachers. Coaches,
        parents, sponsors, and league admins arrive on their phones, gear trucks pull up,
        schedules go up with team colors. Team mascots flash past like trading cards, the sun
        breaks through — and the season comes back in full color, organized.
      </p>

      <svg className="landing-intro-scene" viewBox="0 0 1200 800" aria-hidden="true" focusable="false">
        <defs>
          <g id="li-runner-a" strokeLinecap="round">
            <circle cx="0" cy="-46" r="11" />
            <path d="M0 -35 L-2 -6" strokeWidth="9" fill="none" stroke="currentColor" />
            <path d="M-1 -28 L-18 -14 M-1 -28 L16 -18" strokeWidth="7" fill="none" stroke="currentColor" />
            <path d="M-2 -6 L-20 22 M-2 -6 L14 24" strokeWidth="8" fill="none" stroke="currentColor" />
          </g>
          <g id="li-runner-b" strokeLinecap="round">
            <circle cx="0" cy="-48" r="11" />
            <path d="M0 -37 L3 -8" strokeWidth="9" fill="none" stroke="currentColor" />
            <path d="M1 -30 L20 -34 M1 -30 L-16 -16" strokeWidth="7" fill="none" stroke="currentColor" />
            <path d="M3 -8 L24 12 M3 -8 L-12 26" strokeWidth="8" fill="none" stroke="currentColor" />
          </g>
          <g id="li-adult" strokeLinecap="round">
            <circle cx="0" cy="-64" r="12" />
            <path d="M0 -51 L0 -8" strokeWidth="10" fill="none" stroke="currentColor" />
            <path d="M0 -42 L-16 -26 L-8 -20 M0 -42 L16 -26 L8 -20" strokeWidth="7" fill="none" stroke="currentColor" />
            <path d="M0 -8 L-10 24 M0 -8 L10 24" strokeWidth="8" fill="none" stroke="currentColor" />
          </g>
          <g id="li-truck">
            <rect x="0" y="-46" width="120" height="46" rx="4" />
            <rect x="120" y="-34" width="42" height="34" rx="4" />
            <rect x="128" y="-28" width="20" height="12" rx="2" fill="#e8eef4" />
            <circle cx="30" cy="6" r="13" fill="#2a2f36" />
            <circle cx="138" cy="6" r="13" fill="#2a2f36" />
            <rect x="10" y="-70" width="30" height="22" rx="3" opacity="0.9" />
            <rect x="46" y="-64" width="24" height="16" rx="3" opacity="0.75" />
          </g>
        </defs>

        {/* Everything inside li-world starts grayscale; color floods at the finale. */}
        <g className="li-world">
          <rect x="0" y="0" width="1200" height="800" fill="#f2f6ef" />
          <rect x="0" y="560" width="1200" height="240" fill="#7fae7a" />
          <path d="M0 560 H1200" stroke="#ffffff" strokeWidth="4" opacity="0.7" />
          <circle cx="600" cy="700" r="90" fill="none" stroke="#ffffff" strokeWidth="4" opacity="0.55" />

          <g className="li-sun">
            <circle cx="690" cy="88" r="40" fill="#f2c14e" />
            <g stroke="#f2c14e" strokeWidth="6" strokeLinecap="round">
              <path d="M690 24v-16M690 152v16M626 88h-16M754 88h16M645 43l-12-12M735 133l12 12M735 43l12-12M645 133l-12 12" />
            </g>
          </g>

          <g className="li-clouds" fill="#d3dae0">
            <g className="li-cloud-drift li-cloud-a">
              <ellipse cx="220" cy="120" rx="86" ry="30" />
              <ellipse cx="290" cy="100" rx="60" ry="24" />
            </g>
            <g className="li-cloud-drift li-cloud-b">
              <ellipse cx="640" cy="80" rx="100" ry="30" />
              <ellipse cx="720" cy="104" rx="64" ry="22" />
            </g>
            <g className="li-cloud-drift li-cloud-c">
              <ellipse cx="1010" cy="140" rx="78" ry="26" />
              <ellipse cx="940" cy="118" rx="52" ry="20" />
            </g>
          </g>

          <g className="li-chaos">
            <g className="li-team li-team-1" fill="#c62f2f" color="#c62f2f">
              <use href="#li-runner-a" transform="translate(210 640) rotate(-8)" />
              <use href="#li-runner-b" transform="translate(290 600) scale(0.9) rotate(12)" />
              <use href="#li-runner-a" transform="translate(150 580) scale(0.8) rotate(20)" />
              <circle cx="255" cy="668" r="12" fill="#ffffff" stroke="#333" strokeWidth="2" />
            </g>
            <g className="li-team li-team-2" fill="#1f5fbf" color="#1f5fbf">
              <use href="#li-runner-b" transform="translate(880 620) rotate(6)" />
              <use href="#li-runner-a" transform="translate(960 660) scale(0.85) rotate(-14)" />
              <use href="#li-runner-b" transform="translate(820 690) scale(0.95) rotate(-4)" />
              <circle cx="905" cy="700" r="14" fill="#e8862c" />
            </g>
            <g className="li-team li-team-3" fill="#1f7a4d" color="#1f7a4d">
              <use href="#li-runner-a" transform="translate(520 610) scale(1.05) rotate(14)" />
              <use href="#li-runner-b" transform="translate(600 650) scale(0.9) rotate(-10)" />
              <use href="#li-runner-a" transform="translate(450 690) scale(0.85) rotate(4)" />
              <rect x="612" y="586" width="34" height="7" rx="3" fill="#8a5a2b" transform="rotate(-32 612 586)" />
            </g>
            <g className="li-team li-team-4" fill="#6b3fa0" color="#6b3fa0">
              <use href="#li-runner-b" transform="translate(350 720) rotate(-16)" />
              <use href="#li-runner-a" transform="translate(430 750) scale(0.9) rotate(10)" />
              <use href="#li-runner-b" transform="translate(280 760) scale(0.8) rotate(2)" />
              <circle cx="395" cy="770" r="10" fill="#f2d43d" />
            </g>
            <g className="li-team li-team-5" fill="#d97a1f" color="#d97a1f">
              <use href="#li-runner-a" transform="translate(700 740) rotate(18)" />
              <use href="#li-runner-b" transform="translate(770 700) scale(0.95) rotate(-8)" />
              <use href="#li-runner-a" transform="translate(640 770) scale(0.85) rotate(-2)" />
              <path d="M700 780 h64" stroke="#ffffff" strokeWidth="5" opacity="0.8" />
            </g>
          </g>

          <g className="li-order">
            <g className="li-adults" fill="#33404d" color="#33404d">
              <g className="li-adult-1"><use href="#li-adult" transform="translate(180 548)" /><text x="180" y="576" textAnchor="middle" className="li-role">Coach</text></g>
              <g className="li-adult-2"><use href="#li-adult" transform="translate(330 548)" /><text x="330" y="576" textAnchor="middle" className="li-role">Parent</text></g>
              <g className="li-adult-3"><use href="#li-adult" transform="translate(480 548)" /><text x="480" y="576" textAnchor="middle" className="li-role">Sponsor</text></g>
              <g className="li-adult-4"><use href="#li-adult" transform="translate(630 548)" /><text x="630" y="576" textAnchor="middle" className="li-role">League admin</text></g>
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

          <g className="li-rain-wrap">
            <g className="li-rain" stroke="#8fa3b3" strokeWidth="3" strokeLinecap="round" opacity="0.8">
              {Array.from({ length: 22 }, (_, i) => {
                const x = 40 + ((i * 129) % 1140);
                const y = -30 + ((i * 197) % 740);
                return <line key={i} x1={x} y1={y} x2={x - 8} y2={y + 26} />;
              })}
            </g>
          </g>
        </g>

        {/* Phone screens sit outside li-world so they are the FIRST color on screen. */}
        <g className="li-phones">
          <rect x="196" y="490" width="16" height="26" rx="3" />
          <rect x="346" y="490" width="16" height="26" rx="3" />
          <rect x="496" y="490" width="16" height="26" rx="3" />
          <rect x="646" y="490" width="16" height="26" rx="3" />
        </g>
      </svg>

      <div className="li-cinema" aria-hidden="true">
        <figure className="li-cine li-cine-1">
          <Image alt="" fill placeholder="blur" sizes="100vw" src={parentPhoto} />
        </figure>
        <figure className="li-cine li-cine-2">
          <Image alt="" fill placeholder="blur" sizes="100vw" src={fieldPhoto} />
        </figure>
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

      <div className="landing-intro-captions" aria-hidden="true">
        <p className="li-cap li-cap-1">The joy is easy. Five teams of it, every Saturday.</p>
        <p className="li-cap li-cap-2">The work is not. Nobody gets paid, and the season does not run itself.</p>
        <p className="li-cap li-cap-4">Every Saturday starts in a parking lot, rain or shine.</p>
        <p className="li-cap li-cap-3">Communication is the key to all of it.</p>
      </div>
    </div>
  );
}
