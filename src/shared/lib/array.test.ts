import { describe, expect, it } from 'vitest';
import { requireArrayItem } from './array';

describe('requireArrayItem', () => {
  it('returns an existing item', () => {
    expect(requireArrayItem(['first'], 0, 'fixture')).toBe('first');
  });

  it('rejects missing and sparse entries', () => {
    expect(() => requireArrayItem([], 0, 'fixture')).toThrow(RangeError);
    const sparse: string[] = [];
    sparse.length = 1;
    expect(() => requireArrayItem(sparse, 0, 'fixture')).toThrow(RangeError);
  });

  it('does not accept an inherited numeric property as an array entry', () => {
    const sparse: string[] = [];
    sparse.length = 1;
    Object.setPrototypeOf(sparse, { 0: 'inherited' });

    expect(() => requireArrayItem(sparse, 0, 'fixture')).toThrow(RangeError);
  });
});
