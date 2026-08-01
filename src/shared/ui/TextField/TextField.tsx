import { forwardRef, type InputHTMLAttributes, type Ref, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';
import styles from './TextField.module.css';

interface BaseProps {
  label: string;
  hint?: string;
  error?: string;
  className?: string;
}
type InputProps = BaseProps & InputHTMLAttributes<HTMLInputElement> & { multiline?: false };
type TextareaProps = BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement> & { multiline: true };
export type TextFieldProps = InputProps | TextareaProps;

export const TextField = forwardRef<HTMLInputElement | HTMLTextAreaElement, TextFieldProps>(
  function TextField({ label, hint, error, className, multiline, ...props }, ref) {
    const id = props.id ?? props.name;
    return (
      <label className={cn(styles.field, className)} htmlFor={id}>
        <span className={styles.label}>{label}</span>
        {multiline ? (
          <textarea
            ref={ref as Ref<HTMLTextAreaElement>}
            className={cn(styles.control, styles.textarea, error && styles.invalid)}
            {...(props as TextareaHTMLAttributes<HTMLTextAreaElement>)}
            id={id}
          />
        ) : (
          <input
            ref={ref as Ref<HTMLInputElement>}
            className={cn(styles.control, error && styles.invalid)}
            {...(props as InputHTMLAttributes<HTMLInputElement>)}
            id={id}
          />
        )}
        {error ? (
          <span className={styles.error}>{error}</span>
        ) : hint ? (
          <span className={styles.hint}>{hint}</span>
        ) : null}
      </label>
    );
  },
);
