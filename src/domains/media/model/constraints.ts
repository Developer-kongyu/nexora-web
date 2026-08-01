export const MEDIA_IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
export type MediaImageMimeType = (typeof MEDIA_IMAGE_MIME_TYPES)[number];

export const MEDIA_VIDEO_MIME_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'] as const;

export const MEDIA_IMAGE_ACCEPT = MEDIA_IMAGE_MIME_TYPES.join(',');
export const MEDIA_POST_ACCEPT = [...MEDIA_IMAGE_MIME_TYPES, ...MEDIA_VIDEO_MIME_TYPES].join(',');

export const MEDIA_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const MEDIA_POST_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const MEDIA_POST_VIDEO_MAX_BYTES = 250 * 1024 * 1024;
export const MEDIA_POST_MAX_FILES = 10;
