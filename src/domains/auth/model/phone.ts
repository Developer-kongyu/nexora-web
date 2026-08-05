const E164_PHONE_PATTERN = /^\+[1-9]\d{6,14}$/;

export function isE164Phone(value: string): boolean {
  return E164_PHONE_PATTERN.test(value.trim());
}
