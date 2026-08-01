import { describe, expect, it } from 'vitest';
import { isDateOnly } from './date';

describe('isDateOnly', () => {
  it('accepts real calendar dates in YYYY-MM-DD format', () => {
    expect(isDateOnly('2024-02-29')).toBe(true);
    expect(isDateOnly('1996-08-21')).toBe(true);
  });

  it('rejects impossible or non-canonical dates', () => {
    expect(isDateOnly('2026-02-30')).toBe(false);
    expect(isDateOnly('2026-2-03')).toBe(false);
    expect(isDateOnly('not-a-date')).toBe(false);
  });
});
