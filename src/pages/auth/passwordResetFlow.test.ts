import { describe, expect, it } from 'vitest';
import {
  getPasswordResetIdentifierType,
  validatePasswordResetIdentifier,
} from './passwordResetFlow';

describe('password reset identifier flow', () => {
  it.each([
    ['name@example.com', 'EMAIL'],
    ['+8613800138000', 'PHONE'],
    ['@demo_user', 'INVALID'],
    ['13800138000', 'INVALID'],
  ] as const)('classifies %s as %s', (value, expected) => {
    expect(getPasswordResetIdentifierType(value)).toBe(expected);
  });

  it('returns a useful message for unsupported identifiers', () => {
    expect(validatePasswordResetIdentifier('demo_user')).toContain('邮箱或手机号');
    expect(validatePasswordResetIdentifier('name@example.com')).toBe(true);
  });
});
