import { useCallback, useEffect, useRef, useState } from 'react';
import { validateMediaImageFile, type MediaImageFileValidationResult } from '../lib/imageSelection';
import type {
  MediaImageSelection,
  MediaImageSelectionController,
  MediaImageSelectionPatch,
} from '../model/types';

export type MediaImageValidationFailure = Exclude<MediaImageFileValidationResult, { valid: true }>;

export interface UseMediaImageSelectionOptions {
  maxBytes?: number;
  onValidationError?: (failure: MediaImageValidationFailure) => void;
  onSelected?: (file: File) => void;
}

export function useMediaImageSelection({
  maxBytes,
  onValidationError,
  onSelected,
}: UseMediaImageSelectionOptions = {}): MediaImageSelectionController {
  const [selection, setSelection] = useState<MediaImageSelection | null>(null);
  const selectionRef = useRef<MediaImageSelection | null>(null);
  const mountedRef = useRef(true);

  const commit = useCallback((next: MediaImageSelection | null) => {
    if (!mountedRef.current) return;
    selectionRef.current = next;
    setSelection(next);
  }, []);

  const select = useCallback(
    (file: File) => {
      const validation = validateMediaImageFile(file, maxBytes);
      if (!validation.valid) {
        onValidationError?.(validation);
        return false;
      }

      const previous = selectionRef.current;
      if (previous) URL.revokeObjectURL(previous.previewUrl);
      commit({
        file,
        previewUrl: URL.createObjectURL(file),
        clientUploadId: crypto.randomUUID(),
        stage: 'SELECTED',
        progress: 0,
        checkpoint: null,
        storageKey: null,
        errorMessage: null,
      });
      onSelected?.(file);
      return true;
    },
    [commit, maxBytes, onSelected, onValidationError],
  );

  const update = useCallback(
    (clientUploadId: string, patch: MediaImageSelectionPatch) => {
      const current = selectionRef.current;
      if (!current || current.clientUploadId !== clientUploadId) return;
      const resolvedPatch = typeof patch === 'function' ? patch(current) : patch;
      commit({ ...current, ...resolvedPatch });
    },
    [commit],
  );

  const clear = useCallback(() => {
    const current = selectionRef.current;
    if (current) URL.revokeObjectURL(current.previewUrl);
    commit(null);
  }, [commit]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      const current = selectionRef.current;
      if (current) URL.revokeObjectURL(current.previewUrl);
      selectionRef.current = null;
    };
  }, []);

  return { selection, select, update, clear };
}
