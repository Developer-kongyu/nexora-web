import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Megaphone, Pin, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  communitiesApi,
  communityManageKeys,
  type CommunityPinType,
  type CommunityPinnedPostListItemView,
} from '@/domains/communities';
import { paths } from '@/shared/config/paths';
import { Badge, Button, Card, IconButton, Modal, Select, TextField, useToast } from '@/shared/ui';
import { EmptyPanel, LoadingRows, Notice } from '@/pages/_shared/PageParts';
import {
  formatCommunityManageDateTime,
  type CommunityManageSectionProps,
} from '../communityManage.model';
import styles from '../CommunityManagePage.module.css';

export function PinnedPostsSection({ communityId }: CommunityManageSectionProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [postId, setPostId] = useState('');
  const [pinType, setPinType] = useState<CommunityPinType>('NORMAL');
  const [sortOrder, setSortOrder] = useState(1);
  const [reason, setReason] = useState('');
  const [unpinning, setUnpinning] = useState<CommunityPinnedPostListItemView | null>(null);
  const [unpinReason, setUnpinReason] = useState('');

  const pinned = useQuery({
    queryKey: communityManageKeys.pinned(communityId),
    queryFn: ({ signal }) => communitiesApi.listPinnedPosts(communityId, signal),
  });

  const refreshManagementData = () =>
    queryClient.invalidateQueries({ queryKey: communityManageKeys.root(communityId) });

  const pinPost = useMutation({
    mutationFn: () =>
      communitiesApi.pinPost(communityId, {
        postId: postId.trim(),
        pinType,
        sortOrder,
        reason: reason.trim() || null,
      }),
    onSuccess: (result) => {
      showToast({
        tone: 'success',
        title:
          result.result === 'ALREADY_PINNED'
            ? '该帖子已经处于相同置顶位置'
            : pinType === 'ANNOUNCEMENT'
              ? '公告帖子已置顶'
              : '帖子已置顶',
      });
      setPostId('');
      setReason('');
      void refreshManagementData();
    },
    onError: () =>
      showToast({
        tone: 'error',
        title: '置顶失败',
        description: '请确认帖子属于该社群、已发布且目标槽位未被占用。',
      }),
  });

  const reorder = useMutation({
    mutationFn: ({ item, target }: { item: CommunityPinnedPostListItemView; target: number }) =>
      communitiesApi.reorderPinnedPost(communityId, item.postId, target),
    onSuccess: (result) => {
      showToast({
        tone: 'success',
        title: result.swappedWithPostId ? '置顶顺序已交换' : '置顶顺序已更新',
      });
      void refreshManagementData();
    },
    onError: () =>
      showToast({
        tone: 'error',
        title: '排序失败',
        description: '帖子状态或置顶槽位可能已变化。',
      }),
  });

  const unpin = useMutation({
    mutationFn: (item: CommunityPinnedPostListItemView) =>
      communitiesApi.unpinPost(communityId, item.postId, unpinReason.trim() || null),
    onSuccess: (result) => {
      showToast({
        tone: 'success',
        title: result.result === 'ALREADY_UNPINNED' ? '该帖子已取消置顶' : '已取消置顶',
      });
      setUnpinning(null);
      setUnpinReason('');
      void refreshManagementData();
    },
    onError: () =>
      showToast({ tone: 'error', title: '取消置顶失败', description: '请刷新列表后重试。' }),
  });

  const sortedItems = [...(pinned.data?.list ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <>
      <div className={styles.stack}>
        <Notice tone="info">
          公告不是独立文本：选择“公告”会把一条已发布社群帖子置顶，并触发后端公告事件。
        </Notice>

        <Card className={styles.panel}>
          <header>
            <div>
              <h2>新增置顶</h2>
              <p>社群固定提供 3 个置顶槽位；重复同态请求会幂等收敛。</p>
            </div>
            <Badge tone="brand">{sortedItems.length} / 3</Badge>
          </header>
          <div className={styles.pinForm}>
            <TextField
              label="帖子 ID"
              name="pin-post-id"
              value={postId}
              onChange={(event) => setPostId(event.target.value)}
              placeholder="输入属于该社群的已发布帖子 ID"
            />
            <Select
              label="置顶类型"
              value={pinType}
              onChange={(event) => setPinType(event.target.value as CommunityPinType)}
            >
              <option value="NORMAL">普通置顶</option>
              <option value="ANNOUNCEMENT">公告</option>
            </Select>
            <Select
              label="目标槽位"
              value={String(sortOrder)}
              onChange={(event) => setSortOrder(Number(event.target.value))}
            >
              <option value="1">第 1 位</option>
              <option value="2">第 2 位</option>
              <option value="3">第 3 位</option>
            </Select>
            <TextField
              className={styles.fullField}
              multiline
              label="操作原因（可选）"
              name="pin-reason"
              value={reason}
              maxLength={200}
              onChange={(event) => setReason(event.target.value)}
              placeholder="原因会写入管理审计日志"
            />
            <div className={styles.formActions}>
              <Button
                loading={pinPost.isPending}
                disabled={!postId.trim() || sortedItems.length >= 3}
                onClick={() => pinPost.mutate()}
              >
                {pinType === 'ANNOUNCEMENT' ? <Megaphone size={15} /> : <Pin size={15} />}
                添加置顶
              </Button>
            </div>
          </div>
        </Card>

        <Card className={styles.panel}>
          <header>
            <div>
              <h2>当前置顶内容</h2>
              <p>列表包含真实帖子卡片摘要、槽位和置顶时间。</p>
            </div>
          </header>

          {pinned.isLoading ? (
            <div className={styles.panelPadding}>
              <LoadingRows count={3} compact />
            </div>
          ) : pinned.isError ? (
            <EmptyPanel
              title="置顶内容加载失败"
              description="没有使用静态精选内容替代接口结果。"
              action={<Button onClick={() => void pinned.refetch()}>重新加载</Button>}
            />
          ) : sortedItems.length ? (
            <div className={styles.pinnedList}>
              {sortedItems.map((item) => {
                const card = item.postCard;
                const isReordering =
                  reorder.isPending && reorder.variables?.item.postId === item.postId;
                return (
                  <article key={item.postId}>
                    <span className={styles.pinSlot}>{item.sortOrder}</span>
                    <div>
                      <div className={styles.pinnedTitle}>
                        <Badge tone={item.pinType === 'ANNOUNCEMENT' ? 'warning' : 'brand'}>
                          {item.pinType === 'ANNOUNCEMENT' ? '公告' : '置顶'}
                        </Badge>
                        <strong>{card.bodyTextPreview || '无文本摘要的帖子'}</strong>
                      </div>
                      <span>
                        {card.author?.displayName ?? '作者资料不可用'} · 置顶于{' '}
                        {formatCommunityManageDateTime(item.pinnedAtIso)}
                      </span>
                      <small>帖子 ID：{item.postId}</small>
                    </div>
                    <Link className={styles.postLink} to={paths.post(item.postId)}>
                      查看 <ExternalLink size={13} />
                    </Link>
                    <Select
                      label="槽位"
                      aria-label={`调整帖子 ${item.postId} 的置顶槽位`}
                      value={String(item.sortOrder)}
                      disabled={reorder.isPending || unpin.isPending}
                      onChange={(event) =>
                        reorder.mutate({ item, target: Number(event.target.value) })
                      }
                    >
                      <option value="1">第 1 位</option>
                      <option value="2">第 2 位</option>
                      <option value="3">第 3 位</option>
                    </Select>
                    <IconButton
                      size="sm"
                      label={`取消置顶帖子 ${item.postId}`}
                      icon={<Trash2 size={15} />}
                      disabled={isReordering || unpin.isPending}
                      onClick={() => {
                        setUnpinning(item);
                        setUnpinReason('');
                      }}
                    />
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyPanel
              icon={<Pin size={28} />}
              title="暂无置顶帖子"
              description="输入已发布帖子 ID 后，可添加普通置顶或公告置顶。"
            />
          )}

          {pinned.data?.degraded ? (
            <div className={styles.degradedNotice}>
              部分置顶内容未能完整显示：{pinned.data.degradedReason ?? '未知降级原因'}
              {pinned.data.filteredCountHint !== null
                ? `，预计过滤 ${pinned.data.filteredCountHint} 条`
                : null}
            </div>
          ) : null}
        </Card>
      </div>

      <Modal
        open={Boolean(unpinning)}
        title="取消置顶"
        description={unpinning ? `确认取消帖子 ${unpinning.postId} 的置顶状态？` : undefined}
        onClose={() => {
          if (!unpin.isPending) setUnpinning(null);
        }}
        footer={
          <>
            <Button
              variant="secondary"
              disabled={unpin.isPending}
              onClick={() => setUnpinning(null)}
            >
              取消
            </Button>
            <Button
              variant="danger"
              loading={unpin.isPending}
              disabled={!unpinning}
              onClick={() => unpinning && unpin.mutate(unpinning)}
            >
              确认取消置顶
            </Button>
          </>
        }
      >
        <TextField
          multiline
          label="操作原因（可选）"
          name="unpin-reason"
          value={unpinReason}
          maxLength={200}
          onChange={(event) => setUnpinReason(event.target.value)}
        />
      </Modal>
    </>
  );
}
