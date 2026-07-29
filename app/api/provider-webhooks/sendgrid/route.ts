import { NextResponse } from "next/server";
import { verifySendGridEventWebhook } from "@/lib/services/notifications/webhook-verification";
import { recordVerifiedProviderWebhook } from "@/lib/supabase/provider-webhooks";

type SendGridEvent = {
  event?: unknown;
  sg_event_id?: unknown;
  sg_message_id?: unknown;
  timestamp?: unknown;
};

export async function POST(request: Request) {
  const rawBody = await request.text();
  const timestamp = request.headers.get("x-twilio-email-event-webhook-timestamp") ?? "";
  const signature = request.headers.get("x-twilio-email-event-webhook-signature") ?? "";
  const publicKey = process.env.SENDGRID_EVENT_WEBHOOK_PUBLIC_KEY ?? "";
  if (!publicKey || !verifySendGridEventWebhook({ rawBody, timestamp, signature, publicKey })) {
    return NextResponse.json({ ok: false, message: "SendGrid webhook signature verification failed." }, { status: 401 });
  }
  const events = JSON.parse(rawBody) as SendGridEvent[];
  if (!Array.isArray(events)) {
    return NextResponse.json({ ok: false, message: "SendGrid webhook payload must be an event array." }, { status: 400 });
  }
  const verifiedAt = new Date().toISOString();
  const results = [];
  for (const event of events.slice(0, 100)) {
    const providerEventId = String(event.sg_event_id ?? "");
    const providerMessageId = String(event.sg_message_id ?? "").split(".")[0] ?? "";
    const eventType = String(event.event ?? "");
    if (!providerEventId || !providerMessageId || !eventType) continue;
    results.push(await recordVerifiedProviderWebhook({
      provider: "sendgrid",
      providerEventId,
      providerMessageId,
      eventType,
      payload: event as Record<string, unknown>,
      signatureVerifiedAt: verifiedAt
    }));
  }
  return NextResponse.json({
    ok: results.every((result) => result.ok),
    message: `${results.length} verified SendGrid event(s) processed.`,
    results
  });
}
