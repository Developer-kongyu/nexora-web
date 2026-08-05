import { env } from '@/shared/config/env';
import { toError } from '@/shared/lib/error';
import { authSession } from './authSession';
import { ApiError } from './errors';

export interface ApiEnvelope<T> {
  code: string;
  message: string;
  data: T;
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiRequestOptions<TBody = unknown> {
  path: string;
  method?: HttpMethod;
  body?: TBody;
  headers?: HeadersInit;
  signal?: AbortSignal;
  timeoutMs?: number;
  auth?: boolean;
  retry401?: boolean;
  idempotencyKey?: string;
}

function joinUrl(base: string, path: string): string {
  if (!base) return path;
  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    if (!response.ok)
      throw new ApiError({
        httpStatus: response.status,
        code: 'HTTP_ERROR',
        message: response.statusText,
      });
    return (await response.text()) as T;
  }
  const payload = (await response.json()) as Partial<ApiEnvelope<T>> & {
    fieldErrors?: Record<string, string[]>;
    retryable?: boolean;
    details?: {
      fieldErrors?: Record<string, string[]>;
    };
  };
  if (!response.ok) {
    throw new ApiError({
      httpStatus: response.status,
      code: payload.code || 'API_ERROR',
      message: payload.message || '请求失败',
      requestId: response.headers.get('x-request-id') || undefined,
      fieldErrors: payload.details?.fieldErrors ?? payload.fieldErrors,
      retryAfterSeconds: Number(response.headers.get('retry-after')) || undefined,
    });
  }
  if ('data' in payload) return payload.data as T;
  return payload as T;
}

async function requestInternal<TResponse, TBody>(
  options: ApiRequestOptions<TBody>,
  hasRetried = false,
): Promise<TResponse> {
  const controller = new AbortController();
  const timeout = window.setTimeout(
    () => controller.abort(new DOMException('请求超时', 'TimeoutError')),
    options.timeoutMs ?? env.VITE_API_TIMEOUT_MS,
  );
  const token = authSession.getAccessToken();
  const headers = new Headers(options.headers);
  headers.set('accept', 'application/json');
  headers.set('x-request-id', crypto.randomUUID());
  if (options.body !== undefined && !(options.body instanceof FormData))
    headers.set('content-type', 'application/json');
  if (options.auth !== false && token) headers.set('authorization', `Bearer ${token}`);
  const method = options.method ?? 'GET';
  const csrfToken = authSession.getCsrfToken();
  if (method !== 'GET' && csrfToken && !headers.has('x-csrf-token')) {
    headers.set('x-csrf-token', csrfToken);
  }
  if (options.idempotencyKey) headers.set('idempotency-key', options.idempotencyKey);
  const abortListener = () => controller.abort(toError(options.signal?.reason, '请求已取消'));
  if (options.signal?.aborted) {
    controller.abort(toError(options.signal.reason, '请求已取消'));
  } else {
    options.signal?.addEventListener('abort', abortListener, { once: true });
  }

  try {
    if (controller.signal.aborted) {
      throw toError(controller.signal.reason, '请求已取消或超时');
    }
    const response = await fetch(joinUrl(env.VITE_API_BASE_URL, options.path), {
      method,
      credentials: 'include',
      headers,
      body:
        options.body === undefined
          ? undefined
          : options.body instanceof FormData
            ? options.body
            : JSON.stringify(options.body),
      signal: controller.signal,
    });
    if (
      response.status === 401 &&
      options.auth !== false &&
      options.retry401 !== false &&
      !hasRetried
    ) {
      const nextToken = await authSession.refresh();
      if (nextToken) return requestInternal<TResponse, TBody>(options, true);
    }
    return await parseResponse<TResponse>(response);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (controller.signal.aborted) {
      throw new ApiError({
        httpStatus: 0,
        code: 'REQUEST_ABORTED',
        message: '请求已取消或超时',
        cause: error,
      });
    }
    throw new ApiError({
      httpStatus: 0,
      code: 'NETWORK_ERROR',
      message: '网络连接失败',
      cause: error,
    });
  } finally {
    window.clearTimeout(timeout);
    options.signal?.removeEventListener('abort', abortListener);
  }
}

export const apiClient = {
  request: <TResponse, TBody = unknown>(options: ApiRequestOptions<TBody>) =>
    requestInternal<TResponse, TBody>(options),
};
