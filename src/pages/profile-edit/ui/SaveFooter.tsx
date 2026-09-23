import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/ui';
import styles from './SaveFooter.module.css';
interface SaveFooterProps {
  message?: string;
  onSave?: () => void;
  onCancel?: () => void;
  saving?: boolean;
  disabled?: boolean;
}

export function SaveFooter({
  message = '更改会在保存后生效',
  onSave,
  onCancel,
  saving = false,
  disabled = false,
}: SaveFooterProps) {
  const navigate = useNavigate();
  const handleCancel = onCancel ?? (() => navigate(-1));

  return (
    <div className={styles.formFooter}>
      <span>{message}</span>
      <div>
        <Button variant="secondary" type="button" disabled={saving} onClick={handleCancel}>
          取消
        </Button>
        <Button type="button" loading={saving} disabled={disabled} onClick={onSave}>
          保存更改
        </Button>
      </div>
    </div>
  );
}
