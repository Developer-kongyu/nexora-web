import { useCallback, useMemo, useState } from 'react';
import { retainSetValues, toggleSetValue } from '@/shared/lib/set';

export interface KeySelectionController {
  selectedKeys: ReadonlySet<string>;
  selectedList: string[];
  selectedCount: number;
  isSelected: (key: string) => boolean;
  areAllSelected: (keys: readonly string[]) => boolean;
  toggle: (key: string) => void;
  setAll: (keys: readonly string[], selected: boolean) => void;
  toggleAll: (keys: readonly string[]) => void;
  replace: (keys: Iterable<string>) => void;
  clear: () => void;
}

interface KeySelectionState {
  resetKey: unknown;
  selectedKeys: Set<string>;
}

export function useKeySelection(
  availableKeys: readonly string[],
  resetKey: unknown = undefined,
): KeySelectionController {
  const [state, setState] = useState<KeySelectionState>(() => ({
    resetKey,
    selectedKeys: new Set(),
  }));
  const availableKeySet = useMemo(() => new Set(availableKeys), [availableKeys]);
  const sourceChanged = !Object.is(state.resetKey, resetKey);
  const retainedSelectedKeys = useMemo(
    () =>
      sourceChanged ? new Set<string>() : retainSetValues(state.selectedKeys, availableKeySet),
    [availableKeySet, sourceChanged, state.selectedKeys],
  );

  if (sourceChanged || retainedSelectedKeys.size !== state.selectedKeys.size) {
    setState({ resetKey, selectedKeys: retainedSelectedKeys });
  }

  const isSelected = useCallback(
    (key: string) => retainedSelectedKeys.has(key),
    [retainedSelectedKeys],
  );
  const areAllSelected = useCallback(
    (keys: readonly string[]) =>
      keys.length > 0 && keys.every((key) => retainedSelectedKeys.has(key)),
    [retainedSelectedKeys],
  );
  const toggle = useCallback(
    (key: string) => {
      if (!availableKeySet.has(key)) return;
      setState((current) => ({
        resetKey: current.resetKey,
        selectedKeys: toggleSetValue(current.selectedKeys, key),
      }));
    },
    [availableKeySet],
  );
  const setAll = useCallback(
    (keys: readonly string[], selected: boolean) => {
      setState((current) => {
        const selectedKeys = new Set(current.selectedKeys);
        keys.forEach((key) => {
          if (!availableKeySet.has(key)) return;
          if (selected) selectedKeys.add(key);
          else selectedKeys.delete(key);
        });
        return { resetKey: current.resetKey, selectedKeys };
      });
    },
    [availableKeySet],
  );
  const toggleAll = useCallback(
    (keys: readonly string[]) => setAll(keys, !areAllSelected(keys)),
    [areAllSelected, setAll],
  );
  const replace = useCallback(
    (keys: Iterable<string>) => {
      setState((current) => ({
        resetKey: current.resetKey,
        selectedKeys: retainSetValues(new Set(keys), availableKeySet),
      }));
    },
    [availableKeySet],
  );
  const clear = useCallback(() => {
    setState((current) => ({ resetKey: current.resetKey, selectedKeys: new Set() }));
  }, []);

  return {
    selectedKeys: retainedSelectedKeys,
    selectedList: [...retainedSelectedKeys],
    selectedCount: retainedSelectedKeys.size,
    isSelected,
    areAllSelected,
    toggle,
    setAll,
    toggleAll,
    replace,
    clear,
  };
}
