import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useAuthStore } from '@/domains/auth';
import {
  isMediaUploadError,
  uploadMediaImageSelection,
  type MediaImageSelection,
} from '@/domains/media';
import {
  userKeys,
  usersApi,
  type UpdateOwnProfileRequest,
  type UserProfileEditableView,
} from '@/domains/users';
import { isApiError } from '@/shared/api/errors';
import { createAbortError, getErrorMessage, toError } from '@/shared/lib/error';
import { trimToNull } from '@/shared/lib/text';
import { Button, Card, Modal, Spinner, TextField, useToast } from '@/shared/ui';
import { PageLayout } from '@/widgets/layout/PageLayout';
import { EmptyPanel, PageTitle, SaveFooter } from '../_shared/PageParts';
import { useMediaImagePairSelection } from '../_shared/useMediaImagePairSelection';
import { ProfileImageField } from './ProfileImageField';
import {
  profileEditSchema,
  profileToFormValues,
  type ProfileEditFormValues,
} from './profileEdit.model';
import styles from './ProfileEditPage.module.css';

interface SaveProfileInput {
  values: ProfileEditFormValues;
  avatarSelection: MediaImageSelection | null;
  coverSelection: MediaImageSelection | null;
  removeAvatar: boolean;
  removeCover: boolean;
}

interface ProfileEditEditorProps {
  profile: UserProfileEditableView;
  onProfileMissing: () => void;
}

interface SaveFeedback {
  title: string;
  description: string;
}

