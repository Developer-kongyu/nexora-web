import type { MediaUploadCheckpoint } from '../model/types';

export class MediaUploadError extends Error {
  readonly code: string;
  readonly checkpoint: MediaUploadCheckpoint | null;
  override readonly cause?: unknown;

  constructor(input: {
    code: string;
    message: string;
    checkpoint?: MediaUploadCheckpoint | null;
    cause?: unknown;
  }) {
    super(input.message);
    this.name = 'MediaUploadError';
    this.code = input.code;
    this.checkpoint = input.checkpoint ?? null;
    this.cause = input.cause;
  }
}

export function isMediaUploadError(value: unknown): value is MediaUploadError {
  return value instanceof MediaUploadError;
}
