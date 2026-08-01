import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { ApplicationRoot } from '@/app/ApplicationRoot';
import { env } from '@/shared/config/env';

async function enableMocking(): Promise<void> {
  const mockMode = import.meta.env.DEV || import.meta.env.MODE === 'test';
  if (!mockMode || !env.VITE_ENABLE_MOCK) return;

  const { worker } = await import('@/mocks/browser');
  await worker.start({
    onUnhandledRequest: import.meta.env.MODE === 'test' ? 'error' : 'bypass',
    serviceWorker: { url: '/mockServiceWorker.js' },
  });
}

export async function mountApplication(root: HTMLElement): Promise<void> {
  await enableMocking();
  createRoot(root).render(createElement(ApplicationRoot));
}
