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
