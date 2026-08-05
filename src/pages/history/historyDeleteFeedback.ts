import { isApiError } from '@/shared/api/errors';

export function formatHistoryDeleteFailure(failureCount: number, reason: unknown): string {
  const prefix = `${failureCount} 条删除失败`;
  if (!isApiError(reason)) return `${prefix}，仍保留选中状态。`;

  return `${prefix}：${reason.message}（${reason.code}）。失败记录仍保留选中状态。`;
}
