import Stripe from "stripe";

export function stripeClient(env: Partial<NodeJS.ProcessEnv> = process.env) {
  if (!env.STRIPE_SECRET_KEY) throw new Error("Stripe server key is not configured.");
  return new Stripe(env.STRIPE_SECRET_KEY, {
    maxNetworkRetries: 2,
    timeout: 10_000
  });
}

export function stripeConnectReadiness(env: Partial<NodeJS.ProcessEnv> = process.env) {
  const configured = Boolean(
    env.STRIPE_SECRET_KEY
    && env.STRIPE_WEBHOOK_SECRET
    && env.STRIPE_CONNECT_RETURN_URL
    && env.STRIPE_CONNECT_REFRESH_URL
  );
  return {
    configured,
    reason: configured
      ? "Stripe Connect server and webhook configuration are present. Organization and environment payment gates still apply."
      : "Stripe Connect server or webhook configuration is incomplete."
  };
}
