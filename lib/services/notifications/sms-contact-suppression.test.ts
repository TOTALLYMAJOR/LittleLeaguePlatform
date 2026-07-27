import { describe, expect, it } from "vitest";
import {
  createSmsContactFingerprint,
  normalizeSmsRecipient,
  smsContactDigestSecretReady
} from "./sms-contact-suppression";

describe("SMS contact suppression identity", () => {
  it("accepts only normalized E.164 recipients", () => {
    expect(normalizeSmsRecipient("+13125550123")).toBe("+13125550123");
    expect(normalizeSmsRecipient("312-555-0123")).toBeNull();
    expect(normalizeSmsRecipient("+0123456789")).toBeNull();
  });

  it("requires a dedicated high-entropy digest secret", () => {
    expect(smsContactDigestSecretReady("short")).toBe(false);
    expect(smsContactDigestSecretReady("x".repeat(32))).toBe(true);
  });

  it("creates a keyed fingerprint without returning the raw phone number", () => {
    const fingerprint = createSmsContactFingerprint({
      organizationId: "organization-1",
      userId: "user-1",
      phone: "+13125550123",
      secret: "test-only-contact-digest-secret-123456"
    });

    expect(fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(fingerprint).not.toContain("3125550123");
  });
});
