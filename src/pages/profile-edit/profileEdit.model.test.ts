import { describe, expect, it } from 'vitest';
import { profileEditSchema, profileToFormValues } from './profileEdit.model';

describe('profile edit model', () => {
  it('accepts a host without a scheme because the owner service canonicalizes it', () => {
    const result = profileEditSchema.safeParse({
      displayName: ' 林知夏 ',
      bio: '',
      location: '',
      websiteUrl: 'lct.design/profile',
      birthday: '1996-08-21',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.displayName).toBe('林知夏');
      expect(result.data.websiteUrl).toBe('lct.design/profile');
    }
  });

  it('rejects unsupported website protocols and impossible date-only values', () => {
    const result = profileEditSchema.safeParse({
      displayName: '林知夏',
      bio: '',
      location: '',
      websiteUrl: 'ftp://example.com/file',
      birthday: '2026-02-30',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.websiteUrl).toBeDefined();
      expect(result.error.flatten().fieldErrors.birthday).toBeDefined();
    }
  });

  it('maps the authoritative editable view without inventing handle or occupation fields', () => {
    const form = profileToFormValues({
      userId: 'user-current',
      displayName: '林知夏',
      bio: null,
      location: '台北',
      websiteUrl: null,
      birthday: null,
      avatarStorageKey: null,
      coverStorageKey: null,
      avatarUrl: null,
      coverUrl: null,
      avatarMediaState: 'MISSING',
      coverMediaState: 'MISSING',
      updatedAt: '2026-07-28T08:00:00.000Z',
    });

    expect(form).toEqual({
      displayName: '林知夏',
      bio: '',
      location: '台北',
      websiteUrl: '',
      birthday: '',
    });
  });
});
