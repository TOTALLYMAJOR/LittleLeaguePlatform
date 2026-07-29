export const waterBreakMinutePresets = [3, 5, 8] as const;

export function remainingWaterBreakSeconds(endsAt: number, now: number) {
  return Math.max(0, Math.ceil((endsAt - now) / 1000));
}

export function formatWaterBreakCountdown(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
