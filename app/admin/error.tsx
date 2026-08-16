"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

export default function AdminError({ reset }: { reset: () => void }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div className="page">
      <section className="empty-state" role="alert">
        <span className="eyebrow">League office unavailable</span>
        <h1 ref={headingRef} tabIndex={-1}>We could not load this league office page.</h1>
        <p>
          No registration, membership, media, delivery, or archive record was changed. Try again, or open
          another league office page while records are reachable.
        </p>
        <div className="cluster">
          <button onClick={reset} type="button">Try again</button>
          <Link className="button secondary" href="/admin">Back to Overview</Link>
        </div>
      </section>
    </div>
  );
}
