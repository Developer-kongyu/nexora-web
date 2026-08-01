import { ArrowLeft, Compass, Home, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import styles from './NotFoundPage.module.css';

export function NotFoundPage() {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div className={styles.art} aria-hidden="true">
          <span>404</span>
          <i className={styles.orbOne} />
          <i className={styles.orbTwo} />
          <svg viewBox="0 0 440 130" role="presentation">
            <path d="M24 92 L145 54 L236 79 L414 37" />
          </svg>
        </div>
        <span className={styles.eyebrow}>页面走丢了</span>
        <h1>这里没有你要找的内容</h1>
        <p>链接可能已失效、内容已被删除，或你暂时没有访问权限。</p>
        <div className={styles.actions}>
          <Link className={styles.primary} to="/home">
            <Home size={17} />
            返回首页
          </Link>
          <Link className={styles.secondary} to="/explore">
            <Compass size={17} />
            去发现
          </Link>
        </div>
        <div className={styles.hints}>
          <span>
            <Search size={15} />
            尝试搜索相关关键词
          </span>
          <button type="button" onClick={() => window.history.back()}>
            <ArrowLeft size={15} />
            返回上一页
          </button>
        </div>
      </section>
    </main>
  );
}
