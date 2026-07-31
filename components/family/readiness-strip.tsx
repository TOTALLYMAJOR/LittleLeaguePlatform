import Link from "next/link";
import { ArrowRight, CheckCircle2, CircleAlert } from "lucide-react";

export interface ReadinessItem {
  id: string;
  label: string;
  href: string;
}

export function ReadinessStrip({
  eventTitle,
  items
}: {
  eventTitle?: string;
  items: ReadinessItem[];
}) {
  const hasItems = items.length > 0;
  return (
    <section className={`family-readiness-strip ${hasItems ? "needs-action" : "is-ready"}`} aria-labelledby="family-readiness-title">
      <div className="family-readiness-strip-summary">
        {hasItems ? <CircleAlert aria-hidden="true" size={20} strokeWidth={2.2} /> : <CheckCircle2 aria-hidden="true" size={20} strokeWidth={2.2} />}
        <div>
          <span className="parent-weekly-kicker">Ready for Saturday</span>
          <h2 id="family-readiness-title">
            {hasItems
              ? `${items.length} thing${items.length === 1 ? " needs" : "s need"} you`
              : "Nothing unresolved for Saturday"}
          </h2>
          <p>{eventTitle ? `For ${eventTitle}.` : "No upcoming official event is being called ready."}</p>
        </div>
      </div>
      {hasItems ? (
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              <Link href={item.href}>
                {item.label}
                <ArrowRight aria-hidden="true" size={15} />
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
