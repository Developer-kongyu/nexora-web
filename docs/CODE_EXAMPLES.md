# 关键代码示例索引

本项目的示例代码不是伪代码，均位于 `src` 中并可运行。本文件列出最值得作为后续开发模板的实现。

## 1. 统一 API Client

路径：`src/shared/api/client.ts`

```ts
const result = await apiClient.request<PostViewModel>({
  path: `/api/posts/${postId}`,
  signal,
});
```

写请求携带幂等键：

```ts
await apiClient.request<PostViewModel, PublishPostInput>({
  method: 'POST',
  path: '/api/posts/publish',
  body: input,
  idempotencyKey: createIdempotencyKey('publish-post'),
});
```

该 client 已处理 typed envelope、Access Token、HttpOnly Cookie、request ID、超时、AbortSignal、401 单飞刷新和统一错误。

## 2. 领域 API + Query Hook

API 路径：`src/domains/feed/api/feedApi.ts`

Hook 路径：`src/domains/feed/hooks/useFeed.ts`

页面只消费 hook：

```tsx
const feed = useFollowingFeed();
const posts = feed.data ? mergeCursorItems(feed.data.pages) : [];

return posts.map((post) => <PostCard key={post.id} post={post} />);
```

## 3. 统一帖子卡片

路径：

```text
src/widgets/post-card/PostCard.tsx
src/widgets/post-card/PostActionBar.tsx
src/widgets/post-card/PostCard.module.css
```

所有页面复用同一个互动栏，固定提供评论、点赞、转发、收藏、分享、浏览、更多及其图标。分隔线通过互动区容器的 `border-top` 实现，不在页面额外放置绝对定位横线。

## 4. 发布编辑器

路径：`src/widgets/compose-editor/ComposeEditor.tsx`

包括：

- React Hook Form + Zod 校验。
- 280 字计数。
- 媒体上传队列。
- 社群与可见范围。
- 点赞、评论、转发、引用权限。
- 草稿和发布按钮。

真实项目可在此基础上增加防抖自动保存、版本冲突和上传失败重试。

## 5. 媒体查看器

路径：`src/widgets/media-viewer/MediaViewer.tsx`

包括：

- 媒体中央播放/暂停按钮。
- 右上角全屏图标。
- 左右两侧三角翻页。
- 视频下方无缝黑色控制条。
- 媒体标题与详细描述信息卡片。
- 帖子摘要卡片。
- 键盘方向键、空格和 Escape。

## 6. 认证内存态与单飞刷新

路径：

```text
src/shared/api/authSession.ts
src/domains/auth/model/authStore.ts
src/app/providers/AuthBootstrap.tsx
```

多个请求同时遇到 401 时，共享同一个 `refreshInFlight` Promise，避免刷新令牌并发风暴。

## 7. MSW Mock

路径：

```text
src/mocks/fixtures.ts
src/mocks/handlers.ts
src/mocks/browser.ts
src/mocks/server.ts
```

新增接口建议同步提供成功、空结果、无权限、冲突和服务端错误 handlers，页面开发无需等待后端部署。

## 8. 组件测试

示例：

```text
src/domains/feed/api/feedApi.test.ts
src/widgets/post-card/PostCard.test.tsx
src/widgets/media-viewer/MediaViewer.test.tsx
```

PostCard 测试会校验七个互动项，MediaViewer 测试会校验播放和全屏控件位置对应的可访问名称。

## 9. E2E

路径：`tests/e2e/smoke.spec.ts`

示例覆盖 Mock 登录进入首页，以及帖子卡片七个互动项可见。正式阶段应继续增加发布、上传、收藏、社群加入和通知未读链路。
