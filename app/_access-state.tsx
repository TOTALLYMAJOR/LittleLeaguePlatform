import Link from "next/link";

export function SharedAccessRequiredSurface({
  eyebrow = "Access required",
  title,
  body,
  actionHref = "/auth",
  actionLabel = "Open sign in"
}: {
  eyebrow?: string;
  title: string;
  body: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="page">
      <section className="hero">
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p className="lead">{body}</p>
        <Link className="button" href={actionHref}>{actionLabel}</Link>
      </section>
    </div>
  );
}
