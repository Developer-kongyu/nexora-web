import { isE164Phone } from '@/domains/auth';

export type LoginMode = 'password' | 'code';

export function validateLoginIdentifier(value: string, mode: LoginMode): true | string {
  const identifier = value.trim();

  if (mode === 'code') {
    if (!identifier) return '请输入手机号';
    if (!isE164Phone(identifier)) {
      return '请输入有效的手机号（需含国家代码，如 +8613800138000）';
    }
    return true;
  }

  return identifier ? true : '请输入邮箱、手机号或 @handle';
}

export function validateLoginSecret(value: string, mode: LoginMode): true | string {
  if (mode === 'code') {
    if (!value) return '请输入验证码';
    return /^\d{6}$/.test(value) ? true : '请输入 6 位数字验证码';
  }

  if (!value) return '请输入密码';
  return value.length >= 8 ? true : '密码至少 8 位';
}
