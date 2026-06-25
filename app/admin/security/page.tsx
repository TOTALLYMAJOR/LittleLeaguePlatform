import { buildSecurityProofDashboard } from "@/lib/supabase/security-proof";

export const dynamic = "force-dynamic";

export default function AdminSecurityProofPage() {
  const items = buildSecurityProofDashboard();
  const coveredCount = items.filter((item) => item.status === "covered").length;

  return (
    <div className="page">
      <section className="hero">
        <span className="eyebrow">Security proof</span>
        <h1>RLS and audit boundaries that must stay green before live family use.</h1>
        <p className="lead">
          This page summarizes source-backed proof for cross-team denial, archived-season read-only behavior,
          guardian-scoped RSVP writes, and production audit events.
        </p>
      </section>

      <section className="grid three">
        <article className="card metric"><span className="muted">Proof checks</span><strong>{items.length}</strong></article>
        <article className="card metric"><span className="muted">Covered</span><strong>{coveredCount}</strong></article>
        <article className="card metric"><span className="muted">Missing</span><strong>{items.length - coveredCount}</strong></article>
      </section>

      <section className="grid two">
        {items.map((item) => (
          <article className="card stack" key={item.title}>
            <span className="eyebrow">{item.status}</span>
            <h2>{item.title}</h2>
            <p>{item.evidence}</p>
            <p className="muted">{item.source}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
