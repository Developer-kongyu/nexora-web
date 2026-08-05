import { describe, expect, it } from 'vitest';
import { isE164Phone } from './phone';

describe('isE164Phone', () => {
  it.each(['+8613800138000', '+12025550123', ' +442071838750 '])('accepts %s', (phone) =>
    expect(isE164Phone(phone)).toBe(true),
  );

  it.each(['13800138000', 'user@example.com', '@handle', '+01234567', '+86 13800138000'])(
    'rejects %s',
    (phone) => expect(isE164Phone(phone)).toBe(false),
  );
});
