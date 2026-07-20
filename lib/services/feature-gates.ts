export type LeagueFeatureGate =
  | "offline_writes"
  | "provider_sends"
  | "media_uploads"
  | "payments";

const environmentKeys: Record<LeagueFeatureGate, string> = {
  offline_writes: "OFFLINE_WRITES_ENABLED",
  provider_sends: "PROVIDER_SENDS_ENABLED",
  media_uploads: "MEDIA_UPLOADS_ENABLED",
  payments: "PAYMENTS_ENABLED"
};

export function environmentFeatureEnabled(
  feature: LeagueFeatureGate,
  env: Partial<NodeJS.ProcessEnv> = process.env
) {
  return env[environmentKeys[feature]] === "true";
}

export function featureGateDecision(input: {
  feature: LeagueFeatureGate;
  organizationEnabled: boolean | null | undefined;
  env?: Partial<NodeJS.ProcessEnv>;
}) {
  const environmentEnabled = environmentFeatureEnabled(input.feature, input.env);
  const organizationEnabled = input.organizationEnabled === true;
  return {
    enabled: environmentEnabled && organizationEnabled,
    environmentEnabled,
    organizationEnabled,
    reason: !environmentEnabled
      ? `${input.feature} is disabled by the environment kill switch.`
      : !organizationEnabled
        ? `${input.feature} is disabled for this organization.`
        : `${input.feature} is enabled by both required gates.`
  };
}
