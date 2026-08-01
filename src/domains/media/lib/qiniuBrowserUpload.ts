import { toError } from '@/shared/lib/error';
import type { StorageUploadTicket } from '../model/types';
import { MediaUploadError } from './mediaUploadError';

interface QiniuUploadProgress {
  total?: {
    percent?: number;
  };
}

interface QiniuUploadCompletion {
  key?: string;
  hash?: string;
}

interface QiniuSubscription {
  unsubscribe?: () => void;
}

interface QiniuObservable {
  subscribe: (observer: {
    next?: (progress: QiniuUploadProgress) => void;
    error?: (error: unknown) => void;
    complete?: (result: QiniuUploadCompletion) => void;
  }) => QiniuSubscription | void;
}

interface QiniuSdk {
  region?: Record<string, unknown>;
  upload: (
    file: File,
    key: string,
    token: string,
    putExtra: {
      fname: string;
      mimeType: string | null;
      params: Record<string, string>;
    },
    config: {
      region?: unknown;
      useCdnDomain: boolean;
      checkByMD5: boolean;
      forceDirect: boolean;
      chunkSize: number;
    },
  ) => QiniuObservable;
}

type QiniuWindow = Window & typeof globalThis & { qiniu?: QiniuSdk };

const scriptLoads = new Map<string, Promise<void>>();

function removeInvalidSdkScript(normalizedUrl: string): void {
  scriptLoads.delete(normalizedUrl);
  for (const script of document.querySelectorAll<HTMLScriptElement>(
    'script[data-media-upload-sdk]',
  )) {
    if (script.dataset.mediaUploadSdk === normalizedUrl) script.remove();
  }
}

function getQiniuSdk(): QiniuSdk | null {
  return (window as QiniuWindow).qiniu ?? null;
}

function normalizeScriptUrl(rawUrl: string): string {
  const url = new URL(rawUrl, window.location.href);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new MediaUploadError({
      code: 'MEDIA_UPLOAD_SDK_URL_INVALID',
      message: '媒体上传组件地址无效。',
    });
  }
  return url.href;
}

function waitForPromiseWithAbort<T>(pending: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return pending;
  if (signal.aborted) {
    return Promise.reject(toError(signal.reason, '媒体上传已取消。'));
  }

  return new Promise<T>((resolve, reject) => {
    const cleanup = () => signal.removeEventListener('abort', handleAbort);
    const handleAbort = () => {
      cleanup();
      reject(toError(signal.reason, '媒体上传已取消。'));
    };
    signal.addEventListener('abort', handleAbort, { once: true });
    pending.then(
      (value) => {
        cleanup();
        resolve(value);
      },
      (error: unknown) => {
        cleanup();
        reject(toError(error, '媒体上传组件加载失败。'));
      },
    );
  });
}

async function loadQiniuSdk(scriptUrl: string | null, signal?: AbortSignal): Promise<QiniuSdk> {
  const existing = getQiniuSdk();
  if (existing) return existing;
  if (!scriptUrl) {
    throw new MediaUploadError({
      code: 'MEDIA_UPLOAD_SDK_UNAVAILABLE',
      message: '媒体上传组件未配置，请刷新页面后重试。',
    });
  }

  const normalizedUrl = normalizeScriptUrl(scriptUrl);
  let pending = scriptLoads.get(normalizedUrl);
  if (pending === undefined) {
    const scriptLoad = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = normalizedUrl;
      script.async = true;
      script.dataset.mediaUploadSdk = normalizedUrl;
      const cleanup = () => {
        script.removeEventListener('load', handleLoad);
        script.removeEventListener('error', handleError);
      };
      const handleLoad = () => {
        cleanup();
        resolve();
      };
      const handleError = () => {
        cleanup();
        script.remove();
        reject(new Error(`Unable to load media upload SDK: ${normalizedUrl}`));
      };
      script.addEventListener('load', handleLoad, { once: true });
      script.addEventListener('error', handleError, { once: true });
      document.head.append(script);
    });
    scriptLoads.set(normalizedUrl, scriptLoad);
    void scriptLoad.catch(() => {
      scriptLoads.delete(normalizedUrl);
    });
    pending = scriptLoad;
  }

  try {
    await waitForPromiseWithAbort(pending, signal);
  } catch (error) {
    if (!signal?.aborted) scriptLoads.delete(normalizedUrl);
    throw new MediaUploadError({
      code: signal?.aborted ? 'MEDIA_UPLOAD_ABORTED' : 'MEDIA_UPLOAD_SDK_LOAD_FAILED',
      message: signal?.aborted ? '媒体上传已取消。' : '媒体上传组件加载失败。',
      cause: error,
    });
  }

  const sdk = getQiniuSdk();
  if (!sdk) {
    removeInvalidSdkScript(normalizedUrl);
    throw new MediaUploadError({
      code: 'MEDIA_UPLOAD_SDK_INVALID',
      message: '媒体上传组件未正确初始化。',
    });
  }
  return sdk;
}

export async function uploadFileWithQiniu(input: {
  file: File;
  ticket: StorageUploadTicket;
  signal?: AbortSignal;
  onProgress?: (progress: number) => void;
}): Promise<void> {
  const { file, ticket, signal, onProgress } = input;
  const sdk = await loadQiniuSdk(ticket.sdkScriptUrl, signal);

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    let subscription: QiniuSubscription | void;

    const finishReject = (error: unknown) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', handleAbort);
      reject(
        error instanceof MediaUploadError
          ? error
          : new MediaUploadError({
              code: 'MEDIA_OBJECT_UPLOAD_FAILED',
              message: '媒体上传失败，请检查网络后重试。',
              cause: error,
            }),
      );
    };

    const handleAbort = () => {
      subscription?.unsubscribe?.();
      finishReject(
        new MediaUploadError({
          code: 'MEDIA_UPLOAD_ABORTED',
          message: '媒体上传已取消。',
          cause: toError(signal?.reason, '媒体上传已取消。'),
        }),
      );
    };

    if (signal?.aborted) {
      handleAbort();
      return;
    }
    signal?.addEventListener('abort', handleAbort, { once: true });

    try {
      const region = ticket.region ? sdk.region?.[ticket.region] : undefined;
      subscription = sdk
        .upload(
          file,
          ticket.objectKey,
          ticket.token,
          {
            fname: file.name,
            mimeType: file.type || null,
            params: {},
          },
          {
            region,
            useCdnDomain: ticket.recommendedClientConfig.useCdnDomain,
            checkByMD5: ticket.recommendedClientConfig.checkByMD5,
            forceDirect: ticket.recommendedClientConfig.forceDirect,
            chunkSize: ticket.recommendedClientConfig.chunkSizeMB,
          },
        )
        .subscribe({
          next: (progress) => {
            const percent = Math.min(100, Math.max(0, progress.total?.percent ?? 0));
            onProgress?.(percent);
          },
          error: finishReject,
          complete: (result) => {
            if (settled) return;
            if (result.key && result.key !== ticket.objectKey) {
              finishReject(
                new MediaUploadError({
                  code: 'MEDIA_OBJECT_KEY_MISMATCH',
                  message: '上传结果与预期对象不一致，请重新选择文件。',
                }),
              );
              return;
            }
            settled = true;
            signal?.removeEventListener('abort', handleAbort);
            onProgress?.(100);
            resolve();
          },
        });
    } catch (error) {
      finishReject(error);
    }
  });
}
