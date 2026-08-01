import { forwardRef, type SelectHTMLAttributes } from 'react';
import styles from './Select.module.css';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
}
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, children, ...props },
  ref,
) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <select ref={ref} {...props}>
        {children}
      </select>
    </label>
  );
});
