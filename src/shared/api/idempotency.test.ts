import { describe, expect, it } from 'vitest';
import { createIdempotencyKey } from './idempotency';

describe('createIdempotencyKey', () => {
  it('keeps the shared scope separator stable across domain APIs', () => {
    expect(createIdempotencyKey('create-community')).toMatch(
      /^create-community:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });
});
