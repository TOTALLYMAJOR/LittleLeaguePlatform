import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AppStateProvider } from "@/app/providers";
import { TeamChatClient } from "./feature-panels";

describe("TeamChatClient", () => {
  it("renders the safe team chat read surface", () => {
    const html = renderToStaticMarkup(
      <AppStateProvider>
        <TeamChatClient />
      </AppStateProvider>
    );

    expect(html).toContain("Team Chat");
    expect(html).toContain("Pinned Reminder");
    expect(html).toContain("Coach Note");
    expect(html).toContain("Game-Day Questions");
    expect(html).toContain("No child accounts");
  });
});
