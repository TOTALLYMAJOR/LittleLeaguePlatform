import Link from "next/link";
import { listAdminObservabilityData } from "@/lib/supabase/admin-observability";

export const dynamic = "force-dynamic";

export default async function AdminObservabilityPage() {
  const data = await listAdminObservabilityData();

  return (
    <div className="page">
      <section className="hero">
        <span className="eyebrow">Production observability</span>
        <h1>Operational signals for auth, RLS, delivery, public intake, and moderation.</h1>
        <p className="lead">{data.message}</p>
      </section>

      <section className="grid three">
        {data.metrics.map((metric) => (
          <article className="card metric" key={metric.id}>
            <span className="muted">{metric.label}</span>
            <strong>{metric.count}</strong>
            <span className={`badge ${metric.status === "ok" ? "ok" : metric.status === "danger" ? "danger" : "warning"}`}>{metric.status}</span>
            <p className="muted">{metric.detail}</p>
            <Link href={metric.actionHref}>Review source</Link>
          </article>
        ))}
      </section>

      <section className="grid two">
        <article className="card stack">
          <h2>SLO-style watches</h2>
          {data.objectives.map((objective) => (
            <p key={objective.label}>
              <strong>{objective.label}</strong> <span className={`badge ${objective.status === "ok" ? "ok" : objective.status === "danger" ? "danger" : "warning"}`}>{objective.status}</span><br />
              <span className="muted">Target: {objective.target}</span><br />
              {objective.current}
            </p>
          ))}
        </article>

        <article className="card stack">
          <h2>External alert hooks</h2>
          {data.hooks.map((hook) => (
            <p key={hook.envKey}>
              <strong>{hook.label}</strong> <span className={`badge ${hook.status === "configured" ? "ok" : "warning"}`}>{hook.status}</span><br />
              <span className="muted">{hook.envKey} - {hook.boundary}</span>
            </p>
          ))}
        </article>
      </section>

      <section className="card stack">
        <div className="card-header">
          <div>
            <span className="eyebrow">Recent signals</span>
            <h2>Incident response feed</h2>
          </div>
          <span className="badge">{data.source}</span>
        </div>
        {data.events.map((event) => (
          <p key={event.id}>
            <strong>{event.source}</strong> <span className={`badge ${event.severity === "ok" ? "ok" : event.severity === "danger" ? "danger" : "warning"}`}>{event.severity}</span><br />
            <span className="muted">{new Date(event.createdAt).toLocaleString("en-US")}</span><br />
            {event.summary}
          </p>
        ))}
        {!data.events.length ? <p className="muted">No recent observability signals in the current sample.</p> : null}
      </section>
    </div>
  );
}
