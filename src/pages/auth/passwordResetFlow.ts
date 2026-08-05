import { isE164Phone } from '@/domains/auth';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type PasswordResetIdentifierType = 'EMAIL' | 'PHONE' | 'INVALID';

export function getPasswordResetIdentifierType(value: string): PasswordResetIdentifierType {
  const identifier = value.trim();

  if (EMAIL_PATTERN.test(identifier)) return 'EMAIL';
  if (isE164Phone(identifier)) return 'PHONE';
  return 'INVALID';
}

export function validatePasswordResetIdentifier(value: string): true | string {
  return getPasswordResetIdentifierType(value) !== 'INVALID'
    ? true
    : '请输入有效的邮箱或手机号（手机号需含国家代码，如 +8613800138000）';
}
