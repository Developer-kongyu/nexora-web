import { isApiError } from '@/shared/api/errors';
import { getErrorMessage } from '@/shared/lib/error';

export function draftErrorDescription(error: unknown): string {
  if (isApiError(error) && error.code === 'POST_DRAFT_VERSION_CONFLICT') {
    return '草稿已在其他位置更新，请重新加载后再继续编辑。';
  }
  return getErrorMessage(error, '草稿保存失败，请稍后重试。');
}
