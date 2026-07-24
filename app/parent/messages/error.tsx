"use client";

export default function ParentMessagesError({ reset }: { reset: () => void }) {
  return (
    <main className="page communication-room">
      <section className="communication-empty-state" role="alert">
        <span className="eyebrow">Communication Room unavailable</span>
        <h1>We could not safely load your team messages.</h1>
        <p>No schedule, attendance, ride, permission, or message state was changed. Try again when you have a stable connection.</p>
        <button onClick={reset} type="button">Try again</button>
      </section>
    </main>
  );
}
