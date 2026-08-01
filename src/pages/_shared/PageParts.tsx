import { Image, Link2, Smile, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/domains/auth';
import { getCurrentUserPresentation } from '@/domains/users';
import { paths } from '@/shared/config/paths';
import { cn } from '@/shared/lib/cn';
import { Avatar, Button, PageHeader } from '@/shared/ui';
import styles from './ProductPages.module.css';

interface SideCardProps {
  title: string;
  children: ReactNode;
  action?: string;
  to?: string;
}

export function SideCard({ title, children, action, to }: SideCardProps) {
  return (
    <section className={styles.sideCard}>
      <header className={styles.sideCardHeader}>
        <h2>{title}</h2>
        {action && to ? <Link to={to}>{action}</Link> : null}
      </header>
      {children}
    </section>
  );
}

interface LoadingRowsProps {
  count?: number;
  compact?: boolean;
}

export function LoadingRows({ count = 3, compact = false }: LoadingRowsProps) {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className={cn(styles.skeleton, compact && styles.compactSkeleton)} />
      ))}
    </div>
  );
}

export function QuickCompose() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const currentUser = getCurrentUserPresentation(user);
  const openCompose = () => navigate(paths.compose);

  return (
    <section className={styles.quickCompose}>
      <Avatar fallback={currentUser.avatarFallback} alt={currentUser.displayName} />
      <button type="button" className={styles.prompt} onClick={openCompose}>
        分享此刻的想法、发现或作品…
      </button>
      <div className={styles.quickTools}>
        <button type="button" title="图片" aria-label="添加图片" onClick={openCompose}>
          <Image size={18} />
        </button>
        <button type="button" title="链接" aria-label="添加链接" onClick={openCompose}>
          <Link2 size={18} />
        </button>
        <button type="button" title="表情" aria-label="添加表情" onClick={openCompose}>
          <Smile size={18} />
        </button>
        <button type="button" title="灵感" aria-label="打开灵感" onClick={openCompose}>
          <Sparkles size={18} />
        </button>
      </div>
    </section>
  );
}

interface NoticeProps {
  children: ReactNode;
  tone?: 'info' | 'success' | 'warning' | 'danger';
  action?: ReactNode;
}

export function Notice({ children, tone = 'info', action }: NoticeProps) {
  return (
    <div
      className={cn(
        styles.infoBanner,
        tone === 'success' && styles.successBanner,
        tone === 'warning' && styles.warningBanner,
        tone === 'danger' && styles.dangerBanner,
      )}
    >
      <Sparkles size={17} />
      <p>{children}</p>
      {action}
    </div>
  );
}

export const PageTitle = PageHeader;

interface EmptyPanelProps {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyPanel({ title, description, icon, action }: EmptyPanelProps) {
  return (
    <div className={styles.emptyPanel}>
      {icon ? <span className={styles.emptyIcon}>{icon}</span> : null}
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  );
}

interface SaveFooterProps {
  message?: string;
  onSave?: () => void;
  onCancel?: () => void;
  saving?: boolean;
  disabled?: boolean;
}

export function SaveFooter({
  message = '更改会在保存后生效',
  onSave,
  onCancel,
  saving = false,
  disabled = false,
}: SaveFooterProps) {
  const navigate = useNavigate();
  const handleCancel = onCancel ?? (() => navigate(-1));

  return (
    <div className={styles.formFooter}>
      <span>{message}</span>
      <div>
        <Button variant="secondary" type="button" disabled={saving} onClick={handleCancel}>
          取消
        </Button>
        <Button type="button" loading={saving} disabled={disabled} onClick={onSave}>
          保存更改
        </Button>
      </div>
    </div>
  );
}
