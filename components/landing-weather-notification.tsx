const SEVERITY_LABEL: Record<string, string> = {
  watch: "Watch",
  delay: "Delay",
  cancel_risk: "Cancel risk"
};

/**
 * A mockup of the real coach-facing weather alert (lib/domain/weather.ts,
 * WeatherAlert in lib/domain/contracts.ts: headline/detail/severity/status).
 * Copy mirrors the app's honest drafts-for-review language established for
 * the coach dashboard — never implies a message was sent to families.
 */
export function LandingWeatherNotification() {
  const severity = "delay";

  return (
    <aside className="landing-weather-card" aria-label="Example: a weather alert as a coach would see it in LeaguePilot">
      <header>
        <span className="landing-weather-card-icon" aria-hidden="true">
          LP
        </span>
        <span className="landing-weather-card-app">LeaguePilot · Weather</span>
        <span className="landing-weather-card-time">now</span>
      </header>
      <p className="landing-weather-card-headline">
        Possible delay — Riverside Rockets
      </p>
      <p className="landing-weather-card-detail">
        Lightning within 10 miles of Field 2. Drafted for your review—nothing sent to families yet.
      </p>
      <span className={`landing-weather-card-severity is-${severity}`}>
        {SEVERITY_LABEL[severity]}
      </span>
    </aside>
  );
}
