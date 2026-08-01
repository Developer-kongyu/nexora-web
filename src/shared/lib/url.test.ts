import { describe, expect, it } from 'vitest';
import { canonicalizeHttpUrl, getUrlHostname, isValidHttpUrlInput } from './url';

describe('HTTP URL helpers', () => {
  it('canonicalizes hosts without a scheme', () => {
    expect(canonicalizeHttpUrl(' example.com/path ')).toBe('https://example.com/path');
  });

  it('preserves HTTP protocols and rejects unsupported explicit protocols', () => {
    expect(canonicalizeHttpUrl('http://example.com')).toBe('http://example.com');
    expect(() => canonicalizeHttpUrl('ftp://example.com/file')).toThrow(TypeError);
    expect(isValidHttpUrlInput('ftp://example.com/file')).toBe(false);
  });

  it('extracts a hostname without throwing for malformed display values', () => {
    expect(getUrlHostname('https://example.com/path')).toBe('example.com');
    expect(getUrlHostname('not a url')).toBe('not a url');
  });
});
