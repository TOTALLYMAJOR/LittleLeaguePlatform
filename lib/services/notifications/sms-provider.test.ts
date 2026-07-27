import { describe, expect, it } from "vitest";
import { createConfiguredNotificationAdapters } from "./adapters";
import { resolveSmsProvider } from "./sms-provider";

function selectedSmsTransport(env: Partial<NodeJS.ProcessEnv>) {
  return createConfiguredNotificationAdapters(env)
    .find((adapter) => adapter.provider === "sms")
    ?.transportProvider;
}

describe("SMS provider selection", () => {
  it("accepts only exact explicit provider names", () => {
    expect(resolveSmsProvider({ SMS_PROVIDER: "pingram" })).toBe("pingram");
    expect(resolveSmsProvider({ SMS_PROVIDER: "twilio" })).toBe("twilio");
    expect(resolveSmsProvider({ SMS_PROVIDER: "PINGRAM" })).toBeNull();
    expect(resolveSmsProvider({ SMS_PROVIDER: " pingram " })).toBeNull();
    expect(resolveSmsProvider({ SMS_PROVIDER: "" })).toBeNull();
    expect(resolveSmsProvider({})).toBeNull();
  });

  it("does not select a provider from credential presence", () => {
    expect(resolveSmsProvider({
      PINGRAM_API_KEY: "pingram_sk_test",
      TWILIO_ACCOUNT_SID: "AC_test"
    })).toBeNull();
    expect(selectedSmsTransport({
      PINGRAM_API_KEY: "pingram_sk_test",
      TWILIO_ACCOUNT_SID: "AC_test"
    })).toBeUndefined();
  });

  it("selects Pingram explicitly and preserves Twilio rollback", () => {
    expect(selectedSmsTransport({ SMS_PROVIDER: "pingram" })).toBe("pingram");
    expect(selectedSmsTransport({ SMS_PROVIDER: "twilio" })).toBe("twilio");
  });
});
