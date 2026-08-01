import { describe, expect, it } from 'vitest';
import { trimToNull } from './text';

describe('trimToNull', () => {
  it('normalizes blank text to null and trims meaningful text', () => {
    expect(trimToNull('   ')).toBeNull();
    expect(trimToNull(' 台北 ')).toBe('台北');
  });
});
