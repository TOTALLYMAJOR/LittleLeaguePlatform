import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { verifyTwilioStatusWebhook } from "@/lib/services/notifications/webhook-verification";
import { recordVerifiedProviderWebhook } from "@/lib/supabase/provider-webhooks";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const parameters = Object.fromEntries(new URLSearchParams(rawBody).entries());
  const signature = request.headers.get("x-twilio-signature") ?? "";
  const authToken = process.env.TWILIO_AUTH_TOKEN ?? "";
  const callbackUrl = process.env.TWILIO_STATUS_CALLBACK_URL ?? request.url;
  if (!verifyTwilioStatusWebhook({ authToken, signature, url: callbackUrl, parameters })) {
    return NextResponse.json({ ok: false, message: "Twilio webhook signature verification failed." }, { status: 401 });
  }
  const providerMessageId = parameters.MessageSid ?? "";
  const eventType = parameters.MessageStatus ?? "";
  if (!providerMessageId || !eventType) {
    return NextResponse.json({ ok: false, message: "Twilio delivery status is incomplete." }, { status: 400 });
  }
  const providerEventId = createHash("sha256")
    .update(`${providerMessageId}:${eventType}:${parameters.ErrorCode ?? ""}`)
    .digest("hex");
  const result = await recordVerifiedProviderWebhook({
    provider: "twilio",
    providerEventId,
    providerMessageId,
    eventType,
    payload: parameters,
    signatureVerifiedAt: new Date().toISOString()
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 503 });
}
