import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How LeaguePilot handles personal information, child privacy, and SMS consent."
};

export default function PrivacyPolicyPage() {
  return (
    <article className="page legal-page">
      <header className="legal-hero">
        <span className="eyebrow">LeaguePilot legal</span>
        <h1>Privacy Policy</h1>
        <p className="lead">How LeaguePilot collects, uses, protects, and shares information.</p>
        <p className="legal-effective-date">Effective September 13, 2026</p>
      </header>

      <section className="legal-summary" aria-labelledby="privacy-summary">
        <h2 id="privacy-summary">The short version</h2>
        <p>LeaguePilot uses adult account, contact, registration, team, and activity information to provide private youth-sports operations. Children do not create LeaguePilot accounts, and family access is controlled by parent or guardian accounts and league approval.</p>
        <p><strong>Your mobile information will not be sold or shared with third parties for promotional or marketing purposes.</strong></p>
      </section>

      <section>
        <h2>Information we collect</h2>
        <p>We may collect adult account and contact details, team-access requests, communication preferences, team and schedule activity, support messages, and technical information needed to secure and operate the service. Player information is limited to what the league needs to run approved youth-sports workflows and is displayed using privacy-conscious defaults.</p>
      </section>

      <section>
        <h2>How we use information</h2>
        <p>We use personal information to authenticate adult users, review team-access requests, provide schedules and team tools, deliver requested communications, support users, prevent abuse, maintain audit records, and comply with legal obligations. SMS consent does not grant access to private team information.</p>
      </section>

      <section>
        <h2>Mobile information and SMS consent</h2>
        <p><strong>We will not share or sell your mobile information or opt-in to an SMS campaign with any third party for purposes unrelated to providing you with the services of that campaign.</strong></p>
        <p>We may share your Personal Data, including your SMS opt-in or consent status, with third parties that help us provide our messaging services, including but not limited to platform providers, phone companies, and any other vendors who assist us in the delivery of text messages.</p>
        <p>Mobile information and SMS consent are not shared with third parties for their own promotional or marketing purposes.</p>
      </section>

      <section id="communications">
        <h2>Communications and opt-out</h2>
        <p>By providing your phone number and checking the SMS consent box, you agree to receive SMS messages from LeaguePilot about your team-access request and essential team updates. Message frequency may vary. Standard message and data rates may apply.</p>
        <ul>
          <li>Reply <strong>STOP</strong> to opt out of SMS messages.</li>
          <li>Reply <strong>HELP</strong> for help.</li>
          <li>SMS consent is optional and is not a condition of requesting team access or using LeaguePilot.</li>
        </ul>
      </section>

      <section>
        <h2>When information may be shared</h2>
        <p>We may share only the information needed with service providers acting on our behalf, league administrators authorized for the relevant organization, or authorities when legally required. Service providers may use information only to perform the services we request, subject to appropriate safeguards.</p>
      </section>

      <section>
        <h2>Child and family privacy</h2>
        <p>Children do not create LeaguePilot accounts. Parents and guardians control child access, private team spaces require approved adult access, and player names use privacy-conscious display conventions. League organizations remain responsible for their own notices, permissions, and legally required parental consent.</p>
      </section>

      <section>
        <h2>Security, retention, and choices</h2>
        <p>We use access controls, scoped permissions, audit records, and technical safeguards designed to protect personal information. We retain information only as needed for the service, league recordkeeping, safety, dispute resolution, and legal obligations. You may ask your league administrator to review or correct account-related information and may use the opt-out instructions above for SMS.</p>
      </section>

      <section id="contact">
        <h2>Contact</h2>
        <p>Questions about this policy or LeaguePilot privacy practices can be sent to <a href="mailto:privacy@leaguepilot.us">privacy@leaguepilot.us</a>.</p>
        <p><Link href="/terms">Read the Terms of Service</Link>.</p>
      </section>
    </article>
  );
}
