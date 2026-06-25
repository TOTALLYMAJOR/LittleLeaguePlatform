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
