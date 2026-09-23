import { cn } from '@/shared/lib/cn';
import styles from './LoadingRows.module.css';
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
