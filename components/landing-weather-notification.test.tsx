import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LandingWeatherNotification } from "./landing-weather-notification";

describe("LandingWeatherNotification", () => {
  it("renders server-side with no client JS required", () => {
    const html = renderToStaticMarkup(<LandingWeatherNotification />);
    expect(html).toContain("LeaguePilot");
    expect(html).toContain("Weather");
  });

  it("uses honest drafts-for-review copy, never implying a message was sent", () => {
    const html = renderToStaticMarkup(<LandingWeatherNotification />);
    expect(html).toContain("Drafted for your review");
    expect(html).toContain("nothing sent to families yet");
    expect(html).not.toMatch(/\bsent to families\b(?! yet)/);
  });

  it("uses a real WeatherAlert severity value as its badge", () => {
    const html = renderToStaticMarkup(<LandingWeatherNotification />);
    expect(html).toMatch(/is-(watch|delay|cancel_risk)/);
  });
});
