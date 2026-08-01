export function toggleArrayValue<T>(current: readonly T[], value: T): T[] {
  return current.includes(value)
    ? current.filter((item) => item !== value)
    : [...current, value];
}

export function toggleSetValue<T>(current: ReadonlySet<T>, value: T): Set<T> {
  const next = new Set(current);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

export function retainSetValues<T>(
  current: ReadonlySet<T>,
  allowedValues: Iterable<T>,
): Set<T> {
  const allowed = new Set(allowedValues);
  return new Set([...current].filter((value) => allowed.has(value)));
}

export function uniqueItemsBy<T, TKey>(
  items: Iterable<T>,
  getKey: (item: T) => TKey,
): T[] {
  const seen = new Set<TKey>();
  const unique: T[] = [];
  for (const item of items) {
    const key = getKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }
  return unique;
}
