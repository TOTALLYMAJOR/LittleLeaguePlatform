import { CloudSunRain, Droplets, Wind, Zap } from "lucide-react";

const SEVERITY_LABEL: Record<string, string> = {
  watch: "Watch",
  delay: "Delay",
  cancel_risk: "Cancel risk"
};

/**
 * A weather-widget rendering of the real coach-facing alert (lib/domain/weather.ts,
 * WeatherAlert in lib/domain/contracts.ts: headline/detail/severity/status).
 * Presentation mimics a weather-channel card: conditions, temperature, wind,
 * precipitation. The copy keeps the app's honest drafts-for-review language
 * and never implies a message was sent to families.
 */
export function LandingWeatherNotification() {
  const severity = "delay";

  return (
    <aside className="landing-weather-card" aria-label="Example: a weather alert as a coach would see it in LeaguePilot">
      <header>
        <span className="landing-weather-card-icon" aria-hidden="true">LP</span>
        <span className="landing-weather-card-app">LeaguePilot · Weather</span>
        <span className="landing-weather-card-time">now</span>
      </header>

      <div className="landing-weather-conditions">
        <CloudSunRain className="landing-weather-glyph" aria-hidden="true" strokeWidth={1.7} />
        <div className="landing-weather-readout">
          <strong>68°</strong>
          <span>Rain showers · Field 2</span>
        </div>
        <span className={`landing-weather-card-severity is-${severity}`}>
          {SEVERITY_LABEL[severity]}
        </span>
      </div>

      <ul className="landing-weather-metrics">
        <li><Wind aria-hidden="true" size={15} /><span><em>Wind</em>14 mph</span></li>
        <li><Droplets aria-hidden="true" size={15} /><span><em>Rain</em>80%</span></li>
        <li><Zap aria-hidden="true" size={15} /><span><em>Lightning</em>9 mi</span></li>
      </ul>

      <p className="landing-weather-card-headline">Possible delay: Riverside Rockets</p>
      <p className="landing-weather-card-detail">
        Lightning within 10 miles of Field 2. Drafted for your review. Nothing sent to families yet.
      </p>
    </aside>
  );
}
