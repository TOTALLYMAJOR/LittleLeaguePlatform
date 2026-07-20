import { createConfiguredNotificationAdapters } from "./adapters";
import { runNotificationSendWorker } from "./worker";
import {
  claimQueuedNotificationDeliveries,
  recordNotificationDeliveryOutcome
} from "@/lib/supabase/provider-delivery";

export async function executeApprovedNotificationBatch(input: {
  workerId: string;
  limit?: number;
  env?: Partial<NodeJS.ProcessEnv>;
}) {
  const claimed = await claimQueuedNotificationDeliveries({
    workerId: input.workerId,
    limit: input.limit
  });
  if (!claimed.ok) {
    return {
      ok: false,
      message: claimed.message,
      attempted: 0,
      sent: 0,
      failed: 0,
      deadLettered: 0,
      outcomes: []
    };
  }
  const summary = await runNotificationSendWorker({
    loadAttempts: async () => claimed.attempts,
    recordOutcome: async (outcome) => {
      const result = await recordNotificationDeliveryOutcome(outcome);
      if (!result.ok) throw new Error(result.message);
    },
    adapters: createConfiguredNotificationAdapters(input.env)
  });
  return {
    ok: true,
    message: `${summary.attempted} approved provider attempt(s) processed. Accepted does not mean delivered.`,
    ...summary
  };
}
