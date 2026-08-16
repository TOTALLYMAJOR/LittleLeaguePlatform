import Link from "next/link";
import { OfflineSyncStatus } from "@/components/offline-sync-status";

export default function OfflinePage() {
  return (
    <div className="page">
      <section className="hero">
        <span className="eyebrow">Offline</span>
        <h1>Connection is required before team data is trusted.</h1>
        <p className="lead">The app is loading, but schedules, RSVPs, chat, photos, and registrations should refresh before anyone acts on them.</p>
      </section>

      <section className="grid two">
        <article className="card stack">
          <h2>What you can do</h2>
          <p>Reconnect, then reload the page you were using. If the app was installed, open it again after the device is online.</p>
          <Link className="button secondary" href="/">Return home</Link>
        </article>
        <article className="card stack">
          <h2>What stays protected</h2>
          <p>While offline the app will not send messages, save RSVPs, post to chat, approve registrations, or show private details it had not already loaded.</p>
          <p className="muted">Once you reconnect, the live records are what count.</p>
        </article>
      </section>
      <OfflineSyncStatus />
    </div>
  );
}

export const metadata = {
  title: "Offline"
};
