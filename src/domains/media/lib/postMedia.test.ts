import { describe, expect, it } from 'vitest';
import {
  MEDIA_POST_ACCEPT,
  MEDIA_POST_IMAGE_MAX_BYTES,
  MEDIA_POST_MAX_FILES,
  MEDIA_POST_VIDEO_MAX_BYTES,
} from '../model/constraints';
import {
  getPostMediaAssetKind,
  postMediaUploadStatusLabel,
  validatePostMediaFile,
} from './postMedia';
import type { UploadItem } from '../model/types';

function fileWithSize(name: string, type: string, size: number): File {
  const file = new File(['content'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

function uploadItem(patch: Partial<UploadItem> = {}): UploadItem {
  const file = new File(['content'], 'clip.mp4', { type: 'video/mp4' });
  return {
    clientUploadId: 'upload-1',
    file,
    previewUrl: 'blob:preview',
    assetKind: 'VIDEO',
    progress: 0,
    status: 'local',
    ...patch,
  };
}

describe('post media contract', () => {
  it('accepts supported image and video formats and exposes one input accept contract', () => {
    const image = fileWithSize('photo.webp', 'image/webp', MEDIA_POST_IMAGE_MAX_BYTES);
    const video = fileWithSize('clip.mp4', 'video/mp4', MEDIA_POST_VIDEO_MAX_BYTES);

    expect(getPostMediaAssetKind(image)).toBe('IMAGE');
    expect(getPostMediaAssetKind(video)).toBe('VIDEO');
    expect(validatePostMediaFile(image)).toEqual({ valid: true, assetKind: 'IMAGE' });
    expect(validatePostMediaFile(video)).toEqual({ valid: true, assetKind: 'VIDEO' });
    expect(MEDIA_POST_ACCEPT).toContain('image/webp');
    expect(MEDIA_POST_ACCEPT).toContain('video/mp4');
    expect(MEDIA_POST_MAX_FILES).toBe(10);
  });

  it('rejects oversized and unsupported files with actionable messages', () => {
    const oversizedImage = fileWithSize(
      'large.png',
      'image/png',
      MEDIA_POST_IMAGE_MAX_BYTES + 1,
    );
    const oversizedVideo = fileWithSize(
      'large.mp4',
      'video/mp4',
      MEDIA_POST_VIDEO_MAX_BYTES + 1,
    );
    const unsupported = fileWithSize('notes.txt', 'text/plain', 100);

    expect(validatePostMediaFile(oversizedImage)).toMatchObject({
      valid: false,
      code: 'FILE_TOO_LARGE',
    });
    expect(validatePostMediaFile(oversizedVideo)).toEqual({
      valid: false,
      code: 'FILE_TOO_LARGE',
      title: '视频过大',
      description: '单个视频不能超过 250MB。',
    });
    expect(validatePostMediaFile(unsupported)).toMatchObject({
      valid: false,
      code: 'UNSUPPORTED_TYPE',
    });
  });

  it('maps upload lifecycle states to user-facing labels', () => {
    expect(postMediaUploadStatusLabel(uploadItem())).toBe('等待上传');
    expect(postMediaUploadStatusLabel(uploadItem({ status: 'uploading', progress: 48.6 }))).toBe(
      '正在上传 49%',
    );
    expect(postMediaUploadStatusLabel(uploadItem({ status: 'processing' }))).toBe('正在转码');
    expect(postMediaUploadStatusLabel(uploadItem({ status: 'failed', error: '网络中断' }))).toBe(
      '网络中断',
    );
  });
});
