import { formatDistanceToNowStrict } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export type DateInput = string | number | Date;

const numberFormatter = new Intl.NumberFormat('zh-CN', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

export function formatCount(value: number): string {
  return numberFormatter.format(value);
}

export function formatRelativeTime(value: DateInput): string {
  return formatDistanceToNowStrict(new Date(value), { addSuffix: true, locale: zhCN });
}

export function formatDate(value: DateInput): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

export function formatDateTime(value: DateInput): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}
