import type { ReactNode } from 'react';
import styles from './EmptyPanel.module.css';
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
