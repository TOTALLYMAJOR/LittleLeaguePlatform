"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

export default function CoachError({ reset }: { reset: () => void }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div className="page">
      <section className="empty-state" role="alert">
        <span className="eyebrow">Coach tools unavailable</span>
        <h1 ref={headingRef} tabIndex={-1}>We could not load this coach page.</h1>
        <p>
          No RSVP, attendance, draft, weather, or Parent Replay record was changed. Try again, or open
          another coach page while records are reachable.
        </p>
        <div className="cluster">
          <button onClick={reset} type="button">Try again</button>
          <Link className="button secondary" href="/coach">Back to Today</Link>
        </div>
      </section>
    </div>
  );
}
