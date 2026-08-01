import { requireArrayItem } from './array';

export type SettledBatchItem<TInput, TValue> =
  | { input: TInput; status: 'fulfilled'; value: TValue }
  | { input: TInput; status: 'rejected'; reason: unknown };

/**
 * Runs a batch with bounded concurrency while preserving the input order.
 * Individual failures are returned instead of short-circuiting the batch.
 */
export async function settleBatch<TInput, TValue>(
  inputs: readonly TInput[],
  task: (input: TInput, index: number) => Promise<TValue>,
  concurrency = 4,
): Promise<Array<SettledBatchItem<TInput, TValue>>> {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new RangeError('concurrency must be a positive integer');
  }

  const queue = Array.from({ length: inputs.length }, (_, index) => ({
    index,
    input: requireArrayItem(inputs, index, 'batch input'),
  }));
  const results: Array<SettledBatchItem<TInput, TValue> | undefined> = Array.from(
    { length: queue.length },
    () => undefined,
  );
  let nextQueueIndex = 0;

  async function worker(): Promise<void> {
    while (true) {
      const entry = queue[nextQueueIndex];
      nextQueueIndex += 1;
      if (!entry) return;

      const { index, input } = entry;
      try {
        results[index] = { input, status: 'fulfilled', value: await task(input, index) };
      } catch (reason) {
        results[index] = { input, status: 'rejected', reason };
      }
    }
  }

  const workerCount = Math.min(concurrency, queue.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results.map((result, index) => {
    if (!result) {
      throw new Error(`batch result is unavailable at index ${index}`);
    }
    return result;
  });
}
