import { ArrowRight, CloudSunRain } from "lucide-react";

const SEVERITY_LABEL: Record<string, string> = {
  watch: "Watch",
  delay: "Delay",
  cancel_risk: "Cancel risk"
};

/**
 * A weather-widget rendering of the real coach-facing alert (lib/domain/weather.ts,
 * WeatherAlert in lib/domain/contracts.ts: headline/detail/severity/status).
 * The copy keeps the app's honest drafts-for-review language and never implies
 * live provider data or a message sent to families.
 */
export function LandingWeatherNotification() {
  const severity = "delay";

  return (
    <aside className="landing-weather-card" aria-label="Example: a weather alert as a coach would see it in LeaguePilot">
      <header>
        <span className="landing-weather-card-icon" aria-hidden="true">LP</span>
        <span className="landing-weather-card-app">LeaguePilot · Game-day weather</span>
        <span className="landing-weather-card-time">Example</span>
      </header>

      <div className="landing-weather-conditions">
        <CloudSunRain className="landing-weather-glyph" aria-hidden="true" strokeWidth={1.7} />
        <div className="landing-weather-readout">
          <span>Riverside Rockets</span>
          <strong>Possible delay at Field 2</strong>
        </div>
        <span className={`landing-weather-card-severity is-${severity}`}>
          {SEVERITY_LABEL[severity]} review
        </span>
      </div>

      <ol className="landing-weather-flow" aria-label="Weather alert review flow">
        <li><span>1</span>Weather check</li>
        <ArrowRight aria-hidden="true" size={14} />
        <li><span>2</span>Coach review</li>
        <ArrowRight aria-hidden="true" size={14} />
        <li><span>3</span>Family alert</li>
      </ol>

      <p className="landing-weather-card-detail">
        <strong>Drafted for your review.</strong> Nothing sent to families yet.
      </p>
    </aside>
  );
}
