import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import type { UiSize } from '@/shared/ui/types';
import styles from './PageLayout.module.css';

interface PageLayoutProps {
  children: ReactNode;
  aside?: ReactNode;
  wide?: boolean;
  className?: string;
}

export function PageLayout({ children, aside, wide = false, className }: PageLayoutProps) {
  return (
    <div className={cn(styles.layout, wide && styles.wide, !aside && styles.single, className)}>
      <main className={styles.main}>{children}</main>
      {aside ? <aside className={styles.aside}>{aside}</aside> : null}
    </div>
  );
}

interface StackProps {
  children: ReactNode;
  gap?: UiSize;
  className?: string;
}

export function Stack({ children, gap = 'md', className }: StackProps) {
  return <div className={cn(styles.stack, styles[gap], className)}>{children}</div>;
}
