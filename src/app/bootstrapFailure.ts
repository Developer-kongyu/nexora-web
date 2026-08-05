import { APP_BRAND } from '@/shared/config/brand';

export interface BootstrapFailureOptions {
  onRetry: () => void;
}

export function renderBootstrapFailure(
  root: HTMLElement,
  { onRetry }: BootstrapFailureOptions,
): void {
  const ownerDocument = root.ownerDocument;
  const page = ownerDocument.createElement('main');
  page.dataset.appBootstrapFailure = '';

  const card = ownerDocument.createElement('section');
  card.setAttribute('role', 'alert');
  card.setAttribute('aria-labelledby', 'app-bootstrap-failure-title');
  card.setAttribute('aria-describedby', 'app-bootstrap-failure-description');

  const eyebrow = ownerDocument.createElement('span');
  eyebrow.textContent = `${APP_BRAND.name.toUpperCase()} · STARTUP ERROR`;

  const title = ownerDocument.createElement('h1');
  title.id = 'app-bootstrap-failure-title';
  title.textContent = '应用暂时无法启动';

  const description = ownerDocument.createElement('p');
  description.id = 'app-bootstrap-failure-description';
  description.textContent =
    '本地服务或应用资源初始化失败。请重新加载；若问题持续，请检查网络与部署配置。';

  const retryButton = ownerDocument.createElement('button');
  retryButton.type = 'button';
  retryButton.textContent = '重新加载';
  retryButton.addEventListener('click', onRetry, { once: true });

  card.append(eyebrow, title, description, retryButton);
  page.append(card);
  root.replaceChildren(page);
  retryButton.focus();
}
