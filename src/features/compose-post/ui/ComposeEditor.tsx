import {
  AtSign,
  CalendarClock,
  FileImage,
  Globe2,
  Link2,
  MapPin,
  Smile,
  Sparkles,
  X,
} from 'lucide-react';
import { useRef } from 'react';
import { usePostDraft } from '@/domains/posts';
import { MEDIA_POST_ACCEPT } from '@/domains/media';
import { Avatar, Button, EmptyState, Select, Spinner } from '@/shared/ui';
import { useComposer } from '../model/useComposer';
import { draftErrorDescription } from '../model/draftError';
import type { ComposeEditorProps, ComposerOptions } from '../model/types';
import { MediaQueue } from './MediaQueue';
import styles from './ComposeEditor.module.css';

function ComposeEditorForm(props: ComposerOptions) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
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
  } = useComposer(props);
  const { uploadItems, removeUpload, startUploads, handleFiles } = uploads;
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

        <MediaQueue
          persistedMediaAssetIds={persistedMediaAssetIds}
          uploadItems={uploadItems}
          onRemovePersisted={(mediaAssetId) =>
            setPersistedMediaAssetIds((current) => current.filter((id) => id !== mediaAssetId))
          }
          onRemoveUpload={removeUpload}
          onRetry={(item) => void startUploads([item])}
          onAdd={() => fileInputRef.current?.click()}
        />

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

export function ComposeEditor({
  draftId,
  initialCommunityId = '',
  initialQuotePostId = null,
  onDraftSaved,
  onPublished,
}: ComposeEditorProps) {
  const draftQuery = usePostDraft(draftId);
  if (draftId && draftQuery.isLoading) {
    return (
      <section className={styles.loading}>
        <Spinner label="正在读取草稿" />
      </section>
    );
  }

  if (draftId && draftQuery.isError) {
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

  return (
    <ComposeEditorForm
      key={draftId ?? 'new-compose'}
      initialDraft={draftQuery.data ?? null}
      initialCommunityId={initialCommunityId}
      initialQuotePostId={initialQuotePostId}
      onDraftSaved={onDraftSaved}
      onPublished={onPublished}
    />
  );
}
