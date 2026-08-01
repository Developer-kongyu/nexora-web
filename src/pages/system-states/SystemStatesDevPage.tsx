import { ArrowLeft, Compass, Home, LogIn, RefreshCw, Send } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '@/shared/ui';
import styles from './SystemStatesDevPage.module.css';

interface StateCardProps {
  tone: 'blue' | 'violet' | 'green';
  title: string;
  description: string;
  action: ReactNode;
}

function StateCard({ tone, title, description, action }: StateCardProps) {
  return (
    <article className={styles.stateCard}>
      <div className={styles.illustration} data-tone={tone} aria-hidden="true">
        <span className={styles.orbTop} />
        <span className={styles.orbBottom} />
        <svg viewBox="0 0 320 90" role="presentation">
          <path d="M18 66 L112 40 L170 56 L302 26" />
        </svg>
      </div>
      <h2>{title}</h2>
      <p>{description}</p>
      <div className={styles.action}>{action}</div>
    </article>
  );
}

export function SystemStatesDevPage() {
  const { showToast } = useToast();

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <span className={styles.devBadge}>开发预览</span>
        <h1>系统状态规范</h1>
        <p>404、403、内容不可用、媒体失败、登录过期和空列表使用统一视觉与操作语义。</p>
      </header>

      <section className={styles.grid} aria-label="系统状态预览">
        <StateCard
          tone="blue"
          title="404 页面不存在"
          description="链接可能已失效，返回首页或搜索内容。"
          action={
            <Link className={styles.primaryAction} to="/home">
              <Home size={16} />
              返回首页
            </Link>
          }
        />
        <StateCard
          tone="violet"
          title="403 无权限"
          description="你没有权限查看此内容，可申请访问或返回。"
          action={
            <button
              type="button"
              className={styles.secondaryAction}
              onClick={() => showToast({ tone: 'success', title: '访问申请已提交' })}
            >
              <Send size={16} />
              申请权限
            </button>
          }
        />
        <StateCard
          tone="green"
          title="帖子不可用"
          description="帖子已删除、无权限或作者设置为不可见。"
          action={
            <Link className={styles.secondaryAction} to="/home">
              <ArrowLeft size={16} />
              查看首页
            </Link>
          }
        />
        <StateCard
          tone="blue"
          title="媒体加载失败"
          description="媒体处理或转码失败，可稍后重试。"
          action={
            <button
              type="button"
              className={styles.secondaryAction}
              onClick={() => showToast({ tone: 'info', title: '正在重新加载媒体' })}
            >
              <RefreshCw size={16} />
              重试
            </button>
          }
        />
        <StateCard
          tone="violet"
          title="登录已过期"
          description="请重新登录以继续收藏、评论和发布。"
          action={
            <Link className={styles.primaryAction} to="/auth/login">
              <LogIn size={16} />
              重新登录
            </Link>
          }
        />
        <StateCard
          tone="green"
          title="这里还没有内容"
          description="关注用户、加入社群或发布第一条动态。"
          action={
            <Link className={styles.secondaryAction} to="/explore">
              <Compass size={16} />
              去发现
            </Link>
          }
        />
      </section>

      <section className={styles.boundaryNote}>
        <div>
          <strong>全局错误边界</strong>
          <p>网络失败、频率限制、资源不存在和权限错误统一通过 EmptyState、PermissionGate 与 ErrorBoundary 呈现。</p>
        </div>
        <code>requestId · retryAfter · errorCode</code>
      </section>
    </main>
  );
}
