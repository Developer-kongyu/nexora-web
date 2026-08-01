import type { HTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';
import styles from './Badge.module.css';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: 'neutral' | 'brand' | 'success' | 'danger' | 'warning';
}

export function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  return <span className={cn(styles.badge, styles[tone], className)} {...props} />;
}
