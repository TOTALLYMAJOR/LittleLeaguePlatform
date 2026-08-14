"use client";

export default function ParentHomeError({ reset }: { reset: () => void }) {
  return (
    <main className="parent-weekly-dashboard">
      <section className="parent-weekly-card parent-weekly-route-error" role="alert">
        <span className="parent-weekly-kicker">Family Home unavailable</span>
        <h1>We could not safely load your family plan.</h1>
        <p>
          No RSVP, ride, message, or access record was changed. Try again when your connection is stable.
        </p>
        <button type="button" onClick={reset}>Try again</button>
      </section>
    </main>
  );
}
