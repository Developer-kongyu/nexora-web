import styles from './Spinner.module.css';
export function Spinner({ label = '加载中' }: { label?: string }) {
  return (
    <span className={styles.wrap} role="status">
      <span className={styles.spinner} />
      <span>{label}</span>
    </span>
  );
}
