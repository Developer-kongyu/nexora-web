import type { ReactNode } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import styles from './Notice.module.css';
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
