import { renderBootstrapFailure } from '@/app/bootstrapFailure';

export type ApplicationMount = (root: HTMLElement) => Promise<void>;

export interface BootstrapApplicationOptions {
  document: Document;
  loadApplication: () => Promise<ApplicationMount>;
  onRetry: () => void;
  reportError: (message: string, error?: unknown) => void;
  rootId?: string;
}

export type BootstrapApplicationResult = 'mounted' | 'failed' | 'missing-root';

export async function bootstrapApplication({
  document,
  loadApplication,
  onRetry,
  reportError,
  rootId = 'root',
}: BootstrapApplicationOptions): Promise<BootstrapApplicationResult> {
  const root = document.getElementById(rootId);
  if (!root) {
    reportError(`Application bootstrap failed: missing #${rootId} element.`);
    return 'missing-root';
  }

  try {
    const mountApplication = await loadApplication();
    await mountApplication(root);
    return 'mounted';
  } catch (error) {
    reportError('Application bootstrap failed.', error);
    renderBootstrapFailure(root, { onRetry });
    return 'failed';
  }
}
