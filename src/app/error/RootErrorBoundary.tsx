import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom';
import { getErrorMessage } from '@/shared/lib/error';
import styles from './RootErrorBoundary.module.css';

export function RootErrorBoundary() {
  const error = useRouteError();
  const status = isRouteErrorResponse(error) ? error.status : 500;
  const title = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText || '请求失败'}`
    : '页面加载失败';
  const message = getErrorMessage(error, '系统暂时无法完成请求，请稍后重试。');

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <span className={styles.icon}>
          <AlertTriangle size={30} />
        </span>
        <span className={styles.code}>ERROR · {status}</span>
        <h1>{title}</h1>
        <p>{message}</p>
        <div className={styles.actions}>
          <button type="button" onClick={() => window.location.reload()}>
            <RefreshCw size={17} />
            重新加载
          </button>
          <Link to="/home">
            <Home size={17} />
            返回首页
          </Link>
        </div>
      </section>
    </main>
  );
}
