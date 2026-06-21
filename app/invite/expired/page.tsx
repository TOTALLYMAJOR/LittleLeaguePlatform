import Link from "next/link";

export default function InviteExpiredPage() {
  return (
    <div className="page">
      <section className="hero">
        <span className="eyebrow">Invite expired</span>
        <h1>This invite needs admin review before it can be renewed.</h1>
        <p className="lead">
          The MVP recovery flow does not create a new raw token for expired invites. It directs the parent to an admin-reviewed path so child access stays controlled.
        </p>
      </section>
      <Link className="button" href="/invite/recover">Try another email or phone</Link>
    </div>
  );
}
