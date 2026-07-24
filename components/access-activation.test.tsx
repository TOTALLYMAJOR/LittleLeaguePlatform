import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AccessStatusClient, InviteRecoveryClient } from "./access-activation";

describe("access activation public surfaces", () => {
  it("starts status lookup without identity data and explains the privacy boundary", () => {
    const html = renderToStaticMarkup(<AccessStatusClient />);
    expect(html).toContain("See where your family request stands.");
    expect(html).toContain("Request reference");
    expect(html).toContain("same email");
    expect(html).toContain("masked child match");
    expect(html).not.toContain("sam@example.com");
    expect(html).not.toContain("invite token");
    expect(html).not.toContain("access grant");
  });

  it("keeps recovery enumeration-safe and does not claim a provider send", () => {
    const html = renderToStaticMarkup(<InviteRecoveryClient />);
    expect(html).toContain("Ask the league to review your invitation.");
    expect(html).toContain("result is the same whether or not a matching invitation exists");
    expect(html).toContain("does not resend a message");
    expect(html).not.toContain("Try sam@example.com");
    expect(html).not.toContain("raw token");
  });
});
