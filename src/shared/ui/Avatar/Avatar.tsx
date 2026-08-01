import { cn } from '@/shared/lib/cn';
import type { ExtendedUiSize } from '../types';
import styles from './Avatar.module.css';

interface AvatarProps {
  src?: string | null;
  alt: string;
  fallback: string;
  size?: ExtendedUiSize;
  className?: string;
}

export function Avatar({ src, alt, fallback, size = 'md', className }: AvatarProps) {
  if (src) {
    return <img className={cn(styles.avatar, styles[size], className)} src={src} alt={alt} />;
  }
  return (
    <span className={cn(styles.avatar, styles.fallback, styles[size], className)} aria-label={alt}>
      {fallback}
    </span>
  );
}
