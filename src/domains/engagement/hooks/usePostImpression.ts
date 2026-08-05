import { useEffect, useRef } from 'react';
import { engagementApi, type ImpressionScene } from '../api/engagementApi';

const VIEWABILITY_THRESHOLD = 0.5;
const VIEWABILITY_DURATION_MS = 500;
const recordedImpressions = new Set<string>();

export function usePostImpression(postId: string, scene: ImpressionScene) {
  const elementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    const impressionKey = `${scene}:${postId}`;
    if (!element || !postId || recordedImpressions.has(impressionKey)) return;

    let viewabilityTimer: number | null = null;
    let disposed = false;

    const clearViewabilityTimer = () => {
      if (viewabilityTimer === null) return;
      window.clearTimeout(viewabilityTimer);
      viewabilityTimer = null;
    };

    const record = () => {
      clearViewabilityTimer();
      if (disposed || recordedImpressions.has(impressionKey)) return;
      recordedImpressions.add(impressionKey);
      void engagementApi.impression(postId, scene).catch(() => {
        recordedImpressions.delete(impressionKey);
      });
    };

    if (typeof IntersectionObserver === 'undefined') {
      record();
      return () => {
        disposed = true;
      };
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && entry.intersectionRatio >= VIEWABILITY_THRESHOLD) {
          if (viewabilityTimer === null) {
            viewabilityTimer = window.setTimeout(record, VIEWABILITY_DURATION_MS);
          }
          return;
        }
        clearViewabilityTimer();
      },
      { threshold: [VIEWABILITY_THRESHOLD] },
    );

    observer.observe(element);
    return () => {
      disposed = true;
      clearViewabilityTimer();
      observer.disconnect();
    };
  }, [postId, scene]);

  return elementRef;
}
