import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useAuthStore } from '@/domains/auth';
import { communitiesApi, communityKeys } from '@/domains/communities';
import {
  buildPostComposeInput,
  fingerprintPostCompose,
  hasPostComposeContent,
  usePost,
  type PostComposeInput,
} from '@/domains/posts';
import { getErrorMessage } from '@/shared/lib/error';
import { formatDateTime } from '@/shared/lib/format';
import { useToast } from '@/shared/ui';
import { composeEditorSchema, type ComposeEditorValues } from './compose.schema';
import {
  DEFAULT_COMPOSE_EDITOR_VALUES,
  draftComposeToEditorValues,
  getDraftMediaAssetIds,
  optionalGeneralPermission,
  optionalSourcePermission,
  optionalVisibility,
} from './composeForm';
import { draftErrorDescription } from './draftError';
import { useComposeUploads } from './useComposeUploads';
import { useDraftAutosave } from './useDraftAutosave';
import { usePublishPost } from './usePublishPost';
import type { ComposerOptions } from './types';

type ActiveAction = 'save' | 'publish' | null;

export function useComposer({
  initialDraft,
  initialCommunityId,
  initialQuotePostId,
  onDraftSaved,
  onPublished,
}: ComposerOptions) {
  const user = useAuthStore((state) => state.user);
  const { showToast } = useToast();
  const publishMutation = usePublishPost();
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

  const [persistedMediaAssetIds, setPersistedMediaAssetIds] = useState(() =>
    initialCompose ? getDraftMediaAssetIds(initialCompose) : [],
  );
  const [quotePostId, setQuotePostId] = useState(
    initialCompose?.quoteOfPostId ?? initialQuotePostId,
  );
  const [activeAction, setActiveAction] = useState<ActiveAction>(null);
  const actionRef = useRef<ActiveAction>(null);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  const uploads = useComposeUploads(persistedMediaAssetIds.length);
  const { readyLocalMediaIds, hasPendingMedia, hasFailedMedia, settleUploads, clearUploads } =
    uploads;
  const communitiesQuery = useQuery({
    queryKey: communityKeys.composeOptions,
    queryFn: ({ signal }) => communitiesApi.list(undefined, signal),
  });
  const quotePostQuery = usePost(quotePostId ?? '');

  const joinedCommunities = useMemo(
    () => communitiesQuery.data?.list.filter((community) => community.joined) ?? [],
    [communitiesQuery.data],
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
  const {
    draftId,
    saveState,
    setSaveState,
    saveError,
    setSaveError,
    lastSavedAt,
    lastSavedFingerprint,
    currentFingerprint,
    saveCompose,
    isSaving,
  } = useDraftAutosave({
    initialDraft,
    compose: currentCompose,
    blocked: activeAction !== null || publishMutation.isPending,
  });
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

  const handleSaveDraft = async () => {
    if (actionRef.current || isSaving) return;
    actionRef.current = 'save';
    setActiveAction('save');
    setSaveError(null);
    try {
      if (!(await form.trigger()) || !mountedRef.current) return;
      const uploadSettlement = await settleUploads();
      if (!mountedRef.current) return;
      const compose = buildLatestCompose(uploadSettlement.mediaAssetIds);
      const result = await saveCompose(compose);
      if (!mountedRef.current) return;
      setSaveState('saved');
      showToast({
        tone: uploadSettlement.failedItems.length ? 'warning' : 'success',
        title: uploadSettlement.failedItems.length ? '草稿已保存，部分媒体未写入' : '草稿已保存',
        description: uploadSettlement.failedItems.length
          ? `已保留正文和上传成功的媒体；${uploadSettlement.failedItems.length} 个失败文件可重试或移除。`
          : '可在内容中心继续编辑和发布。',
      });
      if (!initialDraft) {
        onDraftSaved?.(result.draftId);
      }
    } catch (error) {
      if (!mountedRef.current) return;
      const description = draftErrorDescription(error);
      setSaveError(description);
      setSaveState('error');
      showToast({ tone: 'error', title: '草稿保存失败', description });
    } finally {
      actionRef.current = null;
      if (mountedRef.current) setActiveAction(null);
    }
  };

  const handlePublish = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (actionRef.current || isSaving) return;
    actionRef.current = 'publish';
    setActiveAction('publish');
    setSaveError(null);
    try {
      if (!(await form.trigger()) || !mountedRef.current) return;
      const uploadSettlement = await settleUploads();
      if (!mountedRef.current) return;
      if (uploadSettlement.failedItems.length) {
        throw new Error(
          `有 ${uploadSettlement.failedItems.length} 个媒体上传失败，请重试或移除后再发布。`,
        );
      }
      const compose = buildLatestCompose(uploadSettlement.mediaAssetIds);
      if (!hasPostComposeContent(compose)) {
        throw new Error('正文、媒体或链接至少需要填写一项。');
      }

      if (draftId && fingerprintPostCompose(compose) !== lastSavedFingerprint) {
        await saveCompose(compose);
        if (!mountedRef.current) return;
      }
      const result = await publishMutation.mutateAsync(draftId ? { draftId } : { compose });
      if (!mountedRef.current) return;

      clearUploads();
      showToast({
        tone: 'success',
        title: result.publishState === 'PUBLISHED' ? '帖子发布成功' : '帖子已进入发布队列',
        description:
          result.publishState === 'PUBLISHED'
            ? '内容已同步到你的主页和可见用户时间线。'
            : '媒体处理完成后会自动发布，无需重复提交。',
      });
      onPublished?.(result);
    } catch (error) {
      if (!mountedRef.current) return;
      showToast({
        tone: 'error',
        title: '帖子发布失败',
        description: getErrorMessage(error, '请稍后重试。'),
      });
    } finally {
      actionRef.current = null;
      if (mountedRef.current) setActiveAction(null);
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

  const isBusy = activeAction !== null || isSaving || publishMutation.isPending;
  return {
    user,
    form,
    content,
    communityId,
    quotePostId,
    setQuotePostId,
    quotePostQuery,
    communitiesQuery,
    joinedCommunities,
    persistedMediaAssetIds,
    setPersistedMediaAssetIds,
    uploads,
    saveState,
    saveStatusText,
    activeAction,
    isBusy,
    handleSaveDraft,
    handlePublish,
  };
}
