import { createSupabaseAdminClient } from "./admin";
import { withSupabaseTimeout } from "./timeout";

export async function getFamilyOnboardingStatus(userId: string) {
  if (!userId) return { available: false, completed: false };
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await withSupabaseTimeout(
      supabase.from("profiles").select("onboarding_completed_at").eq("id", userId).maybeSingle(),
      5000
    );
    if (error || !data) return { available: false, completed: false };
    return { available: true, completed: Boolean(data.onboarding_completed_at) };
  } catch {
    return { available: false, completed: false };
  }
}

export async function completeFamilyFirstSignIn(input: {
  userId: string;
  language: string;
  criticalChannel: "push" | "email" | "sms";
  routineChannel: "push" | "email" | "sms";
  quietHoursStart: string;
  quietHoursEnd: string;
  timezone: string;
  translationEnabled: boolean;
  sharedDevicePreviews: boolean;
}) {
  if (
    !input.userId ||
    !/^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(input.language) ||
    !["push", "email", "sms"].includes(input.criticalChannel) ||
    !["push", "email", "sms"].includes(input.routineChannel) ||
    !/^\d{2}:\d{2}$/.test(input.quietHoursStart) ||
    !/^\d{2}:\d{2}$/.test(input.quietHoursEnd) ||
    input.timezone.trim().length < 3
  ) {
    return { ok: false, message: "Language, channels, quiet hours, and timezone are required." };
  }
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await withSupabaseTimeout(supabase.rpc("complete_family_first_sign_in", {
      target_user_id: input.userId,
      selected_language: input.language,
      selected_critical_channel: input.criticalChannel,
      selected_routine_channel: input.routineChannel,
      selected_quiet_hours_start: input.quietHoursStart,
      selected_quiet_hours_end: input.quietHoursEnd,
      selected_timezone: input.timezone,
      enable_translation: input.translationEnabled,
      enable_shared_device_previews: input.sharedDevicePreviews
    }), 10000);
    if (error) return { ok: false, message: "Preferences could not be saved. Ask the league to confirm setup is available." };
    return {
      ok: true,
      message: "Preferences saved. Provider delivery remains subject to channel verification, consent, and league delivery readiness.",
      result: data
    };
  } catch {
    return { ok: false, message: "Preferences could not reach league records. Try again." };
  }
}
