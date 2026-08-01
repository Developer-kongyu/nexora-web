export function trimToNull(value: string): string | null {
  const normalized = value.trim();
  return normalized || null;
}
