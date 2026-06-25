import Link from "next/link";
import { listAdminOperationsData } from "@/lib/supabase/admin-operations";

export const dynamic = "force-dynamic";

export default async function AdminOperationsPage() {
  const data = await listAdminOperationsData();

  return (
    <div className="page">
      <section className="hero">
        <span className="eyebrow">Admin operations</span>
        <h1>Organization settings, provider inventory, approval queues, and audit logs.</h1>
        <p className="lead">{data.message}</p>
      </section>

      <section className="grid three">
        <article className="card metric"><span className="muted">Organization</span><strong>{data.settings.organizationName}</strong></article>
        <article className="card metric"><span className="muted">Season</span><strong>{data.settings.activeSeasonName}</strong></article>
        <article className="card metric"><span className="muted">Status</span><strong>{data.settings.activeSeasonStatus}</strong></article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <h2>Provider inventory</h2>
          {data.providerInventory.map((item) => (
            <p key={`${item.provider}-${item.channel}`}>
              <strong>{item.provider}</strong> <span className="muted">({item.channel})</span><br />
              <span className={`badge ${item.status === "configured" ? "ok" : item.status === "missing" ? "warning" : ""}`}>{item.status}</span>{" "}
              <span className="muted">{item.boundary}</span>
            </p>
          ))}
        </article>

        <article className="card stack">
          <h2>Approval queues</h2>
          {data.approvalQueues.map((item) => (
            <p key={item.queue}>
              <strong>{item.queue}: {item.count}</strong><br />
              <Link href={item.actionHref}>Open queue</Link><br />
              <span className="muted">{item.boundary}</span>
            </p>
          ))}
        </article>
      </section>

      <section className="card stack">
        <h2>Audit logs</h2>
        {data.auditLogs.map((item) => (
          <p key={item.id}>
            <strong>{item.action}</strong> <span className="muted">{item.targetType} - {new Date(item.createdAt).toLocaleString("en-US")}</span><br />
            {item.summary}
          </p>
        ))}
        {!data.auditLogs.length ? <p className="muted">No audit events available yet.</p> : null}
      </section>
    </div>
  );
}
