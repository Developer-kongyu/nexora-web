import { useId } from 'react';
import { cn } from '@/shared/lib/cn';
import styles from './BrandMark.module.css';

interface BrandMarkProps {
  className?: string;
}

export function BrandMark({ className }: BrandMarkProps) {
  const gradientId = `nexora-mark-${useId().replaceAll(':', '')}`;

  return (
    <svg
      aria-hidden="true"
      className={cn(styles.mark, className)}
      focusable="false"
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={gradientId} x1="8" y1="7" x2="56" y2="57" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6D5DFB" />
          <stop offset="0.52" stopColor="#8B5CF6" />
          <stop offset="1" stopColor="#11BDE3" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="18" fill={`url(#${gradientId})`} />
      <path
        d="M18 44V22.8c0-3.7 4.6-5.3 6.8-2.4l14.4 19.2c2.2 2.9 6.8 1.3 6.8-2.4V20"
        fill="none"
        stroke="white"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="6"
      />
      <circle cx="18" cy="20" r="3" fill="white" />
      <circle cx="46" cy="20" r="3" fill="white" />
      <path
        d="M16 49c9.2 0 14.4-3.6 18.5-9.4"
        fill="none"
        opacity="0.42"
        stroke="white"
        strokeLinecap="round"
        strokeWidth="2.5"
      />
    </svg>
  );
}
