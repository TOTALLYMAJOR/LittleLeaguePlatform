export function getTouchTargetQa() {
  return {
    minimumPixels: 44,
    status: "reviewed" as const,
    detail: "Primary buttons and controls should keep at least a 44px tap target on mobile."
  };
}

export function getOfflineStateSummary() {
  return {
    status: "scaffolded" as const,
    detail: "Offline fallback is read-only and does not replay RSVPs, chat posts, provider sends, or private data fetches."
  };
}

export function getCacheInvalidationPolicy() {
  return {
    strategy: "stale_while_revalidate",
    detail: "Invalidate roster, schedule, chat, media, and notification caches after authenticated writes."
  };
}

export function getManualDarkToggleState(enabled = false) {
  return {
    enabled,
    label: enabled ? "Dark mode on" : "System theme"
  };
}

export function getAccessibilityContrastChecks() {
  return [
    { surface: "primary buttons", status: "reviewed" as const },
    { surface: "badges", status: "reviewed" as const },
    { surface: "cards", status: "reviewed" as const }
  ];
}
