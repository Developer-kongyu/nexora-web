import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import styles from './AuthPages.module.css';

interface AuthFormShellProps {
  eyebrow?: string;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
  backTo?: string;
  status?: string;
}

export function AuthFormShell({
  eyebrow,
  title,
  description,
  children,
  footer,
  backTo,
  status,
}: AuthFormShellProps) {
  return (
    <section className={styles.formShell}>
      {backTo ? (
        <Link className={styles.back} to={backTo}>
          <ArrowLeft size={17} />
          返回登录
        </Link>
      ) : null}
      <header>
        {eyebrow ? <span className={styles.eyebrow}>{eyebrow}</span> : null}
        <h1>{title}</h1>
        <p>{description}</p>
      </header>
      {status ? (
        <div className={styles.status}>
          <CheckCircle2 size={18} />
          {status}
        </div>
      ) : null}
      {children}
      {footer ? <footer className={styles.footer}>{footer}</footer> : null}
    </section>
  );
}
