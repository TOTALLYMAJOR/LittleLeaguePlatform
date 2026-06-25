import { listArchiveVaultData } from "@/lib/supabase/archive-vault";

export const dynamic = "force-dynamic";

export default async function AdminArchivePage() {
  const data = await listArchiveVaultData();

  return (
    <div className="page">
      <section className="hero">
        <span className="eyebrow">Archive vault</span>
        <h1>Archived seasons stay readable, exportable, and mutation-locked.</h1>
        <p className="lead">{data.message}</p>
      </section>

      <section className="grid two">
        {data.proof.map((item) => (
          <article className="card stack" key={item.label}>
            <h2>{item.label}</h2>
            <p>{item.detail}</p>
          </article>
        ))}
      </section>

      <section className="grid two">
        {data.archivedSeasons.map((season) => (
          <article className="card stack" key={season.id}>
            <span className="eyebrow">Archived season</span>
            <h2>{season.name}</h2>
            <p>{season.teamCount} team(s)</p>
            <p className="muted">{season.archivedAt ?? "No archive timestamp recorded"}</p>
          </article>
        ))}
        {!data.archivedSeasons.length ? <p className="muted">No archived seasons are available yet.</p> : null}
      </section>
    </div>
  );
}
