import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { InviteAcceptanceClient } from "./invite-acceptance";

describe("InviteAcceptanceClient", () => {
  it("starts without demo identity and explains scope separation", () => {
    const html = renderToStaticMarkup(<InviteAcceptanceClient />);
    expect(html).toContain("Confirm the child and team the league approved.");
    expect(html).toContain("Signing in proves identity");
    expect(html).toContain("One-time invitation code");
    expect(html).toContain("never included in analytics");
    expect(html).not.toContain("sam@example.com");
    expect(html).not.toContain("access grant");
  });
});
