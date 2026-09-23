import type { ReactNode } from 'react';
import styles from './SideCard.module.css';
interface SideCardProps {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}

export function SideCard({ title, children, action }: SideCardProps) {
  return (
    <section className={styles.sideCard}>
      <header className={styles.sideCardHeader}>
        <h2>{title}</h2>
        {action}
      </header>
      {children}
    </section>
  );
}
