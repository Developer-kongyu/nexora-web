import { Camera, ImagePlus, RotateCcw, Trash2, X } from 'lucide-react';
import {
  MediaImageFileInput,
  mediaImageSelectionLabel,
  type MediaImageRole,
  type MediaImageSelection,
} from '@/domains/media';
import type { ResolvedMediaState } from '@/shared/model/media';
import { Avatar, Button } from '@/shared/ui';
import { profileMediaStateLabel } from './profileEdit.model';
import styles from './ProfileEditPage.module.css';

interface ProfileImageFieldProps {
  kind: MediaImageRole;
  displayName: string;
  currentUrl: string | null;
  currentStorageKey: string | null;
  currentMediaState: ResolvedMediaState;
  selection: MediaImageSelection | null;
  removed: boolean;
  disabled: boolean;
  onSelect: (file: File) => void;
  onCancelSelection: () => void;
  onRemoveCurrent: () => void;
  onRestoreCurrent: () => void;
}

export function ProfileImageField({
  kind,
  displayName,
  currentUrl,
  currentStorageKey,
  currentMediaState,
  selection,
  removed,
  disabled,
  onSelect,
  onCancelSelection,
  onRemoveCurrent,
  onRestoreCurrent,
}: ProfileImageFieldProps) {
  const isCover = kind === 'cover';
  const source = removed ? null : (selection?.previewUrl ?? currentUrl);
  const hasCurrentMedia = Boolean(currentStorageKey || currentUrl);
  const chooseLabel = isCover ? '选择新封面' : '选择新头像';

  const statusText = selection
    ? mediaImageSelectionLabel(selection, {
        selectedLabel: '已选择，保存时上传',
        errorFallback: '上传失败，可再次保存重试',
      })
    : removed
      ? '保存后将移除当前图片'
      : profileMediaStateLabel(currentMediaState);

  if (isCover) {
    return (
      <div className={styles.coverField} data-removed={removed}>
        <div className={styles.coverVisual}>
          {source ? <img src={source} alt={`${displayName}的个人主页封面`} /> : null}
          <label className={styles.coverChoose} aria-disabled={disabled}>
            <ImagePlus size={18} /> {chooseLabel}
            <MediaImageFileInput
              className={styles.hiddenInput}
              disabled={disabled}
              aria-label={chooseLabel}
              onFileSelected={onSelect}
            />
          </label>
        </div>
        <div className={styles.mediaMeta} aria-live="polite">
          <span data-error={selection?.stage === 'ERROR'}>{statusText}</span>
          <div className={styles.mediaActions}>
            {selection ? (
              <Button size="sm" variant="ghost" disabled={disabled} onClick={onCancelSelection}>
                <X size={14} /> 取消更换
              </Button>
            ) : removed ? (
              <Button size="sm" variant="ghost" disabled={disabled} onClick={onRestoreCurrent}>
                <RotateCcw size={14} /> 撤销移除
              </Button>
            ) : hasCurrentMedia ? (
              <Button size="sm" variant="ghost" disabled={disabled} onClick={onRemoveCurrent}>
                <Trash2 size={14} /> 移除封面
              </Button>
            ) : null}
          </div>
        </div>
        {selection?.stage === 'UPLOADING' ? (
          <div className={styles.mediaProgress} aria-hidden="true">
            <span style={{ width: `${selection.progress}%` }} />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={styles.avatarField} data-removed={removed}>
      <div className={styles.avatarVisual}>
        <Avatar
          size="xl"
          fallback={displayName.trim().slice(0, 1) || '用'}
          alt={`${displayName || '当前用户'}的头像`}
          src={source}
        />
        <label className={styles.avatarChoose} aria-disabled={disabled}>
          <Camera size={16} />
          <span className={styles.srOnly}>{chooseLabel}</span>
          <MediaImageFileInput
            className={styles.hiddenInput}
            disabled={disabled}
            aria-label={chooseLabel}
            onFileSelected={onSelect}
          />
        </label>
      </div>
      <div className={styles.avatarDescription}>
        <strong>个人头像</strong>
        <p data-error={selection?.stage === 'ERROR'} aria-live="polite">
          {statusText}
        </p>
        <div className={styles.mediaActions}>
          {selection ? (
            <Button size="sm" variant="ghost" disabled={disabled} onClick={onCancelSelection}>
              <X size={14} /> 取消更换
            </Button>
          ) : removed ? (
            <Button size="sm" variant="ghost" disabled={disabled} onClick={onRestoreCurrent}>
              <RotateCcw size={14} /> 撤销移除
            </Button>
          ) : hasCurrentMedia ? (
            <Button size="sm" variant="ghost" disabled={disabled} onClick={onRemoveCurrent}>
              <Trash2 size={14} /> 移除头像
            </Button>
          ) : null}
        </div>
      </div>
      {selection?.stage === 'UPLOADING' ? (
        <div className={styles.mediaProgress} aria-hidden="true">
          <span style={{ width: `${selection.progress}%` }} />
        </div>
      ) : null}
    </div>
  );
}
