import { MEDIA_IMAGE_MAX_BYTES, MEDIA_IMAGE_MIME_TYPES } from '../model/constraints';
import type { MediaImageMimeType } from '../model/constraints';
import type { MediaImageSelection } from '../model/types';

const mediaImageMimeTypeSet = new Set<string>(MEDIA_IMAGE_MIME_TYPES);

export function isMediaImageMimeType(value: string): value is MediaImageMimeType {
  return mediaImageMimeTypeSet.has(value);
}

export type MediaImageFileValidationResult =
  | { valid: true }
  | {
      valid: false;
      code: 'UNSUPPORTED_TYPE' | 'FILE_TOO_LARGE';
      title: string;
      description: string;
    };

export function validateMediaImageFile(
  file: File,
  maxBytes = MEDIA_IMAGE_MAX_BYTES,
): MediaImageFileValidationResult {
  if (!isMediaImageMimeType(file.type)) {
    return {
      valid: false,
      code: 'UNSUPPORTED_TYPE',
      title: '图片格式不支持',
      description: '请选择 JPG、PNG 或 WebP 图片。',
    };
  }
  if (file.size > maxBytes) {
    return {
      valid: false,
      code: 'FILE_TOO_LARGE',
      title: '图片过大',
      description: `单张图片不能超过 ${Math.floor(maxBytes / 1024 / 1024)}MB。`,
    };
  }
  return { valid: true };
}

export interface MediaImageSelectionLabelOptions {
  selectedLabel: string;
  errorFallback: string;
}

export function mediaImageSelectionLabel(
  selection: MediaImageSelection,
  options: MediaImageSelectionLabelOptions,
): string {
  switch (selection.stage) {
    case 'SELECTED':
      return options.selectedLabel;
    case 'REQUESTING_SESSION':
      return '正在创建上传会话';
    case 'UPLOADING':
      return `正在上传 ${Math.round(selection.progress)}%`;
    case 'CONFIRMING':
      return '正在确认上传结果';
    case 'RETRYING':
      return '处理失败，正在自动重试';
    case 'PROCESSING':
      return '正在生成可用图片';
    case 'READY':
      return '图片处理完成';
    case 'ERROR':
      return selection.errorMessage ?? options.errorFallback;
  }
}
