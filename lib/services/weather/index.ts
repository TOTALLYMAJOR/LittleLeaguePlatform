import { nationalWeatherServiceProvider } from "./national-weather-service";
import { openMeteoProvider } from "./open-meteo";
import { tomorrowIoProvider } from "./tomorrow-io";
import type { WeatherProvider, WeatherProviderConfig, WeatherProviderEventInput, WeatherProviderForecast } from "./types";

export * from "./types";
export * from "./normalization";
export { nationalWeatherServiceProvider } from "./national-weather-service";
export { openMeteoProvider } from "./open-meteo";
export { tomorrowIoProvider } from "./tomorrow-io";

export const weatherProviders: WeatherProvider[] = [
  nationalWeatherServiceProvider,
  openMeteoProvider,
  tomorrowIoProvider
];

export function getEnabledWeatherProviders(config?: WeatherProviderConfig) {
  return weatherProviders.filter((provider) => provider.enabled(config));
}

export async function getWeatherEventDraft(
  input: WeatherProviderEventInput,
  config?: WeatherProviderConfig,
  providers: WeatherProvider[] = weatherProviders
) {
  for (const provider of providers) {
    if (!provider.enabled(config)) continue;
    const result = await provider.getEventWeather(input, config);
    if (result) return enforceDraftWeatherResult(result);
  }

  return null;
}

function enforceDraftWeatherResult(result: WeatherProviderForecast): WeatherProviderForecast {
  return {
    ...result,
    draft: {
      ...result.draft,
      status: "draft"
    }
  };
}
