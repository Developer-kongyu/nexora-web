/**
 * Returns an existing array entry or fails with a descriptive range error.
 * This keeps indexed access explicit when `noUncheckedIndexedAccess` is enabled.
 */
export function requireArrayItem<T>(
  items: readonly T[],
  index: number,
  label = 'array item',
): T {
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= items.length ||
    !Object.hasOwn(items, index)
  ) {
    throw new RangeError(`${label} is unavailable at index ${index}`);
  }
  return items[index] as T;
}
