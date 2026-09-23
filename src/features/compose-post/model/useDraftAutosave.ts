import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fingerprintPostCompose,
  hasPostComposeContent,
  useAutosavePostDraft,
  useCreatePostDraft,
  useSavePostDraft,
  type PostComposeInput,
  type PostDraftDetailView,
} from '@/domains/posts';
import { createAbortError } from '@/shared/lib/error';
import { draftErrorDescription } from './draftError';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';
interface DraftIdentity {
  draftId: string;
  draftVersion: number;
}

interface DraftAutosaveOptions {
  initialDraft: PostDraftDetailView | null;
  compose: PostComposeInput;
  blocked: boolean;
}

export function useDraftAutosave({ initialDraft, compose, blocked }: DraftAutosaveOptions) {
  const { mutateAsync: createDraft } = useCreatePostDraft();
  const { mutateAsync: autosaveDraft } = useAutosavePostDraft();
  const { mutateAsync: saveDraft } = useSavePostDraft();
  const [identity, setIdentity] = useState<DraftIdentity | null>(() =>
    initialDraft
      ? { draftId: initialDraft.draftId, draftVersion: initialDraft.draftVersion }
      : null,
  );
  const identityRef = useRef(identity);
  const savingRef = useRef<Promise<DraftIdentity> | null>(null);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  const [saveState, setSaveState] = useState<SaveState>(initialDraft ? 'saved' : 'idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState(
    initialDraft?.lastSavedAtIso ?? initialDraft?.lastAutosavedAtIso ?? null,
  );
  const [lastSavedFingerprint, setLastSavedFingerprint] = useState(() =>
    initialDraft ? fingerprintPostCompose(initialDraft.composeSnapshot) : '',
  );
  const currentFingerprint = fingerprintPostCompose(compose);

  const saveCompose = useCallback(
    async (snapshot: PostComposeInput, autosave = false): Promise<DraftIdentity> => {
      // Wait for an in-flight save before reading the next optimistic draft version.
      while (savingRef.current) await savingRef.current;
      if (!mountedRef.current) throw createAbortError('发帖编辑器已卸载。');
      if (!hasPostComposeContent(snapshot)) throw new Error('正文、媒体或链接至少需要填写一项。');
      setSaveState('saving');
      setSaveError(null);
      const request = (async () => {
        const previous = identityRef.current;
        const result = previous
          ? await (autosave ? autosaveDraft : saveDraft)({ ...previous, compose: snapshot })
          : await createDraft(snapshot);
        const next = { draftId: result.draftId, draftVersion: result.draftVersion };
        if (!mountedRef.current) return next;
        identityRef.current = next;
        setIdentity(next);
        setLastSavedFingerprint(fingerprintPostCompose(snapshot));
        setLastSavedAt(
          !autosave && 'lastSavedAtIso' in result
            ? (result.lastSavedAtIso ?? result.updatedAtIso)
            : result.updatedAtIso,
        );
        setSaveState('saved');
        return next;
      })();
      savingRef.current = request;
      try {
        return await request;
      } catch (error) {
        if (mountedRef.current) {
          setSaveError(draftErrorDescription(error));
          setSaveState('error');
        }
        throw error;
      } finally {
        savingRef.current = null;
      }
    },
    [autosaveDraft, createDraft, saveDraft],
  );

  useEffect(() => {
    if (
      !identity ||
      blocked ||
      saveState === 'saving' ||
      saveState === 'error' ||
      !hasPostComposeContent(compose) ||
      currentFingerprint === lastSavedFingerprint
    )
      return;
    const timer = window.setTimeout(() => {
      void saveCompose(compose, true).catch(() => {
        // The shared save lifecycle already exposes failures and version conflicts to the editor.
      });
    }, 1_500);
    return () => window.clearTimeout(timer);
  }, [
    blocked,
    compose,
    currentFingerprint,
    identity,
    lastSavedFingerprint,
    saveCompose,
    saveState,
  ]);

  return {
    draftId: identity?.draftId ?? null,
    saveState,
    setSaveState,
    saveError,
    setSaveError,
    lastSavedAt,
    lastSavedFingerprint,
    currentFingerprint,
    saveCompose,
    isSaving: saveState === 'saving',
  };
}
