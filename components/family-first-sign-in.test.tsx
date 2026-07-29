import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FamilyFirstSignInClient } from "./family-first-sign-in";

describe("FamilyFirstSignInClient", () => {
  it("separates language, critical, routine, consent, and provider truth", () => {
    const html = renderToStaticMarkup(<FamilyFirstSignInClient />);
    expect(html).toContain("Choose how LeaguePilot keeps your family informed.");
    expect(html).toContain("Preferred language");
    expect(html).toContain("Critical cancellations and safety updates");
    expect(html).toContain("Routine schedule and Replay updates");
    expect(html).toContain("Translations may contain errors");
    expect(html).toContain("does not prove the channel is verified");
    expect(html).not.toContain("message was sent");
  });
});
