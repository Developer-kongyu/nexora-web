import { Camera, ImagePlus, Trash2 } from 'lucide-react';
import {
  MEDIA_IMAGE_MAX_BYTES,
  MediaImageFileInput,
  mediaImageSelectionLabel,
  type MediaImageRole,
  type MediaImageSelection,
} from '@/domains/media';
import styles from './CommunityCreatePage.module.css';

interface CommunityImageFieldProps {
  kind: MediaImageRole;
  selection: MediaImageSelection | null;
  disabled: boolean;
  onSelect: (file: File) => void;
  onRemove: () => void;
}

export function CommunityImageField({
  kind,
  selection,
  disabled,
  onSelect,
  onRemove,
}: CommunityImageFieldProps) {
  const isCover = kind === 'cover';
  const title = isCover ? '上传社群封面' : '上传头像';
  const maxMegabytes = MEDIA_IMAGE_MAX_BYTES / (1024 * 1024);

  return (
    <div className={isCover ? styles.coverField : styles.avatarField}>
      <label className={isCover ? styles.cover : styles.avatar}>
        {selection ? (
          <img
            className={isCover ? styles.coverPreview : styles.avatarPreview}
            src={selection.previewUrl}
            alt={isCover ? '社群封面预览' : '社群头像预览'}
          />
        ) : isCover ? (
          <>
            <ImagePlus size={24} />
            <strong>{title}</strong>
            <span>建议 1600 × 600，JPG、PNG 或 WebP，最大 {maxMegabytes}MB</span>
          </>
        ) : (
          <>
            <Camera size={20} />
            <span>{title}</span>
          </>
        )}
        <MediaImageFileInput
          className={styles.hiddenInput}
          disabled={disabled}
          aria-label={title}
          onFileSelected={onSelect}
        />
      </label>
      {selection ? (
        <>
          <button
            className={isCover ? styles.removeCover : styles.removeAvatar}
            type="button"
            aria-label={`移除${isCover ? '封面' : '头像'}`}
            disabled={disabled}
            onClick={onRemove}
          >
            <Trash2 size={14} />
          </button>
          <div
            className={isCover ? styles.coverStatus : styles.avatarStatus}
            data-error={selection.stage === 'ERROR'}
            data-ready={selection.stage === 'READY'}
            aria-live="polite"
          >
            {mediaImageSelectionLabel(selection, {
              selectedLabel: '已选择，提交时上传',
              errorFallback: '上传失败，可再次提交重试',
            })}
          </div>
          {selection.stage === 'UPLOADING' ? (
            <div className={isCover ? styles.coverProgress : styles.avatarProgress}>
              <span style={{ width: `${selection.progress}%` }} />
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
