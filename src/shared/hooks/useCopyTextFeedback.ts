import { useCallback } from 'react';
import { copyTextToClipboard } from '@/shared/lib/clipboard';
import { useToast } from '@/shared/ui/Toast/useToast';

export interface CopyTextFeedbackOptions {
  successTitle: string;
  errorTitle?: string;
  errorDescription?: string;
}

export function useCopyTextFeedback({
  successTitle,
  errorTitle = '复制失败',
  errorDescription,
}: CopyTextFeedbackOptions) {
  const { showToast } = useToast();

  return useCallback(
    async (value: string): Promise<boolean> => {
      try {
        await copyTextToClipboard(value);
        showToast({ tone: 'success', title: successTitle });
        return true;
      } catch {
        showToast({ tone: 'error', title: errorTitle, description: errorDescription });
        return false;
      }
    },
    [errorDescription, errorTitle, showToast, successTitle],
  );
}
