const SEVERITY_LABEL: Record<string, string> = {
  watch: "Watch",
  delay: "Delay",
  cancel_risk: "Cancel risk"
};

function RainShowerIcon() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false" className="landing-weather-glyph">
      <circle cx="43" cy="20" r="9" fill="#f2c14e" />
      <path
        d="M18 38a11 11 0 0 1 1.6-21.9A15 15 0 0 1 47 22a10 10 0 0 1-1 16z"
        fill="#8ba6bd"
      />
      <g stroke="#4da3ff" strokeWidth="4" strokeLinecap="round">
        <path d="M20 46l-3 8M31 46l-3 8M42 46l-3 8" />
      </g>
    </svg>
  );
}

function WindIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" width="15" height="15">
      <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M3 8h10a3 3 0 1 0-3-3" />
        <path d="M3 13h14a3 3 0 1 1-3 3" />
        <path d="M3 18h7" />
      </g>
    </svg>
  );
}

function DropIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" width="15" height="15">
      <path
        d="M12 3s6 7.2 6 11a6 6 0 0 1-12 0c0-3.8 6-11 6-11z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" width="15" height="15">
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * A weather-widget rendering of the real coach-facing alert (lib/domain/weather.ts,
 * WeatherAlert in lib/domain/contracts.ts: headline/detail/severity/status).
 * Presentation mimics a weather-channel card — conditions, temperature, wind,
 * precipitation — but the copy keeps the app's honest drafts-for-review language
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
        <RainShowerIcon />
        <div className="landing-weather-readout">
          <strong>68°</strong>
          <span>Rain showers · Field 2</span>
        </div>
        <span className={`landing-weather-card-severity is-${severity}`}>
          {SEVERITY_LABEL[severity]}
        </span>
      </div>

      <ul className="landing-weather-metrics">
        <li><WindIcon /><span><em>Wind</em>14 mph</span></li>
        <li><DropIcon /><span><em>Rain</em>80%</span></li>
        <li><BoltIcon /><span><em>Lightning</em>9 mi</span></li>
      </ul>

      <p className="landing-weather-card-headline">Possible delay — Riverside Rockets</p>
      <p className="landing-weather-card-detail">
        Lightning within 10 miles of Field 2. Drafted for your review—nothing sent to families yet.
      </p>
    </aside>
  );
}
