import { describe, expect, it } from 'vitest';
import { validateLoginIdentifier, validateLoginSecret } from './loginValidation';

describe('login validation copy', () => {
  it('uses password-login identifier copy', () => {
    expect(validateLoginIdentifier('', 'password')).toBe('请输入邮箱、手机号或 @handle');
    expect(validateLoginIdentifier('demo_zhixia', 'password')).toBe(true);
  });

  it('uses phone-only copy for code login', () => {
    expect(validateLoginIdentifier('', 'code')).toBe('请输入手机号');
    expect(validateLoginIdentifier('13800138000', 'code')).toBe(
      '请输入有效的手机号（需含国家代码，如 +8613800138000）',
    );
    expect(validateLoginIdentifier('+8613800138000', 'code')).toBe(true);
  });

  it('uses mode-specific secret copy', () => {
    expect(validateLoginSecret('', 'password')).toBe('请输入密码');
    expect(validateLoginSecret('short', 'password')).toBe('密码至少 8 位');
    expect(validateLoginSecret('', 'code')).toBe('请输入验证码');
    expect(validateLoginSecret('123', 'code')).toBe('请输入 6 位数字验证码');
    expect(validateLoginSecret('123456', 'code')).toBe(true);
  });
});
