import { createPublicKey, verify } from "node:crypto";
import twilio from "twilio";

export function verifySendGridEventWebhook(input: {
  rawBody: string;
  timestamp: string;
  signature: string;
  publicKey: string;
}) {
  try {
    const key = createPublicKey(input.publicKey.replace(/\\n/g, "\n"));
    const signedPayload = Buffer.concat([
      Buffer.from(input.timestamp, "utf8"),
      Buffer.from(input.rawBody, "utf8")
    ]);
    return verify(
      "sha256",
      signedPayload,
      key,
      Buffer.from(input.signature, "base64")
    );
  } catch {
    return false;
  }
}

export function verifyTwilioStatusWebhook(input: {
  authToken: string;
  signature: string;
  url: string;
  parameters: Record<string, string>;
}) {
  if (!input.authToken || !input.signature || !input.url) return false;
  return twilio.validateRequest(
    input.authToken,
    input.signature,
    input.url,
    input.parameters
  );
}
