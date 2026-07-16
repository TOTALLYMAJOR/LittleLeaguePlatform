import {
  claimQueuedNotificationDeliveries,
  recordNotificationDeliveryOutcome
} from "@/lib/supabase/provider-delivery";
import { createNotificationProviderAdapters } from "./adapters";
import { runNotificationSendWorker } from "./worker";

export async function runNotificationProviderSendWorker(input: {
  workerId: string;
  limit?: number;
  now?: Date;
  env?: Partial<NodeJS.ProcessEnv>;
  fetch?: typeof fetch;
}) {
  const now = input.now ?? new Date();
  const claimed = await claimQueuedNotificationDeliveries({
    workerId: input.workerId,
    limit: input.limit,
    now: now.toISOString()
  });

  if (!claimed.ok) {
    return {
      ok: false,
      message: claimed.message,
      claimed: 0,
      sent: 0,
      failed: 0,
      suppressed: 0,
      retrying: 0,
      deadLettered: 0,
      outcomes: []
    };
  }

  const result = await runNotificationSendWorker({
    loadAttempts: async () => claimed.attempts,
    recordOutcome: async (outcome) => {
      const recorded = await recordNotificationDeliveryOutcome(outcome);
      if (!recorded.ok) throw new Error(recorded.message);
    },
    adapters: createNotificationProviderAdapters({
      env: input.env,
      fetch: input.fetch
    }),
    now
  });

  return {
    ok: true,
    message: `${result.claimed} notification delivery attempt(s) processed by provider worker.`,
    ...result
  };
}
