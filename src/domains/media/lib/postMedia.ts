import { validateMediaImageFile, type MediaImageFileValidationResult } from './imageSelection';
import {
  MEDIA_IMAGE_MIME_TYPES,
  MEDIA_POST_IMAGE_MAX_BYTES,
  MEDIA_POST_VIDEO_MAX_BYTES,
  MEDIA_VIDEO_MIME_TYPES,
} from '../model/constraints';
import type {
  UploadableMediaKind,
  UploadItem,
} from '../model/types';

const videoMimeTypes = new Set<string>(MEDIA_VIDEO_MIME_TYPES);

export type PostMediaFileValidationResult =
  | ({ valid: true } & { assetKind: UploadableMediaKind })
  | Exclude<MediaImageFileValidationResult, { valid: true }>;

export function getPostMediaAssetKind(file: File): UploadableMediaKind | null {
  if (MEDIA_IMAGE_MIME_TYPES.some((mimeType) => mimeType === file.type)) return 'IMAGE';
  if (videoMimeTypes.has(file.type)) return 'VIDEO';
  return null;
}

export function validatePostMediaFile(file: File): PostMediaFileValidationResult {
  const assetKind = getPostMediaAssetKind(file);
  if (assetKind === 'IMAGE') {
    const imageValidation = validateMediaImageFile(file, MEDIA_POST_IMAGE_MAX_BYTES);
    return imageValidation.valid ? { valid: true, assetKind } : imageValidation;
  }
  if (assetKind === 'VIDEO') {
    if (file.size > MEDIA_POST_VIDEO_MAX_BYTES) {
      return {
        valid: false,
        code: 'FILE_TOO_LARGE',
        title: '视频过大',
        description: '单个视频不能超过 250MB。',
      };
    }
    return { valid: true, assetKind };
  }
  return {
    valid: false,
    code: 'UNSUPPORTED_TYPE',
    title: '媒体格式不支持',
    description: '请选择 JPG、PNG、WebP、MP4、WebM 或 MOV 文件。',
  };
}

export function postMediaUploadStatusLabel(item: UploadItem): string {
  switch (item.status) {
    case 'local':
      return '等待上传';
    case 'creating-session':
      return '正在创建上传会话';
    case 'uploading':
      return `正在上传 ${Math.round(item.progress)}%`;
    case 'confirming':
      return '正在确认上传';
    case 'processing':
      return item.assetKind === 'VIDEO' ? '正在转码' : '正在处理';
    case 'ready':
      return '处理完成';
    case 'failed':
      return item.error ?? '上传失败';
  }
}
