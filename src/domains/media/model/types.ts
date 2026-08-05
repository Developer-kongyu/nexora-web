export const MEDIA_ASSET_KINDS = ['IMAGE', 'VIDEO'] as const;
export type MediaAssetKind = (typeof MEDIA_ASSET_KINDS)[number];

export type UploadableMediaKind = MediaAssetKind;
export type MediaImageRole = 'avatar' | 'cover';

export type MediaAssetScene =
  'POST_COMPOSE' | 'USER_AVATAR' | 'USER_COVER' | 'COMMUNITY_AVATAR' | 'COMMUNITY_COVER';

export type MediaAssetStatus =
  | 'LOCAL'
  | 'UPLOADING'
  | 'UPLOADED'
  | 'PROCESS_SUBMITTING'
  | 'PROCESSING'
  | 'TRANSCODE_SUBMITTING'
  | 'TRANSCODING'
  | 'READY'
  | 'FAILED';

export interface CreateMediaUploadSessionItem {
  clientUploadId: string;
  scene: MediaAssetScene;
  fileName: string;
  contentType: string;
  sizeInBytes: string;
  assetKind: UploadableMediaKind;
}

export interface StorageUploadTicket {
  token: string;
  objectKey: string;
  bucket: string;
  uploadSessionRevision: string;
  region: string;
  expiresInSeconds: number;
  expiresAtIso: string;
  sdkScriptUrl: string | null;
  recommendedClientConfig: {
    useCdnDomain: boolean;
    checkByMD5: boolean;
    forceDirect: boolean;
    chunkSizeMB: number;
  };
}

interface MediaUploadSessionResultBase {
  clientUploadId: string;
  scene: MediaAssetScene;
  assetKind: UploadableMediaKind;
}

export type CreateMediaUploadSessionResult =
  | (MediaUploadSessionResultBase & {
      resultType: 'CREATED' | 'REPLAYED';
      mediaAssetId: string;
      currentAssetStatus: 'UPLOADING';
      ticket: StorageUploadTicket;
      errorCode: null;
      errorMessage: null;
    })
  | (MediaUploadSessionResultBase & {
      resultType: 'REJECTED';
      mediaAssetId: string | null;
      currentAssetStatus: MediaAssetStatus | null;
      ticket: null;
      errorCode: string;
      errorMessage: string | null;
    });

export interface CreateMediaUploadSessionsInput {
  items: CreateMediaUploadSessionItem[];
}

export interface CreateMediaUploadSessionsResult {
  results: CreateMediaUploadSessionResult[];
}

export interface ConfirmMediaAssetUploadedInput {
  mediaAssetId: string;
  uploadSessionRevision: string;
  clientUploadId: string;
  clientSha256: string | null;
  contentType: string | null;
  sizeInBytes: string | null;
  originWidth: number | null;
  originHeight: number | null;
  durationMs: number | null;
}

export type MediaProcessingAction =
  | 'IMAGE_PROCESS_ENQUEUED'
  | 'VIDEO_TRANSCODE_ENQUEUED'
  | 'IMAGE_PROCESS_ALREADY_REQUESTED'
  | 'VIDEO_TRANSCODE_ALREADY_REQUESTED'
  | 'NONE';

export interface ConfirmMediaAssetUploadedResult {
  mediaAssetId: string;
  assetKind: UploadableMediaKind;
  currentAssetStatus: MediaAssetStatus;
  idempotent: boolean;
  processingAction: MediaProcessingAction;
}

export type MediaProcessingRetryCommand =
  'IMAGE_PROCESS_REQUESTED' | 'VIDEO_TRANSCODE_REQUESTED' | 'NONE';

export interface RetryMediaAssetProcessingResult {
  mediaAssetId: string;
  assetKind: UploadableMediaKind;
  currentAssetStatus: MediaAssetStatus;
  idempotent: boolean;
  requeuedCommand: MediaProcessingRetryCommand;
}

export interface MediaUploadCheckpoint {
  scene: MediaAssetScene;
  assetKind: UploadableMediaKind;
  fileName: string;
  fileLastModified: number;
  storageKey: string;
  ticket: StorageUploadTicket;
  confirmation: ConfirmMediaAssetUploadedInput;
  objectUploaded: boolean;
}

export type MediaUploadLifecycleStage =
  'REQUESTING_SESSION' | 'UPLOADING' | 'CONFIRMING' | 'RETRYING' | 'PROCESSING' | 'READY';

export type MediaImageSelectionStage = 'SELECTED' | 'ERROR' | MediaUploadLifecycleStage;

export type MediaImageSelectionPatch =
  Partial<MediaImageSelection> | ((current: MediaImageSelection) => Partial<MediaImageSelection>);

export type MediaImageSelectionUpdate = (
  clientUploadId: string,
  patch: MediaImageSelectionPatch,
) => void;

export interface MediaImageSelectionController {
  selection: MediaImageSelection | null;
  select: (file: File) => boolean;
  update: MediaImageSelectionUpdate;
  clear: () => void;
}

export interface MediaImageSelection {
  file: File;
  previewUrl: string;
  clientUploadId: string;
  stage: MediaImageSelectionStage;
  progress: number;
  checkpoint: MediaUploadCheckpoint | null;
  storageKey: string | null;
  errorMessage: string | null;
}

export type UploadStatus =
  'local' | 'creating-session' | 'uploading' | 'confirming' | 'processing' | 'ready' | 'failed';

export interface UploadItem {
  clientUploadId: string;
  file: File;
  previewUrl: string;
  assetKind: UploadableMediaKind;
  progress: number;
  status: UploadStatus;
  mediaAssetId?: string;
  checkpoint?: MediaUploadCheckpoint;
  error?: string;
}

export interface UploadReadyMediaFileResult {
  mediaAssetId: string;
  storageKey: string;
  confirmation: ConfirmMediaAssetUploadedInput;
}
