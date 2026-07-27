import { createHmac } from "node:crypto";

export function normalizeSmsRecipient(phone: string | null | undefined) {
  const value = phone?.trim() ?? "";
  return /^\+[1-9]\d{7,14}$/.test(value) ? value : null;
}

export function smsContactDigestSecretReady(secret: string | null | undefined) {
  return Boolean(secret && secret.length >= 32);
}

export function createSmsContactFingerprint(input: {
  organizationId: string;
  userId: string;
  phone: string;
  secret: string;
}) {
  return createHmac("sha256", input.secret)
    .update(`${input.organizationId}.${input.userId}.${input.phone}`, "utf8")
    .digest("hex");
}
