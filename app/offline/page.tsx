import Link from "next/link";

export default function OfflinePage() {
  return (
    <div className="page">
      <section className="hero">
        <span className="eyebrow">Offline</span>
        <h1>Connection is required before team data is trusted.</h1>
        <p className="lead">The app shell is available, but schedules, RSVPs, chat, media, and registration records should refresh from Supabase before anyone acts on them.</p>
      </section>

      <section className="grid two">
        <article className="card stack">
          <h2>What you can do</h2>
          <p>Reconnect, then reload the page you were using. If the app was installed, open it again after the device is online.</p>
          <Link href="/">Return home</Link>
        </article>
        <article className="card stack">
          <h2>What stays protected</h2>
          <p>Offline fallback does not replay provider sends, save RSVPs, post chat messages, approve registrations, or expose private rows that were not already loaded.</p>
          <p className="muted">Live Supabase reads remain the source of truth.</p>
        </article>
      </section>
    </div>
  );
}
