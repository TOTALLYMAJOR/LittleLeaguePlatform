import { AuthClient } from "@/components/feature-panels";

function resolveAuthLandingMessage(input: {
  oauth?: string;
  error?: string;
  error_description?: string;
  provider?: string;
}) {
  if (input.oauth === "complete" && !input.error) {
    return "Sign-in is complete. Opening your dashboard...";
  }

  if (!input.error) return "";
  const provider = input.provider === "google" || input.provider === "facebook" ? input.provider : "identity provider";
  const providerLabel = provider === "google" ? "Google" : provider === "facebook" ? "Facebook" : "identity provider";
  const error = input.error.toLowerCase();

  if (error === "missing_oauth_code") {
    return `${providerLabel} sign-in did not return a callback code. Check the OAuth redirect URL for ${providerLabel} and retry.`;
  }
  if (error === "oauth_exchange_failed") {
    return `${providerLabel} sign-in exchange failed. Check ${providerLabel} app keys and callback URL settings for LeaguePilot, then retry.`;
  }
  if (error === "access_denied") {
    return `You canceled ${providerLabel} sign in.`;
  }

  if (input.error_description) {
    return `${providerLabel} sign-in failed: ${input.error_description}`;
  }

  return `${providerLabel} sign-in failed. Use email sign-in instead.`;
}

export default async function AuthPage({
  searchParams
}: {
  searchParams: Promise<{
    returnTo?: string;
    error?: string;
    error_description?: string;
    oauth?: string;
    provider?: string;
  }>;
}) {
  const { returnTo = "", error, error_description, oauth, provider } = await searchParams;
  const safeReturnTo = returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "";
  const message = resolveAuthLandingMessage({ error, error_description, oauth, provider });
  return <AuthClient returnTo={safeReturnTo} initialMessage={message} />;
}
