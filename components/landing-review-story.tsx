"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, LockKeyhole, Play } from "lucide-react";

const STEPS = ["Weather check", "Coach review", "Family alert"];

/** Presentation-only example. These views neither read nor change a weather record. */
export function LandingReviewStory() {
  const [view, setView] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [interacted, setInteracted] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const stop = () => { if (media.matches) { setPlaying(false); setView(1); } };
    media.addEventListener("change", stop);
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        if (!media.matches && !document.hidden) setPlaying(true);
        observer.disconnect();
      }
    }, { threshold: 0.5 });
    if (container.current) observer.observe(container.current);
    return () => { observer.disconnect(); media.removeEventListener("change", stop); };
  }, []);

  useEffect(() => {
    if (!playing) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const first = window.setTimeout(() => setView(0), 0);
    const review = window.setTimeout(() => { setView(1); setPlaying(false); }, 1400);
    return () => { window.clearTimeout(first); window.clearTimeout(review); };
  }, [playing]);

  function selectView(index: number) {
    setInteracted(true);
    setPlaying(false);
    setView(index);
  }

  return (
    <div className="landing-review-story" ref={container} data-example-view={view}>
      <div className="landing-review-label">
        <span>How a weather draft is reviewed</span>
        <button type="button" className="landing-review-play" onClick={() => {
          setInteracted(true);
          if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) selectView(1);
          else setPlaying(true);
        }} aria-label="Play the sample weather review sequence" disabled={playing}>
          <Play size={12} aria-hidden="true" /> {playing ? "Playing example" : "Play example"}
        </button>
      </div>
      <div className="landing-review-steps" role="group" aria-label="Explore the sample weather review">
        {STEPS.map((label, index) => (
          <button key={label} type="button" aria-pressed={view === index} onClick={() => selectView(index)}>
            <span className="landing-review-number" aria-hidden="true">
              {index === 2 ? <LockKeyhole size={12} /> : index === 0 && view > 0 ? <Check size={12} /> : index + 1}
            </span>
            <span>{label}</span>
            {index < 2 ? <ArrowRight className="landing-review-arrow" size={13} aria-hidden="true" /> : null}
          </button>
        ))}
      </div>
      <div className="landing-review-panels" aria-live={interacted ? "polite" : "off"} aria-atomic="true">
        <p className="landing-review-panel" hidden={view !== 0}>
          <strong>A possible delay needs a look.</strong>
          <span>In this example, a weather concern is ready for a coach to review.</span>
        </p>
        <p className="landing-review-panel" hidden={view !== 1}>
          <strong>Drafted for your review.</strong>
          <span>The coach reviews the draft. Nothing sent to families yet.</span>
        </p>
        <p className="landing-review-panel" hidden={view !== 2}>
          <strong>Approval comes first.</strong>
          <span>This example sends nothing. Family alerts require human approval and enabled delivery.</span>
        </p>
      </div>
      <span className="landing-review-boundary">Illustrative example · Not live weather · No messages sent</span>
    </div>
  );
}
