import { http } from 'msw';
import type {
  CreateMediaUploadSessionItem,
  ConfirmMediaAssetUploadedInput,
} from '@/domains/media/model';
import { apiError, ok } from './http';
import { mediaState } from '../state/media.state';
import {
  MEDIA_IMAGE_MIME_TYPES,
  MEDIA_VIDEO_MIME_TYPES,
  MEDIA_POST_VIDEO_MAX_BYTES,
  MEDIA_POST_IMAGE_MAX_BYTES,
  MEDIA_IMAGE_MAX_BYTES,
} from '@/domains/media/model';
import type { MockMediaAsset } from '../state/media.state';

export const mediaHandlers = [
  http.post('/api/media/upload-sessions', async ({ request }) => {
    const body = (await request.json()) as { items?: CreateMediaUploadSessionItem[] };
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return apiError(400, 'MEDIA_UPLOAD_BATCH_EMPTY', '上传项目不能为空');
    }
    const duplicateKeys = new Set<string>();
    for (const item of body.items) {
      const key = mediaState.mediaBusinessKey(item.scene, item.clientUploadId);
      if (duplicateKeys.has(key)) {
        return apiError(400, 'MEDIA_UPLOAD_BATCH_DUPLICATE_BUSINESS_KEY', '上传项目重复');
      }
      duplicateKeys.add(key);
    }

    const results = body.items.map((item) => {
      const sizeInBytes = Number(item.sizeInBytes);
      const supportedImage =
        item.assetKind === 'IMAGE' &&
        MEDIA_IMAGE_MIME_TYPES.some((mimeType) => mimeType === item.contentType);
      const supportedVideo =
        item.scene === 'POST_COMPOSE' &&
        item.assetKind === 'VIDEO' &&
        MEDIA_VIDEO_MIME_TYPES.some((mimeType) => mimeType === item.contentType);
      const sizeLimit =
        item.assetKind === 'VIDEO'
          ? MEDIA_POST_VIDEO_MAX_BYTES
          : item.scene === 'POST_COMPOSE'
            ? MEDIA_POST_IMAGE_MAX_BYTES
            : MEDIA_IMAGE_MAX_BYTES;
      const validSize =
        Number.isSafeInteger(sizeInBytes) && sizeInBytes > 0 && sizeInBytes <= sizeLimit;
      if ((!supportedImage && !supportedVideo) || !validSize) {
        return {
          clientUploadId: item.clientUploadId,
          scene: item.scene,
          assetKind: item.assetKind,
          resultType: 'REJECTED' as const,
          mediaAssetId: null,
          currentAssetStatus: null,
          ticket: null,
          errorCode: validSize ? 'MEDIA_ASSET_UNSUPPORTED_MIME' : 'MEDIA_ASSET_FILE_SIZE_INVALID',
          errorMessage: validSize
            ? item.scene === 'POST_COMPOSE'
              ? '帖子媒体仅支持 JPG、PNG、WebP、MP4、WebM 或 MOV'
              : '头像与封面仅支持图片上传'
            : `文件大小必须在 1 字节到 ${Math.floor(sizeLimit / 1024 / 1024)}MB 之间`,
        };
      }
      const businessKey = mediaState.mediaBusinessKey(item.scene, item.clientUploadId);
      const existing = mediaState.mockMediaAssetsByBusinessKey.get(businessKey);
      if (existing) {
        const sameIntent =
          existing.fileName === item.fileName &&
          existing.contentType === item.contentType &&
          existing.sizeInBytes === item.sizeInBytes &&
          existing.assetKind === item.assetKind;
        if (!sameIntent) {
          return {
            clientUploadId: item.clientUploadId,
            scene: item.scene,
            assetKind: item.assetKind,
            resultType: 'REJECTED' as const,
            mediaAssetId: existing.mediaAssetId,
            currentAssetStatus: existing.status,
            ticket: null,
            errorCode: 'MEDIA_UPLOAD_SESSION_CONFLICT',
            errorMessage: '同一上传标识对应的文件已发生变化',
          };
        }
        if (existing.status !== 'UPLOADING') {
          return {
            clientUploadId: item.clientUploadId,
            scene: item.scene,
            assetKind: item.assetKind,
            resultType: 'REJECTED' as const,
            mediaAssetId: existing.mediaAssetId,
            currentAssetStatus: existing.status,
            ticket: null,
            errorCode: 'MEDIA_UPLOAD_SESSION_STATE_INVALID',
            errorMessage: '上传会话已进入后续处理阶段',
          };
        }
        return {
          clientUploadId: item.clientUploadId,
          scene: item.scene,
          assetKind: item.assetKind,
          resultType: 'REPLAYED' as const,
          mediaAssetId: existing.mediaAssetId,
          currentAssetStatus: 'UPLOADING' as const,
          ticket: mediaState.mockUploadTicket(existing),
          errorCode: null,
          errorMessage: null,
        };
      }

      const mediaAssetId = crypto.randomUUID();
      const asset: MockMediaAsset = {
        mediaAssetId,
        clientUploadId: item.clientUploadId,
        scene: item.scene,
        assetKind: item.assetKind,
        fileName: item.fileName,
        contentType: item.contentType,
        sizeInBytes: item.sizeInBytes,
        objectKey: `mock/${item.scene.toLowerCase()}/${crypto.randomUUID()}`,
        uploadSessionRevision: '1',
        status: 'UPLOADING',
        confirmCount: 0,
      };
      mediaState.mockMediaAssetsById.set(mediaAssetId, asset);
      mediaState.mockMediaAssetsByBusinessKey.set(businessKey, asset);
      return {
        clientUploadId: item.clientUploadId,
        scene: item.scene,
        assetKind: item.assetKind,
        resultType: 'CREATED' as const,
        mediaAssetId,
        currentAssetStatus: 'UPLOADING' as const,
        ticket: mediaState.mockUploadTicket(asset),
        errorCode: null,
        errorMessage: null,
      };
    });

    return ok({ results });
  }),
  http.post('/api/media/assets/confirm-uploaded', async ({ request }) => {
    const body = (await request.json()) as ConfirmMediaAssetUploadedInput;
    const asset = mediaState.mockMediaAssetsById.get(body.mediaAssetId);
    if (!asset) return apiError(404, 'MEDIA_ASSET_NOT_FOUND', '媒体资产不存在');
    if (
      asset.clientUploadId !== body.clientUploadId ||
      asset.uploadSessionRevision !== body.uploadSessionRevision
    ) {
      return apiError(409, 'MEDIA_ASSET_CONFIRM_STATE_INVALID', '上传确认已失效');
    }

    asset.confirmCount += 1;
    if (asset.status === 'FAILED') {
      return ok({
        mediaAssetId: asset.mediaAssetId,
        assetKind: asset.assetKind,
        currentAssetStatus: 'FAILED' as const,
        idempotent: true,
        processingAction: 'NONE' as const,
      });
    }
    if (asset.confirmCount === 1) {
      asset.status = 'UPLOADED';
      return ok({
        mediaAssetId: asset.mediaAssetId,
        assetKind: asset.assetKind,
        currentAssetStatus: 'UPLOADED' as const,
        idempotent: false,
        processingAction:
          asset.assetKind === 'IMAGE'
            ? ('IMAGE_PROCESS_ENQUEUED' as const)
            : ('VIDEO_TRANSCODE_ENQUEUED' as const),
      });
    }

    asset.status = 'READY';
    return ok({
      mediaAssetId: asset.mediaAssetId,
      assetKind: asset.assetKind,
      currentAssetStatus: 'READY' as const,
      idempotent: true,
      processingAction: 'NONE' as const,
    });
  }),
  http.post('/api/media/assets/:mediaAssetId/retry', ({ params }) => {
    const asset = mediaState.mockMediaAssetsById.get(String(params.mediaAssetId));
    if (!asset) return apiError(404, 'MEDIA_ASSET_NOT_FOUND', '媒体资产不存在');
    const wasFailed = asset.status === 'FAILED';
    if (asset.status === 'FAILED') {
      asset.status = 'UPLOADED';
      asset.confirmCount = 1;
    }
    return ok({
      mediaAssetId: asset.mediaAssetId,
      assetKind: asset.assetKind,
      currentAssetStatus: asset.status,
      idempotent: !wasFailed,
      requeuedCommand: wasFailed
        ? asset.assetKind === 'IMAGE'
          ? ('IMAGE_PROCESS_REQUESTED' as const)
          : ('VIDEO_TRANSCODE_REQUESTED' as const)
        : ('NONE' as const),
    });
  }),
];
