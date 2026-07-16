import { NextResponse } from "next/server";
import {
  normalizeSendGridEvent,
  verifySendGridWebhookSignature
} from "@/lib/services/notifications/webhooks";
import { reconcileProviderWebhookEvents } from "@/lib/supabase/provider-webhooks";

export async function POST(request: Request) {
  const publicKey = process.env.SENDGRID_WEBHOOK_PUBLIC_KEY;
  if (!publicKey) {
    return NextResponse.json({ ok: false, message: "SendGrid webhook public key is not configured." }, { status: 503 });
  }

  const rawBody = await request.text();
  const timestamp = request.headers.get("x-twilio-email-event-webhook-timestamp") ?? "";
  const signature = request.headers.get("x-twilio-email-event-webhook-signature") ?? "";
  const verified = verifySendGridWebhookSignature({
    publicKey,
    timestamp,
    signature,
    rawBody
  });
  if (!verified) {
    return NextResponse.json({ ok: false, message: "SendGrid webhook signature is invalid." }, { status: 401 });
  }

  const body = JSON.parse(rawBody) as unknown;
  if (!Array.isArray(body)) {
    return NextResponse.json({ ok: false, message: "SendGrid webhook body must be an event array." }, { status: 400 });
  }

  const events = body
    .filter((event): event is Record<string, unknown> => Boolean(event && typeof event === "object"))
    .map((event) => normalizeSendGridEvent(event));
  const result = await reconcileProviderWebhookEvents(events);

  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
