export const SMS_PROVIDERS = ["twilio", "pingram"] as const;

export type SmsProvider = (typeof SMS_PROVIDERS)[number];

export function resolveSmsProvider(
  env: Partial<NodeJS.ProcessEnv> = process.env
): SmsProvider | null {
  const provider = env.SMS_PROVIDER;
  return provider === "twilio" || provider === "pingram" ? provider : null;
}
