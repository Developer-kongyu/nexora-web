import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useSynchronizedState } from './useSynchronizedState';

export interface OptimisticBooleanMutationOptions<TResult> {
  value: boolean;
  mutationFn: (nextValue: boolean) => Promise<TResult>;
  onSuccess?: (result: TResult, nextValue: boolean) => void;
  onError?: (error: Error, attemptedValue: boolean) => void;
}

export interface OptimisticBooleanMutationResult<TResult> {
  value: boolean;
  set: (nextValue: boolean) => void;
  toggle: () => void;
  mutation: UseMutationResult<TResult, Error, boolean, { previousValue: boolean }>;
}

export function useOptimisticBooleanMutation<TResult>({
  value: sourceValue,
  mutationFn,
  onSuccess,
  onError,
}: OptimisticBooleanMutationOptions<TResult>): OptimisticBooleanMutationResult<TResult> {
  const [value, setValue] = useSynchronizedState(sourceValue, sourceValue);

  const mutation = useMutation<TResult, Error, boolean, { previousValue: boolean }>({
    mutationFn,
    onMutate: (nextValue) => {
      const previousValue = value;
      setValue(nextValue);
      return { previousValue };
    },
    onSuccess: (result, nextValue) => onSuccess?.(result, nextValue),
    onError: (error, attemptedValue, context) => {
      setValue(context?.previousValue ?? !attemptedValue);
      onError?.(error, attemptedValue);
    },
  });
  const { isPending, mutate } = mutation;

  const set = useCallback(
    (nextValue: boolean) => {
      if (!isPending && nextValue !== value) mutate(nextValue);
    },
    [isPending, mutate, value],
  );

  const toggle = useCallback(() => set(!value), [set, value]);

  return { value, set, toggle, mutation };
}
