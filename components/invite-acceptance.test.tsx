import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { InviteAcceptanceClient, resolvePendingInviteToken } from "./invite-acceptance";

describe("parent invitation fragment compatibility", () => {
  it("starts without demo identity and explains scope separation", () => {
    const html = renderToStaticMarkup(<InviteAcceptanceClient />);
    expect(html).toContain("Confirm the child and team the league approved.");
    expect(html).toContain("Signing in proves identity");
    expect(html).toContain("One-time invitation code");
    expect(html).toContain("never included in analytics");
    expect(html).toContain("Set up your parent account");
    expect(html).toContain("Full name");
    expect(html).toContain("Invited email");
    expect(html).toContain("Mobile phone");
    expect(html).toContain("Password");
    expect(html).toContain("Create account");
    expect(html).toContain("agree to receive recurring SMS messages from LeaguePilot");
    expect(html).toContain("schedule changes, cancellations, and weather alerts");
    expect(html).toContain("Message frequency may vary");
    expect(html).toContain("Reply STOP to opt out");
    expect(html).toContain("Reply HELP for help");
    expect(html).toContain("Consent is not a condition of creating an account, accepting this invitation, or using LeaguePilot");
    expect(html).toContain('href="/terms"');
    expect(html).toContain('href="/privacy"');
    expect(html).toContain("Already have an account?");
    expect(html).not.toContain("sam@example.com");
    expect(html).not.toContain("access grant");
  });

  it("reads the token fragment emitted by registration approval", () => {
    expect(resolvePendingInviteToken("#token=registration-secret", "")).toBe("registration-secret");
  });

  it("continues to accept the code fragment and a pending session token", () => {
    expect(resolvePendingInviteToken("#code=one-time-code", "stored-secret")).toBe("one-time-code");
    expect(resolvePendingInviteToken("", "stored-secret")).toBe("stored-secret");
  });
});
