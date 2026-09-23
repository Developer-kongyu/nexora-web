import { useCallback, useEffect, useMemo, useRef, type ChangeEvent } from 'react';
import {
  MEDIA_POST_MAX_FILES,
  uploadPostMediaQueueItem,
  useUploadQueueStore,
  validatePostMediaFile,
  type UploadItem,
} from '@/domains/media';
import { createAbortError } from '@/shared/lib/error';
import { settleBatch } from '@/shared/lib/settleBatch';
import { useToast } from '@/shared/ui';

interface UploadSettlement {
  mediaAssetIds: string[];
  failedItems: UploadItem[];
}

export function useComposeUploads(persistedMediaCount: number) {
  const { showToast } = useToast();
  const uploadItems = useUploadQueueStore((state) => state.items);
  const addFiles = useUploadQueueStore((state) => state.addFiles);
  const removeUpload = useUploadQueueStore((state) => state.remove);
  const updateUpload = useUploadQueueStore((state) => state.update);
  const clearUploads = useUploadQueueStore((state) => state.clear);

  const uploadAbortControllerRef = useRef(new AbortController());
  const activeUploadsRef = useRef(new Map<string, Promise<string>>());

  const readyLocalMediaIds = useMemo(
    () =>
      uploadItems.flatMap((item) =>
        item.status === 'ready' && item.mediaAssetId ? [item.mediaAssetId] : [],
      ),
    [uploadItems],
  );

  const hasPendingMedia = uploadItems.some(
    (item) => item.status !== 'ready' && item.status !== 'failed',
  );
  const hasFailedMedia = uploadItems.some((item) => item.status === 'failed');

  const uploadItem = useCallback(
    (item: UploadItem): Promise<string> => {
      const activeUpload = activeUploadsRef.current.get(item.clientUploadId);
      if (activeUpload !== undefined) return activeUpload;

      const trackedUpload = uploadPostMediaQueueItem({
        item,
        signal: uploadAbortControllerRef.current.signal,
        update: updateUpload,
      }).finally(() => {
        activeUploadsRef.current.delete(item.clientUploadId);
      });
      activeUploadsRef.current.set(item.clientUploadId, trackedUpload);
      return trackedUpload;
    },
    [updateUpload],
  );

  const startUploads = useCallback(
    async (items: readonly UploadItem[]) => {
      const results = await settleBatch(items, uploadItem, 3);
      if (
        !uploadAbortControllerRef.current.signal.aborted &&
        results.some((result) => result.status === 'rejected')
      ) {
        showToast({
          tone: 'error',
          title: '部分媒体上传失败',
          description: '可在媒体卡片中重试，草稿不会引用失败的文件。',
        });
      }
    },
    [showToast, uploadItem],
  );

  const settleUploads = useCallback(async (): Promise<UploadSettlement> => {
    const latestItems = useUploadQueueStore.getState().items;
    const results = await settleBatch(latestItems, uploadItem, 3);
    return {
      mediaAssetIds: results.flatMap((result) =>
        result.status === 'fulfilled' ? [result.value] : [],
      ),
      failedItems: results.flatMap((result) =>
        result.status === 'rejected' ? [result.input] : [],
      ),
    };
  }, [uploadItem]);

  useEffect(() => {
    const uploadAbortController = new AbortController();
    uploadAbortControllerRef.current = uploadAbortController;
    return () => {
      uploadAbortController.abort(createAbortError('发帖编辑器已卸载。'));
      clearUploads();
    };
  }, [clearUploads]);

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = '';

    const acceptedFiles: File[] = [];
    for (const file of selectedFiles) {
      const validation = validatePostMediaFile(file);
      if (validation.valid) acceptedFiles.push(file);
      else {
        showToast({
          tone: 'error',
          title: validation.title,
          description: `${file.name}：${validation.description}`,
        });
      }
    }

    const availableSlots = Math.max(
      0,
      MEDIA_POST_MAX_FILES - persistedMediaCount - uploadItems.length,
    );
    if (acceptedFiles.length > availableSlots) {
      showToast({
        tone: 'warning',
        title: '媒体数量已达上限',
        description: `每条帖子最多添加 ${MEDIA_POST_MAX_FILES} 个媒体文件。`,
      });
    }

    const addedItems = addFiles(acceptedFiles.slice(0, availableSlots));
    void startUploads(addedItems);
  };

  return {
    uploadItems,
    readyLocalMediaIds,
    hasPendingMedia,
    hasFailedMedia,
    removeUpload,
    clearUploads,
    startUploads,
    settleUploads,
    handleFiles,
  };
}
