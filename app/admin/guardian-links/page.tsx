import { listGuardianLinkRepairData } from "@/lib/supabase/guardian-links";

export const dynamic = "force-dynamic";

export default async function AdminGuardianLinksPage() {
  const data = await listGuardianLinkRepairData();

  return (
    <div className="page">
      <section className="hero">
        <span className="eyebrow">Guardian links</span>
        <h1>Repair missing parent-player links before families hit dead ends.</h1>
        <p className="lead">{data.message}</p>
      </section>

      <section className="grid three">
        <article className="card metric"><span className="muted">Missing links</span><strong>{data.missingLinks.length}</strong></article>
        <article className="card metric"><span className="muted">Parent options</span><strong>{data.parentOptions.length}</strong></article>
        <article className="card metric"><span className="muted">Boundary</span><strong>admin</strong></article>
      </section>

      <section className="grid two">
        {data.missingLinks.map((link) => (
          <article className="card stack" key={link.playerId}>
            <span className="eyebrow">{link.teamName}</span>
            <h2>{link.playerName}</h2>
            <p className="muted">Use `/api/admin/guardian-links/repair` to attach an approved parent and activate team access.</p>
          </article>
        ))}
      </section>
    </div>
  );
}
