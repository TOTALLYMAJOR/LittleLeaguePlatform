"use client";

import { useEffect, useRef } from "react";

export default function ParentHomeError({ reset }: { reset: () => void }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div className="page parent-weekly-dashboard">
      <section className="communication-empty-state" role="alert">
        <span className="eyebrow">Family Home unavailable</span>
        <h1 ref={headingRef} tabIndex={-1}>We could not safely load your Saturday view.</h1>
        <p>No schedule, RSVP, attendance, acknowledgement, ride, or access state was changed. Try again when records are reachable.</p>
        <button onClick={reset} type="button">Try again</button>
      </section>
    </div>
  );
}
