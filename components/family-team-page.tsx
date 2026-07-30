import Link from "next/link";
import { ArrowRight, CalendarDays, HandHeart, MessageCircle, UsersRound } from "lucide-react";

export interface FamilyTeamView {
  teams: Array<{
    id: string;
    name: string;
    mascot: string;
    coachNames: string[];
    nextEvent?: {
      title: string;
      startsAt: string;
      locationName: string;
    };
  }>;
}

export function FamilyTeamPage({ view }: { view: FamilyTeamView }) {
  return (
    <div className="page family-team-page">
      <section className="hero family-team-hero">
        <span className="eyebrow">Family team page</span>
        <h1>Your team contacts and next steps.</h1>
        <p className="lead">Family access shows useful team facts. Portal branding and staff capability controls stay on staff surfaces.</p>
      </section>

      {view.teams.length ? (
        <section className="family-team-list" aria-label="Linked family teams">
          {view.teams.map((team) => (
            <article className="family-team-card" key={team.id}>
              <header>
                <span aria-hidden="true">{team.mascot.slice(0, 1)}</span>
                <div>
                  <small>Linked team</small>
                  <h2>{team.name}</h2>
                </div>
              </header>
              <dl>
                <div>
                  <dt><CalendarDays aria-hidden="true" size={16} /> Next event</dt>
                  <dd>{team.nextEvent
                    ? `${team.nextEvent.title} · ${new Date(team.nextEvent.startsAt).toLocaleString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit"
                    })} · ${team.nextEvent.locationName}`
                    : "No upcoming event is published."}</dd>
                </div>
                <div>
                  <dt><UsersRound aria-hidden="true" size={16} /> Coach contacts</dt>
                  <dd>{team.coachNames.length ? team.coachNames.join(", ") : "No assigned coach name is available."}</dd>
                </div>
              </dl>
              <nav aria-label={`${team.name} family actions`}>
                <Link href="/parent/schedule">Schedule <ArrowRight aria-hidden="true" size={15} /></Link>
                <Link href="/parent/messages"><MessageCircle aria-hidden="true" size={15} /> Messages</Link>
                <Link href="/parent#family-help"><HandHeart aria-hidden="true" size={15} /> Help board</Link>
              </nav>
            </article>
          ))}
        </section>
      ) : (
        <section className="family-team-empty">
          <h2>No linked team is available</h2>
          <p>Family team details appear only after an approved guardian link is active.</p>
          <Link className="button secondary" href="/registration">Check family access</Link>
        </section>
      )}
    </div>
  );
}
