"use client";

export const INTRO_REPLAY_EVENT = "leaguepilot:intro-replay";

export function ReplayIntroButton() {
  return (
    <button
      type="button"
      className="landing-gateway-replay"
      onClick={() => window.dispatchEvent(new CustomEvent(INTRO_REPLAY_EVENT))}
    >
      Replay intro
    </button>
  );
}
