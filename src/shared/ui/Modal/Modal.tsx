import { X } from 'lucide-react';
import {
  useEffect,
  useId,
  useRef,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import styles from './Modal.module.css';

interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  children?: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
}

export function Modal({
  open,
  title,
  description,
  children,
  onClose,
  footer,
}: ModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;

    const ownerDocument = dialog.ownerDocument;
    const HTMLElementConstructor = ownerDocument.defaultView?.HTMLElement;
    const activeElement = ownerDocument.activeElement;
    const previouslyFocused =
      HTMLElementConstructor && activeElement instanceof HTMLElementConstructor
        ? activeElement
        : null;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    ownerDocument.addEventListener('keydown', handleKeyDown);
    closeButtonRef.current?.focus();

    return () => {
      ownerDocument.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleBackdropMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  return (
    <div className={styles.backdrop} role="presentation" onMouseDown={handleBackdropMouseDown}>
      <section
        ref={dialogRef}
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
      >
        <header>
          <div>
            <h2 id={titleId}>{title}</h2>
            {description ? <p id={descriptionId}>{description}</p> : null}
          </div>
          <button ref={closeButtonRef} type="button" aria-label="关闭" onClick={onClose}>
            <X size={20} />
          </button>
        </header>
        {children ? <div className={styles.body}>{children}</div> : null}
        {footer ? <footer>{footer}</footer> : null}
      </section>
    </div>
  );
}
