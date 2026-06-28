import { roleLabel } from "@/lib/domain";
import type { DomainPolicyActor } from "@/lib/domain/policies";
import type { ReactNode } from "react";

export function AccessRestrictedPanel({ actor, title }: { actor: DomainPolicyActor; title: string }) {
  return (
    <article className="card stack" aria-label={title}>
      <span className="eyebrow">Role scoped</span>
      <h2>{title}</h2>
      <p className="muted">{roleLabel(actor.role)} cannot view this panel with the current policy scope.</p>
    </article>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="muted">{children}</p>;
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC"
  }).format(new Date(value));
}

export function formatDomainValue(value: string) {
  return value.replaceAll("_", " ");
}
