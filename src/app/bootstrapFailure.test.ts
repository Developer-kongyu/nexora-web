import { renderBootstrapFailure } from './bootstrapFailure';

describe('renderBootstrapFailure', () => {
  it('replaces stale content with an accessible retry state', () => {
    document.body.innerHTML = '<div id="root"><span>旧内容</span></div>';
    const root = document.getElementById('root');
    if (!root) throw new Error('test root missing');
    let retryCount = 0;

    renderBootstrapFailure(root, {
      onRetry: () => {
        retryCount += 1;
      },
    });

    const alert = root.querySelector('[role="alert"]');
    const retryButton = root.querySelector('button');
    expect(alert?.getAttribute('aria-labelledby')).toBe('app-bootstrap-failure-title');
    expect(alert?.getAttribute('aria-describedby')).toBe('app-bootstrap-failure-description');
    expect(root.textContent).not.toContain('旧内容');
    expect(retryButton?.textContent).toBe('重新加载');
    expect(document.activeElement).toBe(retryButton);

    retryButton?.click();
    retryButton?.click();
    expect(retryCount).toBe(1);
  });

  it('creates the fallback tree in the root owner document', () => {
    const ownerDocument = document.implementation.createHTMLDocument('isolated');
    const root = ownerDocument.createElement('div');
    ownerDocument.body.append(root);

    renderBootstrapFailure(root, { onRetry: () => undefined });

    const page = root.firstElementChild;
    const retryButton = root.querySelector('button');
    expect(page?.ownerDocument).toBe(ownerDocument);
    expect(retryButton?.ownerDocument).toBe(ownerDocument);
    expect(ownerDocument.activeElement).toBe(retryButton);
  });
});
