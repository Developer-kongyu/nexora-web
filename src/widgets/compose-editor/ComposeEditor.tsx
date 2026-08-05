import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import {
  AtSign,
  CalendarClock,
  FileImage,
  Globe2,
  Link2,
  MapPin,
  RefreshCw,
  Smile,
  Sparkles,
  X,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/domains/auth';
import { communitiesApi, communityKeys } from '@/domains/communities';
import {
  MEDIA_POST_ACCEPT,
  MEDIA_POST_MAX_FILES,
  postMediaUploadStatusLabel,
  uploadPostMediaQueueItem,
  useUploadQueueStore,
  validatePostMediaFile,
  type UploadItem,
} from '@/domains/media';
import {
  buildPostComposeInput,
  fingerprintPostCompose,
  hasPostComposeContent,
  useAutosavePostDraft,
  useCreatePostDraft,
  usePost,
  usePostDraft,
  usePublishPost,
  usePublishPostDraft,
  useSavePostDraft,
  type PostComposeInput,
  type PostDraftDetailView,
  type PostPublishState,
} from '@/domains/posts';
import { paths } from '@/shared/config/paths';
import { isApiError } from '@/shared/api/errors';
import { createAbortError, getErrorMessage } from '@/shared/lib/error';
import { formatDateTime } from '@/shared/lib/format';
import { settleBatch } from '@/shared/lib/settleBatch';
import { Avatar, Button, EmptyState, Select, Spinner, useToast } from '@/shared/ui';
import {
  composeEditorSchema,
  DEFAULT_COMPOSE_EDITOR_VALUES,
  draftComposeToEditorValues,
  getDraftMediaAssetIds,
  optionalGeneralPermission,
  optionalSourcePermission,
  optionalVisibility,
  type ComposeEditorValues,
} from './composeEditor.model';
import styles from './ComposeEditor.module.css';

interface ComposeEditorFormProps {
  initialDraft: PostDraftDetailView | null;
  initialCommunityId: string;
  initialQuotePostId: string | null;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';
type ActiveAction = 'save' | 'publish' | null;

interface UploadSettlement {
  mediaAssetIds: string[];
  failedItems: UploadItem[];
}

function draftErrorDescription(error: unknown): string {
  if (isApiError(error) && error.code === 'POST_DRAFT_VERSION_CONFLICT') {
    return '草稿已在其他位置更新，请重新加载后再继续编辑。';
  }
  return getErrorMessage(error, '草稿保存失败，请稍后重试。');
}

function ComposeEditorForm({
  initialDraft,
  initialCommunityId,
  initialQuotePostId,
}: ComposeEditorFormProps) {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { showToast } = useToast();
  const uploadItems = useUploadQueueStore((state) => state.items);
  const addFiles = useUploadQueueStore((state) => state.addFiles);
  const removeUpload = useUploadQueueStore((state) => state.remove);
  const updateUpload = useUploadQueueStore((state) => state.update);
  const clearUploads = useUploadQueueStore((state) => state.clear);

  const createDraftMutation = useCreatePostDraft();
  const autosaveDraftMutation = useAutosavePostDraft();
  const saveDraftMutation = useSavePostDraft();
  const publishDraftMutation = usePublishPostDraft();
  const publishPostMutation = usePublishPost();

  const initialValues = initialDraft
    ? draftComposeToEditorValues(initialDraft.composeSnapshot)
    : { ...DEFAULT_COMPOSE_EDITOR_VALUES, communityId: initialCommunityId };
  const initialCompose = initialDraft?.composeSnapshot ?? null;

  const form = useForm<ComposeEditorValues>({
    resolver: zodResolver(composeEditorSchema),
    defaultValues: initialValues,
  });
  const content = useWatch({ control: form.control, name: 'content' });
  const communityId = useWatch({ control: form.control, name: 'communityId' });
  const visibility = useWatch({ control: form.control, name: 'visibility' });
  const commentPermission = useWatch({
    control: form.control,
    name: 'commentPermission',
  });
  const quotePermission = useWatch({ control: form.control, name: 'quotePermission' });
  const repostPermission = useWatch({ control: form.control, name: 'repostPermission' });

  const [draftId, setDraftId] = useState(initialDraft?.draftId ?? null);
  const [draftVersion, setDraftVersion] = useState(initialDraft?.draftVersion ?? null);
  const [persistedMediaAssetIds, setPersistedMediaAssetIds] = useState(() =>
    initialCompose ? getDraftMediaAssetIds(initialCompose) : [],
  );
  const [quotePostId, setQuotePostId] = useState(
    initialCompose?.quoteOfPostId ?? initialQuotePostId,
  );
  const [saveState, setSaveState] = useState<SaveState>(initialDraft ? 'saved' : 'idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState(
    initialDraft?.lastSavedAtIso ?? initialDraft?.lastAutosavedAtIso ?? null,
  );
  const [lastSavedFingerprint, setLastSavedFingerprint] = useState(() =>
    initialCompose ? fingerprintPostCompose(initialCompose) : '',
  );
  const [activeAction, setActiveAction] = useState<ActiveAction>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadAbortControllerRef = useRef(new AbortController());
  const activeUploadsRef = useRef(new Map<string, Promise<string>>());

  const communitiesQuery = useQuery({
    queryKey: communityKeys.composeOptions,
    queryFn: ({ signal }) => communitiesApi.list(undefined, signal),
  });
  const quotePostQuery = usePost(quotePostId ?? '');

  const joinedCommunities = useMemo(
    () => communitiesQuery.data?.list.filter((community) => community.joined) ?? [],
    [communitiesQuery.data],
  );

  const readyLocalMediaIds = useMemo(
    () =>
      uploadItems.flatMap((item) =>
        item.status === 'ready' && item.mediaAssetId ? [item.mediaAssetId] : [],
      ),
    [uploadItems],
  );

  const currentCompose = useMemo(
    () =>
      buildPostComposeInput({
        bodyText: content,
        mediaAssetIds: [...persistedMediaAssetIds, ...readyLocalMediaIds],
        visibility: optionalVisibility(visibility),
        communityId,
        commentPermission: optionalGeneralPermission(commentPermission),
        quotePermission: optionalSourcePermission(quotePermission),
        repostPermission: optionalSourcePermission(repostPermission),
        quoteOfPostId: quotePostId,
      }),
    [
      commentPermission,
      communityId,
      content,
      persistedMediaAssetIds,
      quotePermission,
      quotePostId,
      readyLocalMediaIds,
      repostPermission,
      visibility,
    ],
  );
  const currentFingerprint = useMemo(
    () => fingerprintPostCompose(currentCompose),
    [currentCompose],
  );
  const hasPendingMedia = uploadItems.some(
    (item) => item.status !== 'ready' && item.status !== 'failed',
  );
  const hasFailedMedia = uploadItems.some((item) => item.status === 'failed');

  const uploadItem = useCallback(
    (item: UploadItem): Promise<string> => {
      const activeUpload = activeUploadsRef.current.get(item.clientUploadId);
      if (activeUpload !== undefined) return activeUpload;

      const trackedUpload = uploadPostMediaQueueItem({
        item,
        signal: uploadAbortControllerRef.current.signal,
        update: updateUpload,
      }).finally(() => {
        activeUploadsRef.current.delete(item.clientUploadId);
      });
      activeUploadsRef.current.set(item.clientUploadId, trackedUpload);
      return trackedUpload;
    },
    [updateUpload],
  );

  const startUploads = useCallback(
    async (items: readonly UploadItem[]) => {
      const results = await settleBatch(items, uploadItem, 3);
      if (results.some((result) => result.status === 'rejected')) {
        showToast({
          tone: 'error',
          title: '部分媒体上传失败',
          description: '可在媒体卡片中重试，草稿不会引用失败的文件。',
        });
      }
    },
    [showToast, uploadItem],
  );

  const settleUploads = useCallback(async (): Promise<UploadSettlement> => {
    const latestItems = useUploadQueueStore.getState().items;
    const results = await settleBatch(latestItems, uploadItem, 3);
    return {
      mediaAssetIds: results.flatMap((result) =>
        result.status === 'fulfilled' ? [result.value] : [],
      ),
      failedItems: results.flatMap((result) =>
        result.status === 'rejected' ? [result.input] : [],
      ),
    };
  }, [uploadItem]);

  const buildLatestCompose = useCallback(
    (localMediaAssetIds: readonly string[]): PostComposeInput => {
      const values = form.getValues();
      return buildPostComposeInput({
        bodyText: values.content,
        mediaAssetIds: [...persistedMediaAssetIds, ...localMediaAssetIds],
        visibility: optionalVisibility(values.visibility),
        communityId: values.communityId,
        commentPermission: optionalGeneralPermission(values.commentPermission),
        quotePermission: optionalSourcePermission(values.quotePermission),
        repostPermission: optionalSourcePermission(values.repostPermission),
        quoteOfPostId: quotePostId,
      });
    },
    [form, persistedMediaAssetIds, quotePostId],
  );

  const runAutosave = useCallback(async () => {
    if (!draftId || draftVersion === null) return;
    setSaveState('saving');
    setSaveError(null);
    try {
      const result = await autosaveDraftMutation.mutateAsync({
        draftId,
        draftVersion,
        compose: currentCompose,
      });
      setDraftVersion(result.draftVersion);
      setLastSavedFingerprint(currentFingerprint);
      setLastSavedAt(result.updatedAtIso);
      setSaveState('saved');
    } catch (error) {
      setSaveError(draftErrorDescription(error));
      setSaveState('error');
    }
  }, [autosaveDraftMutation, currentCompose, currentFingerprint, draftId, draftVersion]);

  useEffect(() => {
    const uploadAbortController = new AbortController();
    uploadAbortControllerRef.current = uploadAbortController;
    return () => {
      uploadAbortController.abort(createAbortError('发帖编辑器已卸载。'));
      clearUploads();
    };
  }, [clearUploads]);

  useEffect(() => {
    if (
      !draftId ||
      draftVersion === null ||
      !hasPostComposeContent(currentCompose) ||
      currentFingerprint === lastSavedFingerprint ||
      autosaveDraftMutation.isPending ||
      saveDraftMutation.isPending ||
      publishDraftMutation.isPending ||
      publishPostMutation.isPending
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      void runAutosave();
    }, 1_500);
    return () => window.clearTimeout(timer);
  }, [
    autosaveDraftMutation.isPending,
    currentCompose,
    currentFingerprint,
    draftId,
    draftVersion,
    lastSavedFingerprint,
    publishDraftMutation.isPending,
    publishPostMutation.isPending,
    runAutosave,
    saveDraftMutation.isPending,
  ]);

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = '';

    const acceptedFiles: File[] = [];
    for (const file of selectedFiles) {
      const validation = validatePostMediaFile(file);
      if (validation.valid) acceptedFiles.push(file);
      else {
        showToast({
          tone: 'error',
          title: validation.title,
          description: `${file.name}：${validation.description}`,
        });
      }
    }

    const availableSlots = Math.max(
      0,
      MEDIA_POST_MAX_FILES - persistedMediaAssetIds.length - uploadItems.length,
    );
    if (acceptedFiles.length > availableSlots) {
      showToast({
        tone: 'warning',
        title: '媒体数量已达上限',
        description: `每条帖子最多添加 ${MEDIA_POST_MAX_FILES} 个媒体文件。`,
      });
    }

    const addedItems = addFiles(acceptedFiles.slice(0, availableSlots));
    void startUploads(addedItems);
  };

  const saveCompose = useCallback(
    async (compose: PostComposeInput) => {
      if (!hasPostComposeContent(compose)) {
        throw new Error('正文、媒体或链接至少需要填写一项。');
      }

      if (draftId && draftVersion !== null) {
        const result = await saveDraftMutation.mutateAsync({
          draftId,
          draftVersion,
          compose,
        });
        setDraftVersion(result.draftVersion);
        setLastSavedFingerprint(fingerprintPostCompose(compose));
        setLastSavedAt(result.lastSavedAtIso ?? result.updatedAtIso);
        return { draftId, draftVersion: result.draftVersion };
      }

      const result = await createDraftMutation.mutateAsync(compose);
      setDraftId(result.draftId);
      setDraftVersion(result.draftVersion);
      setLastSavedFingerprint(fingerprintPostCompose(compose));
      setLastSavedAt(result.updatedAtIso);
      return { draftId: result.draftId, draftVersion: result.draftVersion };
    },
    [createDraftMutation, draftId, draftVersion, saveDraftMutation],
  );

  const handleSaveDraft = async () => {
    const isValid = await form.trigger();
    if (!isValid) return;
    setActiveAction('save');
    setSaveState('saving');
    setSaveError(null);
    try {
      const uploadSettlement = await settleUploads();
      const compose = buildLatestCompose(uploadSettlement.mediaAssetIds);
      const result = await saveCompose(compose);
      setSaveState('saved');
      showToast({
        tone: uploadSettlement.failedItems.length ? 'warning' : 'success',
        title: uploadSettlement.failedItems.length ? '草稿已保存，部分媒体未写入' : '草稿已保存',
        description: uploadSettlement.failedItems.length
          ? `已保留正文和上传成功的媒体；${uploadSettlement.failedItems.length} 个失败文件可重试或移除。`
          : '可在内容中心继续编辑和发布。',
      });
      if (!initialDraft) {
        void navigate(paths.composeDraft(result.draftId), { replace: true });
      }
    } catch (error) {
      const description = draftErrorDescription(error);
      setSaveError(description);
      setSaveState('error');
      showToast({ tone: 'error', title: '草稿保存失败', description });
    } finally {
      setActiveAction(null);
    }
  };

  const handlePublish = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const isValid = await form.trigger();
    if (!isValid) return;
    setActiveAction('publish');
    setSaveError(null);
    try {
      const uploadSettlement = await settleUploads();
      if (uploadSettlement.failedItems.length) {
        throw new Error(
          `有 ${uploadSettlement.failedItems.length} 个媒体上传失败，请重试或移除后再发布。`,
        );
      }
      const compose = buildLatestCompose(uploadSettlement.mediaAssetIds);
      if (!hasPostComposeContent(compose)) {
        throw new Error('正文、媒体或链接至少需要填写一项。');
      }

      let result: { postId: string; publishState: PostPublishState };
      if (draftId && draftVersion !== null) {
        const fingerprint = fingerprintPostCompose(compose);
        if (fingerprint !== lastSavedFingerprint) {
          await saveCompose(compose);
        }
        result = await publishDraftMutation.mutateAsync({
          draftId,
          input: { allowWaitingMediaPublish: true },
        });
      } else {
        result = await publishPostMutation.mutateAsync({
          ...compose,
          allowWaitingMediaPublish: true,
        });
      }

      clearUploads();
      showToast({
        tone: 'success',
        title: result.publishState === 'PUBLISHED' ? '帖子发布成功' : '帖子已进入发布队列',
        description:
          result.publishState === 'PUBLISHED'
            ? '内容已同步到你的主页和可见用户时间线。'
            : '媒体处理完成后会自动发布，无需重复提交。',
      });
      void navigate(paths.post(result.postId));
    } catch (error) {
      showToast({
        tone: 'error',
        title: '帖子发布失败',
        description: getErrorMessage(error, '请稍后重试。'),
      });
    } finally {
      setActiveAction(null);
    }
  };

  const saveStatusText = (() => {
    if (!draftId) return '首次保存后将启用自动保存';
    if (saveState === 'saving') return '正在保存草稿…';
    if (saveState === 'error') return saveError ?? '草稿保存失败';
    if (currentFingerprint !== lastSavedFingerprint) {
      return hasFailedMedia
        ? '有未保存修改；上传失败的媒体不会写入草稿'
        : '有未保存修改，将自动保存';
    }
    if (hasPendingMedia) return '媒体上传中，完成后将自动保存';
    if (hasFailedMedia) return '存在上传失败的媒体，当前草稿未引用这些文件';
    if (lastSavedAt) return `已保存于 ${formatDateTime(lastSavedAt)}`;
    return '草稿已创建，后续修改将自动保存';
  })();

  const isBusy =
    activeAction !== null ||
    createDraftMutation.isPending ||
    autosaveDraftMutation.isPending ||
    saveDraftMutation.isPending ||
    publishDraftMutation.isPending ||
    publishPostMutation.isPending;

  return (
    <section className={styles.shell}>
      {quotePostId ? (
        <div className={styles.context}>
          <span className={styles.contextBar} />
          <div>
            <small>引用帖子</small>
            {quotePostQuery.isLoading ? (
              <span>正在读取引用内容…</span>
            ) : quotePostQuery.data ? (
              <>
                <strong>
                  {quotePostQuery.data.author.displayName} · @{quotePostQuery.data.author.handle}
                </strong>
                <p>{quotePostQuery.data.content || '该帖子没有文字正文。'}</p>
              </>
            ) : (
              <p>引用内容暂时不可用，发布时仍会由服务端重新校验。</p>
            )}
          </div>
          <button type="button" aria-label="移除引用" onClick={() => setQuotePostId(null)}>
            <X size={17} />
          </button>
        </div>
      ) : null}

      <form
        onSubmit={(event) => {
          void handlePublish(event);
        }}
      >
        <div className={styles.identity}>
          <Avatar
            fallback={user?.displayName.slice(0, 1) || '我'}
            alt={user?.displayName || '当前用户'}
            src={user?.avatarUrl}
          />
          <div>
            <strong>{user?.displayName || '当前用户'}</strong>
            <span>@{user?.handle || 'current-user'}</span>
          </div>
          <label className={styles.audience}>
            <Globe2 size={15} />
            <select {...form.register('visibility')} aria-label="可见范围">
              <option value="">使用隐私默认设置</option>
              <option value="PUBLIC">公开</option>
              <option value="UNLISTED">不公开推荐</option>
              <option value="FOLLOWERS">仅关注者</option>
              <option value="PRIVATE">仅自己</option>
            </select>
          </label>
        </div>

        <div className={styles.editorWrap}>
          <textarea
            {...form.register('content')}
            placeholder="分享此刻的想法、发现或作品…"
            aria-label="帖子正文"
          />
          <div className={styles.counter} data-warning={content.length > 900}>
            {content.length} / 1000
          </div>
          {form.formState.errors.content ? (
            <p className={styles.error}>{form.formState.errors.content.message}</p>
          ) : null}
        </div>

        <div className={styles.tools}>
          <div>
            <button type="button" onClick={() => fileInputRef.current?.click()}>
              <FileImage size={18} />
              <span>图片/视频</span>
            </button>
            <button
              type="button"
              onClick={() =>
                form.setValue('content', `${content}${content ? ' ' : ''}🙂`, {
                  shouldDirty: true,
                })
              }
            >
              <Smile size={18} />
              <span>表情</span>
            </button>
            <button
              type="button"
              onClick={() =>
                form.setValue('content', `${content}${content ? '\n' : ''}https://`, {
                  shouldDirty: true,
                })
              }
            >
              <Link2 size={18} />
              <span>链接</span>
            </button>
            <button
              type="button"
              onClick={() =>
                form.setValue('content', `${content}${content ? ' ' : ''}@`, {
                  shouldDirty: true,
                })
              }
            >
              <AtSign size={18} />
              <span>提及</span>
            </button>
            <button type="button" disabled title="地点检索接口尚未开放">
              <MapPin size={18} />
              <span>位置</span>
            </button>
            <button type="button" disabled title="定时发布接口尚未开放">
              <CalendarClock size={18} />
              <span>定时</span>
            </button>
          </div>
          <button type="button" className={styles.polish} disabled title="智能润色服务尚未开放">
            <Sparkles size={17} />
            <span>智能润色</span>
          </button>
          <input
            ref={fileInputRef}
            className={styles.hiddenInput}
            type="file"
            multiple
            accept={MEDIA_POST_ACCEPT}
            onChange={handleFiles}
          />
        </div>

        {persistedMediaAssetIds.length || uploadItems.length ? (
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
                    onClick={() =>
                      setPersistedMediaAssetIds((current) =>
                        current.filter((id) => id !== mediaAssetId),
                      )
                    }
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
                    onClick={() => removeUpload(item.clientUploadId)}
                  >
                    <X size={15} />
                  </button>
                  <div className={styles.mediaStatus}>
                    <span>{postMediaUploadStatusLabel(item)}</span>
                    {item.status === 'failed' ? (
                      <button
                        type="button"
                        className={styles.retryMedia}
                        onClick={() => void startUploads([item])}
                      >
                        <RefreshCw size={12} /> 重试
                      </button>
                    ) : null}
                    <i style={{ width: `${item.status === 'ready' ? 100 : item.progress}%` }} />
                  </div>
                </article>
              ))}
              {persistedMediaAssetIds.length + uploadItems.length < MEDIA_POST_MAX_FILES ? (
                <button
                  type="button"
                  className={styles.addMedia}
                  onClick={() => fileInputRef.current?.click()}
                >
                  +<span>继续添加</span>
                </button>
              ) : null}
            </div>
          </section>
        ) : null}

        <section className={styles.settings}>
          <header>
            <h2>发布设置</h2>
            <p>精细控制帖子出现的位置与互动权限</p>
          </header>
          <div className={styles.settingsGrid}>
            <Select
              label="发布到社群"
              {...form.register('communityId')}
              disabled={communitiesQuery.isLoading}
            >
              <option value="">不投递社群</option>
              {communityId && !joinedCommunities.some((item) => item.id === communityId) ? (
                <option value={communityId}>当前草稿中的社群</option>
              ) : null}
              {joinedCommunities.map((community) => (
                <option key={community.id} value={community.id}>
                  {community.name}
                </option>
              ))}
            </Select>
            <Select label="评论权限" {...form.register('commentPermission')}>
              <option value="">使用隐私默认设置</option>
              <option value="EVERYONE">所有人</option>
              <option value="FOLLOWING">我关注的人</option>
              <option value="MUTUALS">互相关注</option>
              <option value="NO_ONE">关闭评论</option>
            </Select>
            <Select label="引用权限" {...form.register('quotePermission')}>
              <option value="">使用隐私默认设置</option>
              <option value="EVERYONE">允许所有人引用</option>
              <option value="FOLLOWING">仅我关注的人</option>
              <option value="NO_ONE">禁止引用</option>
            </Select>
            <Select label="转发权限" {...form.register('repostPermission')}>
              <option value="">使用隐私默认设置</option>
              <option value="EVERYONE">允许所有人转发</option>
              <option value="FOLLOWING">仅我关注的人</option>
              <option value="NO_ONE">禁止转发</option>
            </Select>
          </div>
        </section>

        <footer className={styles.footer}>
          <span data-state={saveState} aria-live="polite">
            {saveStatusText}
          </span>
          <div>
            <Button
              type="button"
              variant="secondary"
              loading={activeAction === 'save'}
              disabled={isBusy && activeAction !== 'save'}
              onClick={() => void handleSaveDraft()}
            >
              保存草稿
            </Button>
            <Button
              type="submit"
              loading={activeAction === 'publish'}
              disabled={isBusy && activeAction !== 'publish'}
            >
              发布帖子
            </Button>
          </div>
        </footer>
      </form>
    </section>
  );
}

export function ComposeEditor() {
  const { draftId: routeDraftId } = useParams<{ draftId?: string }>();
  const [searchParams] = useSearchParams();
  const draftQuery = usePostDraft(routeDraftId);

  if (routeDraftId && draftQuery.isLoading) {
    return (
      <section className={styles.loading}>
        <Spinner label="正在读取草稿" />
      </section>
    );
  }

  if (routeDraftId && draftQuery.isError) {
    return (
      <section className={styles.loading}>
        <EmptyState
          title="无法读取草稿"
          description={draftErrorDescription(draftQuery.error)}
          action={
            <Button variant="secondary" onClick={() => void draftQuery.refetch()}>
              重新加载
            </Button>
          }
        />
      </section>
    );
  }

  const initialCommunityId = searchParams.get('community') ?? '';
  const initialQuotePostId = searchParams.get('quotePostId');

  return (
    <ComposeEditorForm
      key={routeDraftId ?? 'new-compose'}
      initialDraft={draftQuery.data ?? null}
      initialCommunityId={initialCommunityId}
      initialQuotePostId={initialQuotePostId}
    />
  );
}
