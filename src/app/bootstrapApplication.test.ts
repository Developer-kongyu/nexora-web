import { bootstrapApplication } from './bootstrapApplication';

describe('bootstrapApplication', () => {
  it('mounts the dynamically loaded application into the configured root', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const root = document.getElementById('root');
    if (!root) throw new Error('test root missing');
    const mountedRoots: HTMLElement[] = [];
    const reportedErrors: unknown[][] = [];

    const result = await bootstrapApplication({
      document,
      loadApplication: () =>
        Promise.resolve((target) => {
          mountedRoots.push(target);
          return Promise.resolve();
        }),
      onRetry: () => undefined,
      reportError: (...args) => reportedErrors.push(args),
    });

    expect(result).toBe('mounted');
    expect(mountedRoots).toEqual([root]);
    expect(reportedErrors).toEqual([]);
  });

  it('renders the recovery state when loading the application fails', async () => {
    document.body.innerHTML = '<div id="root"><span>loading</span></div>';
    const failure = new Error('chunk unavailable');
    const reportedErrors: unknown[][] = [];

    const result = await bootstrapApplication({
      document,
      loadApplication: () => Promise.reject(failure),
      onRetry: () => undefined,
      reportError: (...args) => reportedErrors.push(args),
    });

    expect(result).toBe('failed');
    expect(document.querySelector('[data-app-bootstrap-failure]')).not.toBeNull();
    expect(reportedErrors).toEqual([['Application bootstrap failed.', failure]]);
  });

  it('reports a missing mount point without loading the application', async () => {
    document.body.innerHTML = '';
    let loadCount = 0;
    const reportedErrors: unknown[][] = [];

    const result = await bootstrapApplication({
      document,
      loadApplication: () => {
        loadCount += 1;
        return Promise.resolve(() => Promise.resolve());
      },
      onRetry: () => undefined,
      reportError: (...args) => reportedErrors.push(args),
    });

    expect(result).toBe('missing-root');
    expect(loadCount).toBe(0);
    expect(reportedErrors).toEqual([['Application bootstrap failed: missing #root element.']]);
  });
});
