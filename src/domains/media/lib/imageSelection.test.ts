import { describe, expect, it } from 'vitest';
import { MEDIA_IMAGE_ACCEPT } from '../model/constraints';
import {
  mediaImageSelectionLabel,
  validateMediaImageFile,
} from './imageSelection';

describe('media image selection', () => {
  it('uses one canonical accept list and validates type and size', () => {
    expect(MEDIA_IMAGE_ACCEPT).toBe('image/png,image/jpeg,image/webp');
    expect(validateMediaImageFile(new File(['image'], 'cover.webp', { type: 'image/webp' }))).toEqual({
      valid: true,
    });
    expect(validateMediaImageFile(new File(['svg'], 'cover.svg', { type: 'image/svg+xml' }))).toMatchObject({
      valid: false,
      code: 'UNSUPPORTED_TYPE',
    });
    expect(
      validateMediaImageFile(
        new File(['large'], 'large.png', { type: 'image/png' }),
        4,
      ),
    ).toMatchObject({ valid: false, code: 'FILE_TOO_LARGE' });
  });

  it('maps upload stages through the shared presentation function', () => {
    const base = {
      file: new File(['image'], 'avatar.png', { type: 'image/png' }),
      previewUrl: 'blob:test',
      clientUploadId: 'upload-1',
      progress: 42,
      checkpoint: null,
      storageKey: null,
      errorMessage: null,
    } as const;

    expect(
      mediaImageSelectionLabel(
        { ...base, stage: 'UPLOADING' },
        { selectedLabel: 'selected', errorFallback: 'failed' },
      ),
    ).toBe('正在上传 42%');
    expect(
      mediaImageSelectionLabel(
        { ...base, stage: 'ERROR', errorMessage: 'network failed' },
        { selectedLabel: 'selected', errorFallback: 'failed' },
      ),
    ).toBe('network failed');
  });
});
