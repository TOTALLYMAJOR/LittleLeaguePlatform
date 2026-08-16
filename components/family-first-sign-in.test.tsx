import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { seedState } from "@/lib/domain";
import { FamilyFirstSignInClient, FamilySettingsClient } from "./family-first-sign-in";

describe("FamilyFirstSignInClient", () => {
  it("separates language, critical, routine, consent, and provider truth", () => {
    const html = renderToStaticMarkup(<FamilyFirstSignInClient />);
    expect(html).toContain("Choose how LeaguePilot keeps your family informed.");
    expect(html).toContain("Preferred language");
    expect(html).toContain("Critical cancellations and safety updates");
    expect(html).toContain("Routine schedule and Replay updates");
    expect(html).toContain("Translations may contain errors");
    expect(html).toContain("does not confirm that the address or number is verified");
    expect(html).not.toContain("message was sent");
  });

  it("renders real family settings without claiming delivery or media consent", () => {
    const html = renderToStaticMarkup(
      <FamilySettingsClient dashboardData={{
        state: seedState,
        parentUserId: "user-parent-jordan",
        coachUserId: "user-coach-taylor",
        isSupabaseBacked: false,
        accessStatus: "live",
        message: "Preview settings."
      }} />
    );

    expect(html).toContain("Choose how family updates reach you.");
    expect(html).toContain("Save changes");
    expect(html).toContain("Quiet hours start");
    expect(html).toContain("Photos and media visibility");
    expect(html).toContain("never grant media consent");
    expect(html).toContain("Family access");
    expect(html).toContain("Account and sign out");
    expect(html).not.toContain("First sign-in");
  });
});
