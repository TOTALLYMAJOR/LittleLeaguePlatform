import { describe, expect, it } from "vitest";
import { featureGateDecision } from "./feature-gates";

describe("organization and environment feature gates", () => {
  it("fails closed unless both gates are true", () => {
    expect(featureGateDecision({
      feature: "provider_sends",
      organizationEnabled: true,
      env: { PROVIDER_SENDS_ENABLED: "false" }
    }).enabled).toBe(false);
    expect(featureGateDecision({
      feature: "provider_sends",
      organizationEnabled: false,
      env: { PROVIDER_SENDS_ENABLED: "true" }
    }).enabled).toBe(false);
    expect(featureGateDecision({
      feature: "provider_sends",
      organizationEnabled: true,
      env: { PROVIDER_SENDS_ENABLED: "true" }
    }).enabled).toBe(true);
  });
});
