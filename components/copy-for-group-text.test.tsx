import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CopyForGroupText, buildGroupTextMessage } from "./copy-for-group-text";

describe("buildGroupTextMessage", () => {
  it("names the event and the players without any rate or history", () => {
    const message = buildGroupTextMessage({
      eventTitle: "Saturday practice, 5:30 PM",
      playerDisplayNames: ["Maya R.", "Owen P."]
    });
    expect(message).toContain("Saturday practice, 5:30 PM");
    expect(message).toContain("Maya R. & Owen P.");
    expect(message).not.toMatch(/rate|score|ignored|late|worst/i);
  });

  it("degrades to a neutral phrase when no players are supplied", () => {
    const message = buildGroupTextMessage({ eventTitle: "Sunday game", playerDisplayNames: [] });
    expect(message).toContain("a few families");
  });
});

describe("CopyForGroupText", () => {
  it("renders a secondary button that never auto-sends", () => {
    const html = renderToStaticMarkup(<CopyForGroupText text="hello team" />);
    expect(html).toContain("Copy for group text");
    expect(html).toContain('type="button"');
    expect(html).toContain("secondary");
  });
});
