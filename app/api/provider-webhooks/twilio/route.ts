import { NextResponse } from "next/server";
import {
  normalizeTwilioStatusCallback,
  verifyTwilioWebhookSignature
} from "@/lib/services/notifications/webhooks";
import { reconcileProviderWebhookEvents } from "@/lib/supabase/provider-webhooks";

function callbackUrl(request: Request) {
  return process.env.TWILIO_STATUS_CALLBACK_URL || request.url;
}

export async function POST(request: Request) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    return NextResponse.json({ ok: false, message: "Twilio auth token is not configured." }, { status: 503 });
  }

  const rawBody = await request.text();
  const params = new URLSearchParams(rawBody);
  const signature = request.headers.get("x-twilio-signature") ?? "";
  const verified = verifyTwilioWebhookSignature({
    authToken,
    url: callbackUrl(request),
    params,
    signature
  });
  if (!verified) {
    return NextResponse.json({ ok: false, message: "Twilio webhook signature is invalid." }, { status: 401 });
  }

  const result = await reconcileProviderWebhookEvents([
    normalizeTwilioStatusCallback(params)
  ]);

  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
