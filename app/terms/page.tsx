import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms governing access to and use of LeaguePilot."
};

export default function TermsOfServicePage() {
  return (
    <article className="page legal-page">
      <header className="legal-hero">
        <span className="eyebrow">LeaguePilot legal</span>
        <h1>Terms of Service</h1>
        <p className="lead">The rules that apply when you access or use LeaguePilot.</p>
        <p className="legal-effective-date">Effective September 13, 2026</p>
      </header>

      <section className="legal-summary">
        <h2>Agreement to these Terms</h2>
        <p>By accessing or using LeaguePilot (the “Service” or the “Platform”), operated under the LeaguePilot brand (“LeaguePilot,” “we,” “us,” or “our”), you agree to be bound by these Terms of Service (“Terms”). If you do not agree, do not use the Service.</p>
      </section>

      <section>
        <h2>Who may use LeaguePilot</h2>
        <p>LeaguePilot is intended for adult parents, guardians, coaches, volunteers, and league administrators. Children do not create accounts. You must provide accurate information, protect your credentials, and use only the organization, team, and family access that has been approved for you.</p>
      </section>

      <section>
        <h2>League and user responsibilities</h2>
        <p>Participating leagues control their team records, access approvals, schedules, and authorized communications. Users must not misuse personal information, impersonate another person, bypass permissions, disrupt the Service, scrape private data, or use LeaguePilot for unlawful, abusive, or unsafe activity.</p>
      </section>

      <section>
        <h2>SMS communications</h2>
        <p>If you voluntarily provide a mobile number and check the SMS consent box, you agree to receive messages from LeaguePilot about your team-access request and essential team updates. Message frequency may vary. Standard message and data rates may apply. Reply <strong>STOP</strong> to opt out and <strong>HELP</strong> for help. SMS consent is not a condition of requesting access or using LeaguePilot.</p>
      </section>

      <section>
        <h2>Content and communications</h2>
        <p>You are responsible for content you submit and must have the right to provide it. LeaguePilot may restrict or remove content when needed to protect users, enforce these Terms, comply with law, or preserve service integrity. Drafts, recommendations, or automated assistance do not replace league approval or professional judgment.</p>
      </section>

      <section>
        <h2>Service availability</h2>
        <p>We work to keep the Service available and accurate, but schedules, messages, integrations, and network access may be delayed or unavailable. Users should confirm urgent safety, medical, cancellation, and field information through the league’s official channels.</p>
      </section>

      <section>
        <h2>Suspension and termination</h2>
        <p>LeaguePilot or an authorized league administrator may limit or terminate access when an account is no longer eligible, a season or team closes, these Terms are violated, or action is needed to protect people, data, or the Service.</p>
      </section>

      <section>
        <h2>Disclaimers and limitation</h2>
        <p>The Service is provided on an “as is” and “as available” basis to the extent permitted by law. LeaguePilot does not guarantee uninterrupted availability or that all league-provided information is complete. To the extent permitted by law, LeaguePilot is not liable for indirect, incidental, special, consequential, or punitive damages arising from use of the Service.</p>
      </section>

      <section>
        <h2>Changes to these Terms</h2>
        <p>We may update these Terms as the Service or legal requirements change. The effective date above identifies the current version. Continued use after an update means you accept the revised Terms where permitted by law.</p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>Questions about these Terms can be sent to <a href="mailto:privacy@leaguepilot.us">privacy@leaguepilot.us</a>.</p>
        <p><Link href="/privacy">Read the Privacy Policy</Link>.</p>
      </section>
    </article>
  );
}
