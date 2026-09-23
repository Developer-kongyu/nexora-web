import { useCallback } from 'react';
import { useMediaImageSelection, type MediaImageValidationFailure } from './useMediaImageSelection';
import type { MediaImageSelectionController } from '../model/types';
import { useToast } from '@/shared/ui';

export interface MediaImagePairSelection {
  avatar: MediaImageSelectionController;
  cover: MediaImageSelectionController;
}

export function useMediaImagePairSelection(): MediaImagePairSelection {
  const { showToast } = useToast();
  const handleValidationError = useCallback(
    (failure: MediaImageValidationFailure) => {
      showToast({
        tone: 'error',
        title: failure.title,
        description: failure.description,
      });
    },
    [showToast],
  );

  const avatar = useMediaImageSelection({ onValidationError: handleValidationError });
  const cover = useMediaImageSelection({ onValidationError: handleValidationError });

  return { avatar, cover };
}
