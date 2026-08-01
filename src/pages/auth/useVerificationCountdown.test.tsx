import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useVerificationCountdown } from './useVerificationCountdown';

describe('useVerificationCountdown', () => {
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('counts down once per second and stops at zero', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useVerificationCountdown());

    act(() => result.current.start(2));
    expect(result.current).toMatchObject({ seconds: 2, active: true });

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.seconds).toBe(1);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).toMatchObject({ seconds: 0, active: false });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('normalizes invalid and fractional durations', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useVerificationCountdown());

    act(() => result.current.start(1.2));
    expect(result.current.seconds).toBe(2);

    act(() => result.current.start(Number.NaN));
    expect(result.current).toMatchObject({ seconds: 0, active: false });
  });
});
