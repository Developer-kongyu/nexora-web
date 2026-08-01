import { HttpResponse } from 'msw';

export interface ApiSuccessEnvelope<TData> {
  code: 'OK';
  message: 'success';
  data: TData;
}

export function apiSuccessResponse<TData>(data: TData) {
  return HttpResponse.json<ApiSuccessEnvelope<TData>>({
    code: 'OK',
    message: 'success',
    data,
  });
}

export interface RecordedHttpRequest {
  method: string;
  url: string;
  body: unknown;
}

export function recordEmptyCursorResponse(calls: RecordedHttpRequest[]) {
  return ({ request }: { request: Request }) => {
    calls.push({ method: request.method, url: request.url, body: null });
    return apiSuccessResponse({ list: [], nextCursor: null });
  };
}
