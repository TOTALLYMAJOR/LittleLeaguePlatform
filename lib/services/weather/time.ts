export function findClosestByTime<T>(items: T[], getTime: (item: T) => string | undefined, targetTime: string) {
  const target = parseProviderTime(targetTime);
  if (!target) return undefined;

  return items.reduce<T | undefined>((closest, item) => {
    const itemTime = parseProviderTime(getTime(item));
    if (!itemTime) return closest;
    if (!closest) return item;

    const closestTime = parseProviderTime(getTime(closest));
    if (!closestTime) return item;

    const itemDistance = Math.abs(itemTime.getTime() - target.getTime());
    const closestDistance = Math.abs(closestTime.getTime() - target.getTime());
    return itemDistance < closestDistance ? item : closest;
  }, undefined);
}

export function parseProviderTime(value?: string) {
  if (!value) return undefined;
  const isoLikeWithoutZone = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/;
  const parsed = new Date(isoLikeWithoutZone.test(value) ? `${value}Z` : value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed;
}
