import { useMemo } from 'react';
import { useKeySelection } from '@/shared/hooks/useKeySelection';

export function useDraftListSelection<TDraft extends { draftId: string }>(
  drafts: readonly TDraft[],
) {
  const draftIds = useMemo(() => drafts.map((draft) => draft.draftId), [drafts]);
  const selection = useKeySelection(draftIds);

  return {
    draftIds,
    selection,
    allSelected: selection.areAllSelected(draftIds),
  };
}
