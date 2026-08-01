import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';

interface SynchronizedState<TSource, TValue> {
  source: TSource;
  value: TValue;
}

function resolveStateAction<TValue>(
  action: SetStateAction<TValue>,
  currentValue: TValue,
): TValue {
  return typeof action === 'function'
    ? (action as (value: TValue) => TValue)(currentValue)
    : action;
}

/**
 * Keeps an editable local value aligned with an authoritative source revision.
 *
 * The source must be a stable primitive or object identity that changes only when
 * the authoritative value should replace local edits. The guarded render-time
 * adjustment follows React's supported "store information from previous renders"
 * pattern and avoids a second stale render caused by copying props in an effect.
 */
export function useSynchronizedState<TSource, TValue>(
  source: TSource,
  sourceValue: TValue,
): [TValue, Dispatch<SetStateAction<TValue>>] {
  const [state, setState] = useState<SynchronizedState<TSource, TValue>>(() => ({
    source,
    value: sourceValue,
  }));

  const setValue = useCallback<Dispatch<SetStateAction<TValue>>>((action) => {
    setState((current) => ({
      source: current.source,
      value: resolveStateAction(action, current.value),
    }));
  }, []);

  if (!Object.is(state.source, source)) {
    setState({ source, value: sourceValue });
    return [sourceValue, setValue];
  }

  return [state.value, setValue];
}
