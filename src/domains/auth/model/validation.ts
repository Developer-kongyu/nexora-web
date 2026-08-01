import { z } from 'zod';

export const verificationCodeSchema = z.string().regex(/^\d{6}$/, '请输入 6 位数字验证码');

export const strongPasswordSchema = z
  .string()
  .min(8, '密码至少 8 位')
  .regex(/[A-Za-z]/, '密码必须包含字母')
  .regex(/\d/, '密码必须包含数字');

export const passwordConfirmationFieldSchema = z.string();

export interface PasswordConfirmationValues {
  password: string;
  confirmPassword: string;
}

export function passwordsMatch(values: PasswordConfirmationValues): boolean {
  return values.password === values.confirmPassword;
}
