import { describe, expect, it } from "vitest";
import { getProviderDeliveryReadiness, providerChannel } from "./provider-delivery";

describe("provider delivery hardening", () => {
  it("maps provider adapters to notification channels", () => {
    expect(providerChannel("email")).toBe("email");
    expect(providerChannel("sms")).toBe("sms");
    expect(providerChannel("web_push")).toBe("push");
  });

  it("keeps Web Push suppressed until VAPID keys are complete", () => {
    expect(getProviderDeliveryReadiness("web_push", {}).configured).toBe(false);
    expect(getProviderDeliveryReadiness("web_push", {
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: "public",
      VAPID_PRIVATE_KEY: "private",
      VAPID_SUBJECT: "mailto:ops@example.com"
    }).configured).toBe(true);
  });

  it("keeps email and SMS suppressed until provider credentials are complete", () => {
    expect(getProviderDeliveryReadiness("email", {}).configured).toBe(false);
    expect(getProviderDeliveryReadiness("email", { RESEND_API_KEY: "resend-key" }).configured).toBe(true);
    expect(getProviderDeliveryReadiness("sms", { TWILIO_ACCOUNT_SID: "sid", TWILIO_AUTH_TOKEN: "token" }).configured).toBe(false);
    expect(getProviderDeliveryReadiness("sms", {
      TWILIO_ACCOUNT_SID: "sid",
      TWILIO_AUTH_TOKEN: "token",
      TWILIO_MESSAGING_SERVICE_SID: "messaging-service"
    }).configured).toBe(true);
  });
});
