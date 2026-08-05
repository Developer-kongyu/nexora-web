import { describe, expect, it } from 'vitest';
import { ApiError } from '@/shared/api/errors';
import { formatHistoryDeleteFailure } from './historyDeleteFeedback';

describe('history delete feedback', () => {
  it('includes the server message and stable error code for API failures', () => {
    const error = new ApiError({
      httpStatus: 400,
      code: 'BOOKMARK_INVALID_INPUT',
      message: '请求参数不合法',
    });

    expect(formatHistoryDeleteFailure(2, error)).toBe(
      '2 条删除失败：请求参数不合法（BOOKMARK_INVALID_INPUT）。失败记录仍保留选中状态。',
    );
  });

  it('keeps a generic fallback for non-API failures', () => {
    expect(formatHistoryDeleteFailure(1, new Error('network'))).toBe(
      '1 条删除失败，仍保留选中状态。',
    );
  });
});
