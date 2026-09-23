# 07. API、状态管理与认证

## 1. 先区分四类状态

“状态”不是同一种东西。混在一起会产生重复数据和同步 Bug。

| 状态种类         | 例子                      | 推荐工具        |
| ---------------- | ------------------------- | --------------- |
| URL 状态         | 当前 Tab、搜索词、帖子 ID | React Router    |
| 组件临时状态     | 弹窗开关、显示密码        | `useState`      |
| 服务端状态       | 帖子、通知、用户卡、分页  | TanStack Query  |
| 跨页面客户端状态 | 当前认证用户、引导状态    | Zustand         |
| 表单状态         | 输入值、脏字段、校验错误  | React Hook Form |

判断工具前先问：“它的权威来源在哪里？刷新页面后是否应该存在？谁需要读取它？”

## 2. 通用 API Client 做了什么

[`src/shared/api/client.ts`](../../src/shared/api/client.ts) 是所有领域请求的共同底座：

1. 拼接 API 根地址与路径；
2. 设置 `Accept`、JSON Content-Type；
3. 生成 `x-request-id`；
4. 加入 Bearer Access Token；
5. 非 GET 请求加入 CSRF Token；
6. 可选加入 Idempotency Key；
7. 设置超时和 AbortSignal；
8. 携带 Refresh Cookie（`credentials: include`）；
9. 401 时只刷新一次并重试；
10. 解包统一响应或抛出 `ApiError`。

如果页面绕过它直接写 `fetch`，很容易漏掉认证、超时、错误转换或请求 ID。

## 3. 统一响应与 ApiError

后端成功响应通常是：

```ts
interface ApiEnvelope<T> {
  code: string;
  message: string;
  data: T;
}
```

Client 返回 `data`，页面无需反复写 `response.data.data`。失败则转换为 [`ApiError`](../../src/shared/api/errors.ts)，其中包含：

- HTTP 状态；
- 稳定业务错误码；
- 用户可见消息；
- Request ID；
- 字段错误；
- Retry-After 秒数。

开发时 Request ID 很重要：前端请求和后端日志可以据此关联。

## 4. TanStack Query 管理什么

[`queryClient.ts`](../../src/shared/api/queryClient.ts) 设置了全局策略：

- 查询 30 秒内视为新鲜；
- 无观察者缓存保留 10 分钟；
- 仅服务端 5xx 最多重试两次；
- 窗口重新聚焦不自动刷新；
- Mutation 默认不自动重试。

### Query

读取服务端数据：

```ts
useQuery({
  queryKey: postKeys.detail(postId),
  queryFn: ({ signal }) => postsApi.detail(postId, signal),
});
```

它提供 `data`、`isLoading`、`isError`、`refetch` 等状态。

### Mutation

创建、修改、删除：

```ts
useMutation({
  mutationFn: postsApi.publish,
  onSuccess: () => queryClient.invalidateQueries({ queryKey: feedKeys.all }),
});
```

Mutation 成功后让相关 Query 失效，TanStack Query 再从后端获取权威结果。

## 5. Query Key 为什么必须集中定义

[`feedKeys`](../../src/domains/feed/model/queryKeys.ts) 生成结构化缓存键：

```ts
feedKeys.all; // ['feed']
feedKeys.list('following'); // ['feed', 'following']
```

集中定义有三个好处：

- 避免字符串拼写不一致；
- 能按前缀使整组缓存失效；
- 类型系统限制 Tab 参数。

Query Key 是缓存身份，不只是调试标签。两个不同请求误用同一 Key 会互相覆盖。

## 6. 无限分页与 Cursor

首页使用 `useInfiniteQuery`。后端返回当前页和 `nextCursor`，前端把下一次 Cursor 传回去。

Cursor 分页比页码更适合不断变化的信息流：在用户翻页期间插入新帖子时，不容易造成大面积重复或遗漏。

页面用 `mergeCursorItems()` 合并页，并用稳定 ID 去重。不要用数组下标作为帖子 `key`。

## 7. 为什么认证状态用 Zustand

认证状态跨越所有页面和路由守卫：

```ts
status: 'bootstrapping' | 'authenticated' | 'anonymous';
user: UserSummary | null;
onboardingCompleted: boolean;
```

[`authStore.ts`](../../src/domains/auth/model/authStore.ts) 使用 Zustand，让任意组件按需订阅某个字段：

```ts
const status = useAuthStore((state) => state.status);
```

帖子、通知列表不放 Zustand，因为它们是可查询、可失效、可分页的服务端状态，TanStack Query 更适合。

## 8. Access Token、Refresh Cookie 与 CSRF

本项目的认证思路：

- Access Token 放内存，不放 Local Storage；
- Refresh Token 由后端放 HttpOnly Cookie，JavaScript 读不到；
- 页面刷新后，通过 Refresh 接口恢复 Access Token；
- 修改类请求带 CSRF Token；
- 请求使用 `credentials: 'include'` 携带 Cookie。

内存 Access Token 降低持久化 XSS 窃取风险，但刷新页面会丢失，所以必须有 `AuthBootstrap` 恢复会话。

## 9. 并发 401 为什么只刷新一次

一个页面可能同时有多个请求过期。如果每个 401 都独立刷新，会产生“刷新风暴”。[`authSession.ts`](../../src/shared/api/authSession.ts) 用 `refreshInFlight` 共享同一个 Promise：

```text
请求 A 401 ─┐
请求 B 401 ─┼─> 同一个 Refresh 请求 ─> 新 Token ─> 各自重试一次
请求 C 401 ─┘
```

它还使用 generation 判断请求是否过期：如果用户在刷新请求尚未返回时主动退出，旧响应不能把用户重新登录。

## 10. 为什么 Mutation 默认不重试

GET 查询通常幂等，偶发 500 可以安全重试。发布帖子、发送验证码、付款等写操作可能产生副作用，自动重试可能重复执行。

本项目支持 Idempotency Key，但仍选择 Mutation 默认不自动重试，由具体业务明确决定。这是比“一切失败都重试”更安全的默认值。

## 11. 一次首页请求的真实路径

```text
HomePage
  → useFeed(tab)
  → feedApi.list(tab, cursor, signal)
  → apiClient.request()
  → fetch('/api/feeds/following?...')
  → 后端 envelope
  → feedResponseToPage / hydrateFeedReposts
  → TanStack Query cache
  → HomePage 渲染 PostCard
```

这里还体现了 DTO 与 ViewModel 分离：后端响应适配成适合 UI 的 `PostViewModel`，组件不必到处理解后端原始结构。

## 12. 加载、错误、空数据必须分开

页面至少处理：

```tsx
if (query.isLoading) return <Loading />;
if (query.isError) return <ErrorNotice />;
if (!query.data.length) return <EmptyState />;
return <List />;
```

“请求失败”与“请求成功但列表为空”含义完全不同。不要失败时偷偷展示假数据，也不要把所有情况都渲染成空白。

## 13. 本章自测

1. URL 状态为什么适合放在路由而不是 Zustand？
2. Query Key 冲突会造成什么问题？
3. Access Token 为什么需要 Bootstrap 恢复？
4. 多个请求同时 401 时怎样避免刷新风暴？
5. 为什么写操作默认不自动重试？

上一章：[组件、CSS 与设计系统](./06-components-css-and-design-system.md)；下一章：[表单与校验](./08-forms-and-validation.md)。
