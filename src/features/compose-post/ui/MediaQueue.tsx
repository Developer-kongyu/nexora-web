import { FileImage, RefreshCw, X } from 'lucide-react';
import { MEDIA_POST_MAX_FILES, postMediaUploadStatusLabel, type UploadItem } from '@/domains/media';
import styles from './ComposeEditor.module.css';

interface MediaQueueProps {
  persistedMediaAssetIds: string[];
  uploadItems: UploadItem[];
  onRemovePersisted: (mediaAssetId: string) => void;
  onRemoveUpload: (clientUploadId: string) => void;
  onRetry: (item: UploadItem) => void;
  onAdd: () => void;
}

export function MediaQueue({
  persistedMediaAssetIds,
  uploadItems,
  onRemovePersisted,
  onRemoveUpload,
  onRetry,
  onAdd,
}: MediaQueueProps) {
  if (!persistedMediaAssetIds.length && !uploadItems.length) return null;
  return (
    <section className={styles.mediaQueue}>
      <header>
        <div>
          <h2>媒体队列</h2>
          <p>图片和视频会先上传并处理，完成后才能发布</p>
        </div>
        <span>
          {persistedMediaAssetIds.length + uploadItems.length} / {MEDIA_POST_MAX_FILES}
        </span>
      </header>
      <div className={styles.mediaGrid}>
        {persistedMediaAssetIds.map((mediaAssetId, index) => (
          <article key={mediaAssetId} className={styles.persistedMedia}>
            <FileImage size={28} />
            <strong>已保存媒体 {index + 1}</strong>
            <button
              type="button"
              aria-label={`移除已保存媒体 ${index + 1}`}
              onClick={() => onRemovePersisted(mediaAssetId)}
            >
              <X size={15} />
            </button>
            <div className={styles.mediaStatus}>
              <span>草稿中已保存</span>
              <i style={{ width: '100%' }} />
            </div>
          </article>
        ))}
        {uploadItems.map((item) => (
          <article key={item.clientUploadId}>
            {item.assetKind === 'VIDEO' ? (
              <video src={item.previewUrl} muted aria-label={item.file.name} />
            ) : (
              <img src={item.previewUrl} alt={item.file.name} />
            )}
            <button
              type="button"
              aria-label={`移除媒体 ${item.file.name}`}
              onClick={() => onRemoveUpload(item.clientUploadId)}
            >
              <X size={15} />
            </button>
            <div className={styles.mediaStatus}>
              <span>{postMediaUploadStatusLabel(item)}</span>
              {item.status === 'failed' ? (
                <button type="button" className={styles.retryMedia} onClick={() => onRetry(item)}>
                  <RefreshCw size={12} /> 重试
                </button>
              ) : null}
              <i style={{ width: `${item.status === 'ready' ? 100 : item.progress}%` }} />
            </div>
          </article>
        ))}
        {persistedMediaAssetIds.length + uploadItems.length < MEDIA_POST_MAX_FILES ? (
          <button type="button" className={styles.addMedia} onClick={onAdd}>
            +<span>继续添加</span>
          </button>
        ) : null}
      </div>
    </section>
  );
}
