import { useCallback, useEffect, useState } from 'react';

const DEFAULT_COUNTDOWN_SECONDS = 60;

function normalizeCountdownSeconds(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.ceil(value));
}

export function useVerificationCountdown() {
  const [seconds, setSeconds] = useState(0);

  const tick = useCallback(() => {
    setSeconds((value) => Math.max(0, value - 1));
  }, []);

  useEffect(() => {
    if (seconds <= 0) return;

    const timer = window.setTimeout(tick, 1000);
    return () => window.clearTimeout(timer);
  }, [seconds, tick]);

  const start = useCallback((nextSeconds = DEFAULT_COUNTDOWN_SECONDS) => {
    setSeconds(normalizeCountdownSeconds(nextSeconds));
  }, []);

  return {
    seconds,
    active: seconds > 0,
    start,
  };
}
