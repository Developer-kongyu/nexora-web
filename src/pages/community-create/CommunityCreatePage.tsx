import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import {
  Camera,
  Check,
  ImagePlus,
  Plus,
  ShieldCheck,
  Tags,
  UsersRound,
  X,
} from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import {
  COMMUNITY_COMMENT_ROLE_MIN_OPTIONS,
  COMMUNITY_JOIN_POLICY_OPTIONS,
  COMMUNITY_MAX_RULE_COUNT,
  COMMUNITY_MAX_TAG_COUNT,
  COMMUNITY_MAX_TAG_LENGTH,
  COMMUNITY_POST_ROLE_MIN_OPTIONS,
  communitiesApi,
  type CreateCommunityInput,
} from '@/domains/communities';
import {
  isMediaUploadError,
  uploadMediaImageSelection,
} from '@/domains/media';
import { paths } from '@/shared/config/paths';
import { isApiError } from '@/shared/api/errors';
import { createAbortError, getErrorMessage, toError } from '@/shared/lib/error';
import { trimToNull } from '@/shared/lib/text';
import { Button, Card, Select, SelectOptions, Switch, TextField, useToast } from '@/shared/ui';
import { PageLayout } from '@/widgets/layout/PageLayout';
import { PageTitle, SideCard } from '../_shared/PageParts';
import { useMediaImagePairSelection } from '../_shared/useMediaImagePairSelection';
import { CommunityImageField } from './CommunityImageField';
import {
  COMMUNITY_CREATE_DEFAULT_VALUES,
  communityCreateSchema,
  parseCommunityTags,
  type CommunityCreateFormValues,
} from './communityCreate.model';
import styles from './CommunityCreatePage.module.css';

function createPayload(
  values: CommunityCreateFormValues,
  media: { avatarKey: string | null; coverKey: string | null },
): CreateCommunityInput {
  return {
    slug: values.slug.trim(),
    name: values.name.trim(),
    description: trimToNull(values.description),
    avatarKey: media.avatarKey,
    coverKey: media.coverKey,
    categoryKey: trimToNull(values.categoryKey),
    tags: parseCommunityTags(values.tagsText),
    locale: trimToNull(values.locale),
    regionCode: trimToNull(values.regionCode),
    joinPolicy: values.joinPolicy,
    postRoleMin: values.postRoleMin,
    commentRoleMin: values.commentRoleMin,
    quoteEnabled: values.quoteEnabled,
    repostEnabled: values.repostEnabled,
    requireRuleAcceptanceBeforePost: values.requireRuleAcceptanceBeforePost,
    rules: values.rules.map((rule) => rule.content.trim()),
  };
}

