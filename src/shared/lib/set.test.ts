import { describe, expect, it } from 'vitest';
import { retainSetValues, toggleArrayValue, toggleSetValue, uniqueItemsBy } from './set';

describe('Set helpers', () => {
  it('toggles an array value without mutating the source array', () => {
    const source = ['a'];

    expect(toggleArrayValue(source, 'b')).toEqual(['a', 'b']);
    expect(toggleArrayValue(source, 'a')).toEqual([]);
    expect(source).toEqual(['a']);
  });

  it('toggles a value without mutating the source set', () => {
    const source = new Set(['a']);
    const added = toggleSetValue(source, 'b');
    const removed = toggleSetValue(source, 'a');

    expect([...source]).toEqual(['a']);
    expect([...added]).toEqual(['a', 'b']);
    expect([...removed]).toEqual([]);
  });

  it('retains only allowed values', () => {
    expect([...retainSetValues(new Set(['a', 'b', 'c']), ['b', 'c', 'd'])]).toEqual(['b', 'c']);
  });

  it('keeps the first item for each stable key', () => {
    const source = [
      { id: 'a', value: 1 },
      { id: 'b', value: 2 },
      { id: 'a', value: 3 },
    ];

    expect(uniqueItemsBy(source, (item) => item.id)).toEqual(source.slice(0, 2));
  });
});
