import { describe, expect, it } from 'vitest';
import { settleBatch } from './settleBatch';

describe('settleBatch', () => {
  it('preserves input order and retains individual failures', async () => {
    const result = await settleBatch(
      ['a', 'b', 'c'],
      (value) =>
        value === 'b'
          ? Promise.reject(new Error('failed'))
          : Promise.resolve(value.toUpperCase()),
      2,
    );

    expect(result[0]).toEqual({ input: 'a', status: 'fulfilled', value: 'A' });
    expect(result[1]).toMatchObject({ input: 'b', status: 'rejected' });
    expect(result[2]).toEqual({ input: 'c', status: 'fulfilled', value: 'C' });
  });

  it('rejects invalid concurrency instead of silently running unbounded', async () => {
    await expect(settleBatch([1], (value) => Promise.resolve(value), 0)).rejects.toThrow(RangeError);
  });

  it('rejects sparse input instead of silently skipping later work', async () => {
    const sparse: string[] = [];
    sparse.length = 2;
    sparse[1] = 'second';

    await expect(settleBatch(sparse, (value) => Promise.resolve(value), 1)).rejects.toThrow(RangeError);
  });
});
