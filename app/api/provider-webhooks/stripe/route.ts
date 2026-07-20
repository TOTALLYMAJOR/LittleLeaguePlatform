import { NextResponse } from "next/server";
import { stripeClient } from "@/lib/services/stripe-connect";
import { processVerifiedStripeEvent } from "@/lib/supabase/payments";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature") ?? "";
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
  const rawBody = await request.text();
  if (!signature || !webhookSecret) {
    return NextResponse.json({ ok: false, message: "Stripe webhook verification is not configured." }, { status: 401 });
  }
  let event;
  try {
    event = stripeClient().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return NextResponse.json({ ok: false, message: "Stripe webhook signature verification failed." }, { status: 401 });
  }
  const result = await processVerifiedStripeEvent(event);
  return NextResponse.json(result, { status: result.ok ? 200 : 503 });
}
