import { listAdminTeamManagementData } from "@/lib/supabase/team-management";

export const dynamic = "force-dynamic";

export default async function AdminTeamsPage() {
  const data = await listAdminTeamManagementData();

  return (
    <div className="page">
      <section className="hero">
        <span className="eyebrow">Team setup</span>
        <h1>Manage team records by organization, season, and division.</h1>
        <p className="lead">{data.message}</p>
      </section>

      <section className="grid three">
        <article className="card metric"><span className="muted">Teams</span><strong>{data.teams.length}</strong></article>
        <article className="card metric"><span className="muted">Divisions</span><strong>{data.divisions.length}</strong></article>
        <article className="card metric"><span className="muted">Seasons</span><strong>{data.seasons.length}</strong></article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <h2>Divisions</h2>
          {data.divisions.map((division) => <p key={division}>{division}</p>)}
        </article>
        <article className="card stack">
          <h2>Seasons</h2>
          {data.seasons.map((season) => (
            <p key={season.id}><strong>{season.name}</strong><br /><span className="muted">{season.status}</span></p>
          ))}
        </article>
      </section>

      <section className="grid two">
        {data.teams.map((team) => (
          <article className="card stack" key={team.id}>
            <span className="eyebrow">{team.division}</span>
            <h2>{team.name}</h2>
            <p>{team.mascot} - {team.themeKey}</p>
            <p className="muted">{team.seasonName} ({team.seasonStatus})</p>
          </article>
        ))}
      </section>
    </div>
  );
}