export function CommunityCreatePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { avatar, cover } = useMediaImagePairSelection();
  const activeRequestRef = useRef<AbortController | null>(null);

  const form = useForm<CommunityCreateFormValues>({
    resolver: zodResolver(communityCreateSchema),
    defaultValues: COMMUNITY_CREATE_DEFAULT_VALUES,
    mode: 'onChange',
  });
  const rules = useFieldArray({ control: form.control, name: 'rules' });
  const [name, slug] = form.watch(['name', 'slug']);

  useEffect(
    () => () => {
      activeRequestRef.current?.abort(createAbortError('社群创建页面已卸载。'));
    },
    [],
  );

  const create = useMutation({
    mutationFn: async (values: CommunityCreateFormValues) => {
      activeRequestRef.current?.abort(createAbortError('已有新的社群创建请求。'));
      const abortController = new AbortController();
      activeRequestRef.current = abortController;

      try {
        const [avatarResult, coverResult] = await Promise.allSettled([
          uploadMediaImageSelection({
            selection: avatar.selection,
            scene: 'COMMUNITY_AVATAR',
            controller: avatar,
            signal: abortController.signal,
          }),
          uploadMediaImageSelection({
            selection: cover.selection,
            scene: 'COMMUNITY_COVER',
            controller: cover,
            signal: abortController.signal,
          }),
        ]);
        if (avatarResult.status === 'rejected') {
          throw toError(avatarResult.reason, '社群头像上传失败。');
        }
        if (coverResult.status === 'rejected') {
          throw toError(coverResult.reason, '社群封面上传失败。');
        }

        return await communitiesApi.create(
          createPayload(values, {
            avatarKey: avatarResult.value ?? null,
            coverKey: coverResult.value ?? null,
          }),
          abortController.signal,
        );
      } finally {
        if (activeRequestRef.current === abortController) activeRequestRef.current = null;
      }
    },
    onSuccess: (community) => {
      showToast({
        tone: 'success',
        title: '社群创建成功',
        description: '你已成为该社群的所有者。',
      });
      navigate(paths.community(community.slug));
    },
    onError: (error) => {
      if (
        isApiError(error) &&
        ['COMMUNITY_SLUG_INVALID', 'COMMUNITY_SLUG_RESERVED', 'COMMUNITY_SLUG_ALREADY_EXISTS'].includes(
          error.code,
        )
      ) {
        form.setError(
          'slug',
          {
            type: 'server',
            message:
              error.code === 'COMMUNITY_SLUG_ALREADY_EXISTS'
                ? '该 Slug 已被使用，请更换一个地址。'
                : error.message,
          },
          { shouldFocus: true },
        );
      }
      showToast({
        tone: 'error',
        title: isMediaUploadError(error) ? '图片尚未准备完成' : '创建失败',
        description: getErrorMessage(error, '请检查填写内容和网络状态后重试。'),
      });
    },
  });

  const submit = form.handleSubmit((values) => {
    create.mutate(values);
  });

  const basicsDone = name.trim().length >= 2 && slug.trim().length >= 3;
  const mediaDone =
    (!avatar.selection || avatar.selection.stage === 'READY') &&
    (!cover.selection || cover.selection.stage === 'READY');

  return (
    <>
      <PageTitle title="创建社群" description="建立清晰的主题、规则与成员加入方式。" />
      <PageLayout
        aside={
          <>
            <SideCard title="创建须知">
              <ul>
                <li>首版创建后默认为公开社群，可在管理台调整可见性</li>
                <li>Slug 会成为公开访问地址，并且不会在删除后立即复用</li>
                <li>头像与封面必须完成媒体处理后才能写入社群资料</li>
                <li>创建者自动成为社群所有者</li>
              </ul>
            </SideCard>
            <SideCard title="创建进度">
              <div className={styles.progress}>
                <span data-done={basicsDone}>
                  {basicsDone ? <Check size={13} /> : <Camera size={13} />} 基础信息
                </span>
                <span data-done={form.formState.isValid}>
                  {form.formState.isValid ? <Check size={13} /> : <ShieldCheck size={13} />} 规则与权限
                </span>
                <span data-done={mediaDone}>
                  {mediaDone ? <Check size={13} /> : <ImagePlus size={13} />} 媒体处理
                </span>
                <span data-done="false">
                  <UsersRound size={13} /> 创建并保存
                </span>
              </div>
            </SideCard>
          </>
        }
      >
        <Card className={styles.form}>
          <form onSubmit={(event) => void submit(event)} noValidate>
            <section>
              <header>
                <span>
                  <Camera size={18} />
                </span>
                <div>
                  <h2>视觉与基础信息</h2>
                  <p>帮助成员快速理解社群主题，图片将在提交时上传并处理。</p>
                </div>
              </header>

              <div className={styles.media}>
                <CommunityImageField
                  kind="cover"
                  selection={cover.selection}
                  disabled={create.isPending}
                  onSelect={cover.select}
                  onRemove={cover.clear}
                />
                <CommunityImageField
                  kind="avatar"
                  selection={avatar.selection}
                  disabled={create.isPending}
                  onSelect={avatar.select}
                  onRemove={avatar.clear}
                />
              </div>

              <div className={styles.grid}>
                <TextField
                  label="社群名称"
                  autoComplete="off"
                  maxLength={64}
                  placeholder="例如：城市摄影散步"
                  {...form.register('name')}
                  error={form.formState.errors.name?.message}
                />
                <TextField
                  label="社群 Slug"
                  autoCapitalize="none"
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={32}
                  placeholder="例如：urban-photo"
                  {...form.register('slug')}
                  error={form.formState.errors.slug?.message}
                  hint="用于公开链接，仅支持小写字母、数字和连字符"
                />
                <TextField
                  className={styles.full}
                  multiline
                  rows={4}
                  maxLength={500}
                  label="社群简介（可选）"
                  placeholder="介绍讨论主题、适合人群和内容方向"
                  {...form.register('description')}
                  error={form.formState.errors.description?.message}
                />
                <Select label="分类" {...form.register('categoryKey')}>
                  <option value="">暂不设置</option>
                  <option value="AI_PRODUCT">AI 与产品</option>
                  <option value="PRODUCT_DESIGN">产品与设计</option>
                  <option value="TECHNOLOGY">科技与开发</option>
                  <option value="PHOTOGRAPHY_TRAVEL">摄影与旅行</option>
                  <option value="LIFESTYLE">生活方式</option>
                </Select>
                <Select label="主要语言" {...form.register('locale')}>
                  <option value="">暂不设置</option>
                  <option value="zh-CN">简体中文</option>
                  <option value="zh-TW">繁體中文</option>
                  <option value="en">English</option>
                  <option value="ja">日本語</option>
                </Select>
                <Select label="地区" {...form.register('regionCode')}>
                  <option value="">不限地区</option>
                  <option value="CN">中国大陆</option>
                  <option value="TW">台湾</option>
                  <option value="HK">香港</option>
                  <option value="JP">日本</option>
                  <option value="US">美国</option>
                </Select>
                <TextField
                  className={styles.full}
                  label="标签（可选）"
                  placeholder="产品设计，AI，工作流"
                  maxLength={260}
                  {...form.register('tagsText')}
                  error={form.formState.errors.tagsText?.message}
                  hint={`使用逗号分隔，最多 ${COMMUNITY_MAX_TAG_COUNT} 个标签，每个最多 ${COMMUNITY_MAX_TAG_LENGTH} 个字符`}
                />
              </div>
            </section>

            <section>
              <header>
                <span>
                  <ShieldCheck size={18} />
                </span>
                <div>
                  <h2>加入与互动权限</h2>
                  <p>这些字段会直接写入正式社群设置，不使用本地伪开关。</p>
                </div>
              </header>
              <div className={styles.gridCompact}>
                <Select label="加入方式" {...form.register('joinPolicy')}>
                  <SelectOptions options={COMMUNITY_JOIN_POLICY_OPTIONS} />
                </Select>
                <Select label="最低发帖角色" {...form.register('postRoleMin')}>
                  <SelectOptions options={COMMUNITY_POST_ROLE_MIN_OPTIONS} />
                </Select>
                <Select label="最低评论角色" {...form.register('commentRoleMin')}>
                  <SelectOptions options={COMMUNITY_COMMENT_ROLE_MIN_OPTIONS} />
                </Select>
              </div>
              <div className={styles.switches}>
                <Switch
                  label="允许引用社群帖子"
                  description="关闭后，社群内容不能被创建为引用帖"
                  disabled={create.isPending}
                  {...form.register('quoteEnabled')}
                />
                <Switch
                  label="允许转发社群帖子"
                  description="关闭后，社群内容不能被转发"
                  disabled={create.isPending}
                  {...form.register('repostEnabled')}
                />
                <Switch
                  label="发帖前必须确认当前规则"
                  description="规则版本更新后，成员需要重新确认才能发帖"
                  disabled={create.isPending}
                  {...form.register('requireRuleAcceptanceBeforePost')}
                />
              </div>
            </section>

            <section>
              <header>
                <span>
                  <Tags size={18} />
                </span>
                <div>
                  <h2>社群规则</h2>
                  <p>规则可留空，最多 {COMMUNITY_MAX_RULE_COUNT} 条；保存时按当前顺序写入。</p>
                </div>
              </header>
              <div className={styles.rules}>
                {rules.fields.length ? (
                  rules.fields.map((field, index) => {
                    const contentError = form.getFieldState(
                      `rules.${index}.content`,
                      form.formState,
                    ).error;

                    return (
                      <div className={styles.ruleRow} key={field.id}>
                        <span>{index + 1}</span>
                        <div>
                          <textarea
                            rows={2}
                            maxLength={500}
                            aria-label={`社群规则 ${index + 1}`}
                            aria-invalid={Boolean(contentError)}
                            disabled={create.isPending}
                            {...form.register(`rules.${index}.content`)}
                          />
                          {contentError?.message ? <small>{contentError.message}</small> : null}
                        </div>
                        <button
                          type="button"
                          aria-label={`删除第 ${index + 1} 条规则`}
                          disabled={create.isPending}
                          onClick={() => rules.remove(index)}
                        >
                          <X size={15} />
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <p className={styles.noRules}>尚未添加规则。创建后仍可在管理台按版本更新。</p>
                )}
                <button
                  className={styles.addRule}
                  type="button"
                  disabled={create.isPending || rules.fields.length >= COMMUNITY_MAX_RULE_COUNT}
                  onClick={() => rules.append({ content: '' }, { shouldFocus: true })}
                >
                  <Plus size={15} /> 添加规则
                </button>
              </div>
            </section>

            <footer>
              <span>提交时会先完成图片上传与处理，再创建社群；过程中请勿关闭页面。</span>
              <div>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={create.isPending}
                  onClick={() => navigate('/communities')}
                >
                  取消
                </Button>
                <Button type="submit" loading={create.isPending} disabled={!form.formState.isValid}>
                  <UsersRound size={16} /> 创建社群
                </Button>
              </div>
            </footer>
          </form>
        </Card>
      </PageLayout>
    </>
  );
}
