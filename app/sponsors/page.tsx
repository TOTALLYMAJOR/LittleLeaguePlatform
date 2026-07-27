import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sponsor the league",
  description: "Public sponsorship information for LeaguePilot community leagues."
};

export default function SponsorsPage() {
  return (
    <div className="public-sponsor-page">
      <section className="public-sponsor-intro" aria-labelledby="sponsor-title">
        <p className="public-sponsor-kicker">Community sponsorship</p>
        <h1 id="sponsor-title">Put local support behind every game.</h1>
        <p>
          League sponsorships can support fields, equipment, and family programming.
          Ask your league administrator about current packages and approved placements.
        </p>
        <div className="public-sponsor-actions">
          <Link className="button" href="/schedule">View public schedule</Link>
          <Link className="button secondary" href="/">Back to LeaguePilot</Link>
        </div>
      </section>

      <aside className="public-sponsor-boundary" aria-label="Sponsor privacy and fulfillment">
        <strong>Community visibility, with family privacy intact.</strong>
        <p>
          Public sponsor placement never includes child profiles, parent contact details,
          private media, billing state, or claims of delivered impact.
        </p>
        <small>
          Package availability, contracts, payment, and placement fulfillment are confirmed
          by the league, not by this public page.
        </small>
      </aside>
    </div>
  );
}
