import Link from "next/link";

export default function InviteExpiredPage() {
  return (
    <div className="page">
      <section className="hero">
        <span className="eyebrow">Invite expired</span>
        <h1>This invitation needs league review.</h1>
        <p className="lead">
          An expired invitation cannot open private team details. Ask the league to confirm the child, team, and adult connection before a replacement is prepared.
        </p>
      </section>
      <Link className="button" href="/invite/recover">Request invitation review</Link>
      <Link className="button secondary" href="/auth">Sign in</Link>
    </div>
  );
}

export const metadata = {
  title: "Invite Expired"
};