export function ProfileEditPage() {
  const profileQuery = useQuery({
    queryKey: userKeys.editableProfile,
    queryFn: ({ signal }) => usersApi.getOwnEditableProfile(signal),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  if (profileQuery.isPending) {
    return (
      <>
        <PageTitle title="编辑个人资料" description="正在读取可编辑资料与媒体状态。" />
        <PageLayout>
          <Card className={styles.stateCard}>
            <Spinner label="正在加载个人资料" />
          </Card>
        </PageLayout>
      </>
    );
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <>
        <PageTitle title="编辑个人资料" description="暂时无法读取可编辑资料。" />
        <PageLayout>
          <Card className={styles.stateCard}>
            <EmptyPanel
              icon={<AlertCircle size={30} />}
              title="个人资料加载失败"
              description={getErrorMessage(profileQuery.error, '请检查登录状态和网络连接后重试。')}
              action={<Button onClick={() => void profileQuery.refetch()}>重新加载</Button>}
            />
          </Card>
        </PageLayout>
      </>
    );
  }

  return (
    <ProfileEditEditor
      key={profileQuery.data.userId}
      profile={profileQuery.data}
      onProfileMissing={() => void profileQuery.refetch()}
    />
  );
}

function ProfileEditEditor({ profile, onProfileMissing }: ProfileEditEditorProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const authUser = useAuthStore((state) => state.user);
  const updateAuthUser = useAuthStore((state) => state.updateUser);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [removeCover, setRemoveCover] = useState(false);
  const { avatar, cover } = useMediaImagePairSelection();
  const [saveFeedback, setSaveFeedback] = useState<SaveFeedback | null>(null);
  const activeRequestRef = useRef<AbortController | null>(null);

  const form = useForm<ProfileEditFormValues>({
    resolver: zodResolver(profileEditSchema),
    defaultValues: profileToFormValues(profile),
    mode: 'onChange',
  });

  const resetToProfile = (nextProfile: UserProfileEditableView) => {
    form.reset(profileToFormValues(nextProfile));
    void form.trigger();
    avatar.clear();
    cover.clear();
    setRemoveAvatar(false);
    setRemoveCover(false);
  };

  useEffect(
    () => () => {
      activeRequestRef.current?.abort(createAbortError('资料编辑页面已卸载。'));
    },
    [],
  );

  const updateProfile = useMutation({
    mutationFn: async (input: SaveProfileInput) => {
      activeRequestRef.current?.abort(createAbortError('已有新的资料保存请求。'));
      const abortController = new AbortController();
      activeRequestRef.current = abortController;

      try {
        let avatarStorageKey: string | undefined;
        let coverStorageKey: string | undefined;
        try {
          [avatarStorageKey, coverStorageKey] = await Promise.all([
            uploadMediaImageSelection({
              selection: input.avatarSelection,
              scene: 'USER_AVATAR',
              controller: avatar,
              signal: abortController.signal,
            }),
            uploadMediaImageSelection({
              selection: input.coverSelection,
              scene: 'USER_COVER',
              controller: cover,
              signal: abortController.signal,
            }),
          ]);
        } catch (error) {
          const uploadError = toError(error, '资料图片上传失败。');
          abortController.abort(uploadError);
          throw uploadError;
        }

        const request: UpdateOwnProfileRequest = {
          displayName: input.values.displayName.trim(),
          bio: trimToNull(input.values.bio),
          location: trimToNull(input.values.location),
          websiteUrl: trimToNull(input.values.websiteUrl),
          birthday: trimToNull(input.values.birthday),
        };
        if (avatarStorageKey !== undefined) request.avatarStorageKey = avatarStorageKey;
        else if (input.removeAvatar) request.avatarStorageKey = null;
        if (coverStorageKey !== undefined) request.coverStorageKey = coverStorageKey;
        else if (input.removeCover) request.coverStorageKey = null;

        return await usersApi.updateOwnProfile(request, abortController.signal);
      } finally {
        if (activeRequestRef.current === abortController) activeRequestRef.current = null;
      }
    },
    onMutate: () => setSaveFeedback(null),
    onSuccess: (profile) => {
      queryClient.setQueryData(userKeys.editableProfile, profile);
      resetToProfile(profile);
      updateAuthUser({ displayName: profile.displayName, avatarUrl: profile.avatarUrl });
      if (authUser?.handle) {
        void queryClient.invalidateQueries({ queryKey: userKeys.profile(authUser.handle) });
      }
      setSaveFeedback({
        title: '个人资料已保存',
        description: '公开资料与媒体引用已根据服务端返回结果同步更新。',
      });
    },
    onError: (error) => {
      const mediaError = isMediaUploadError(error);
      const networkError = isApiError(error) && error.code === 'NETWORK_ERROR';
      setSaveFeedback({
        title: mediaError ? '头像或封面上传失败' : networkError ? '网络连接失败' : '资料保存失败',
        description: getErrorMessage(error, '请检查资料内容、媒体状态和网络连接后重试。'),
      });

      if (isApiError(error) && error.code === 'USER_PROFILE_NOT_FOUND') {
        onProfileMissing();
      }
    },
  });

  const selectAvatar = (file: File) => {
    if (avatar.select(file)) setRemoveAvatar(false);
  };
  const selectCover = (file: File) => {
    if (cover.select(file)) setRemoveCover(false);
  };

  const submit = form.handleSubmit(
    (values) => {
      updateProfile.mutate({
        values,
        avatarSelection: avatar.selection,
        coverSelection: cover.selection,
        removeAvatar,
        removeCover,
      });
    },
    () => {
      setSaveFeedback({
        title: '字段校验失败',
        description: '请修正表单中标记的内容后再保存。',
      });
    },
  );

  const resetUnsavedChanges = () => {
    resetToProfile(profile);
    setSaveFeedback(null);
    showToast({ tone: 'info', title: '未保存更改已撤销' });
  };

  const displayName = useWatch({ control: form.control, name: 'displayName' });
  const mediaDirty = Boolean(avatar.selection || cover.selection || removeAvatar || removeCover);
  const hasUnsavedChanges = form.formState.isDirty || mediaDirty;
  const saving = updateProfile.isPending;

  return (
    <>
      <PageTitle title="编辑个人资料" />
      <PageLayout>
        <Card className={styles.form}>
          <form onSubmit={(event) => void submit(event)} noValidate>
            <section className={styles.media}>
              <header className={styles.mediaHeader}>
                <h2>头像与封面</h2>
                <p>头像与封面上传完成后再保存资料。</p>
              </header>
              <ProfileImageField
                kind="cover"
                displayName={displayName || profile.displayName}
                currentUrl={profile.coverUrl}
                currentStorageKey={profile.coverStorageKey}
                currentMediaState={profile.coverMediaState}
                selection={cover.selection}
                removed={removeCover}
                disabled={saving}
                onSelect={selectCover}
                onCancelSelection={cover.clear}
                onRemoveCurrent={() => {
                  cover.clear();
                  setRemoveCover(true);
                }}
                onRestoreCurrent={() => setRemoveCover(false)}
              />
              <div className={styles.avatarRow}>
                <ProfileImageField
                  kind="avatar"
                  displayName={displayName || profile.displayName}
                  currentUrl={profile.avatarUrl}
                  currentStorageKey={profile.avatarStorageKey}
                  currentMediaState={profile.avatarMediaState}
                  selection={avatar.selection}
                  removed={removeAvatar}
                  disabled={saving}
                  onSelect={selectAvatar}
                  onCancelSelection={avatar.clear}
                  onRemoveCurrent={() => {
                    avatar.clear();
                    setRemoveAvatar(true);
                  }}
                  onRestoreCurrent={() => setRemoveAvatar(false)}
                />
              </div>
            </section>

            <section className={styles.fields}>
              <div className={styles.grid}>
                <TextField
                  label="昵称"
                  disabled={saving}
                  {...form.register('displayName')}
                  error={form.formState.errors.displayName?.message}
                />
                <TextField
                  multiline
                  label="简介"
                  disabled={saving}
                  {...form.register('bio')}
                  error={form.formState.errors.bio?.message}
                />
                <TextField
                  label="所在地"
                  disabled={saving}
                  {...form.register('location')}
                  error={form.formState.errors.location?.message}
                />
                <TextField
                  label="个人网站"
                  type="url"
                  disabled={saving}
                  {...form.register('websiteUrl')}
                  error={form.formState.errors.websiteUrl?.message}
                />
                <TextField
                  label="生日"
                  type="date"
                  disabled={saving}
                  hint="是否展示由隐私策略决定"
                  {...form.register('birthday')}
                  error={form.formState.errors.birthday?.message}
                />
              </div>
              <SaveFooter
                saving={saving}
                disabled={!hasUnsavedChanges}
                message={
                  hasUnsavedChanges
                    ? '文本与媒体更改会在同一次资料更新中提交'
                    : '当前没有未保存更改'
                }
                onSave={() => void submit()}
                onCancel={resetUnsavedChanges}
              />
            </section>
          </form>
        </Card>
      </PageLayout>
      <Modal
        open={saveFeedback !== null}
        title={saveFeedback?.title ?? ''}
        description={saveFeedback?.description}
        onClose={() => setSaveFeedback(null)}
        footer={<Button onClick={() => setSaveFeedback(null)}>知道了</Button>}
      />
    </>
  );
}
