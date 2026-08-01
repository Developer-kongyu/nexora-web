import { useId, type InputHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';
import styles from './Switch.module.css';

interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  description?: string;
  compact?: boolean;
}

export function Switch({
  label,
  description,
  compact = false,
  className,
  id,
  ...props
}: SwitchProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <label className={cn(styles.row, compact && styles.compact, className)} htmlFor={inputId}>
      <span className={styles.copy}>
        <strong>{label}</strong>
        {description ? <small>{description}</small> : null}
      </span>
      <span className={styles.control}>
        <input id={inputId} type="checkbox" {...props} />
        <span aria-hidden="true" />
      </span>
    </label>
  );
}
