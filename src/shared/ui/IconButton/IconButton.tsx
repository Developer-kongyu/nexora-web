import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import type { UiSize } from '../types';
import styles from './IconButton.module.css';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon: ReactNode;
  size?: UiSize;
}

export function IconButton({
  label,
  icon,
  size = 'md',
  className,
  type = 'button',
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={cn(styles.button, styles[size], className)}
      aria-label={label}
      title={label}
      {...props}
    >
      {icon}
    </button>
  );
}
