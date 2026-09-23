# 13. 如何在本项目增加一个功能

本章用“增加一个已登录用户可访问的活动列表页”作为方法示例，不要求你真的提交这个功能。

## 1. 先写需求，不要先建文件

至少明确：

- URL 是什么；
- 谁能访问；
- 后端端点、方法、参数、响应；
- 页面有哪些加载、错误、空、成功状态；
- 是否分页；
- 是否有写操作；
- 写成功后哪些缓存会变化；
- 响应式与可访问性要求；
- 测试验收条件。

如果后端契约不存在，不要根据截图编造正式数据结构。

## 2. 选择业务域

假设活动属于用户领域，可放：

```text
src/domains/users/
├─ api/usersApi.ts
├─ hooks/useUserActivity.ts
├─ model/types.ts
└─ model/queryKeys.ts
```

如果它是全新稳定领域，再创建 `domains/activity`。不要仅因为要写一个页面就随意新增领域。若用户操作同时协调多个领域的写入与缓存刷新，把流程放到 `features/<feature>`，复用领域公开 API；简单读取仍可直接使用领域 Hook。

## 3. 先定义契约类型

区分后端 DTO 与页面 ViewModel：

```ts
interface ActivityDto {
  activityId: string;
  occurredAt: string;
  kind: string;
}

interface ActivityViewModel {
  id: string;
  timestamp: Date;
  label: string;
}
```

如果字段完全一致且足够适合 UI，可以直接复用；若后端结构复杂，就写 Adapter 并测试。

## 4. 在领域 API 中实现端点

```ts
export const activityApi = {
  list: (cursor?: string, signal?: AbortSignal) =>
    apiClient.request<ActivityPageDto>({
      path: appendQuery('/api/activity', { cursor }),
      signal,
    }),
};
```

不要重复实现 Token、JSON 解包、超时和 401 刷新。

## 5. 定义 Query Keys 与 Hook

```ts
export const activityKeys = {
  all: ['activity'] as const,
  list: () => [...activityKeys.all, 'list'] as const,
};
```

Hook 负责接入 Query：

```ts
export function useActivity() {
  return useInfiniteQuery({
    queryKey: activityKeys.list(),
    queryFn: ({ pageParam, signal }) => activityApi.list(pageParam, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: getNextCursorPageParam,
  });
}
```

## 6. 先写纯逻辑测试与 API 测试

测试至少覆盖：

- URL、Query 参数、Method；
- 响应适配；
- 空列表；
- 下一页 Cursor；
- 非法或缺失字段的处理策略。

纯逻辑在进入页面前稳定下来，页面调试会更简单。

## 7. 创建页面

```text
src/pages/activity/
├─ ActivityPage.tsx
├─ ActivityPage.module.css
└─ ActivityPage.test.tsx
```

页面依次处理：

```tsx
loading → Error → empty → list → load more
```

使用已有 `PageLayout`、`Notice`、`Button`、`EmptyState`，不要为一个页面重新造几乎相同的基础组件。

## 8. 添加路由和路径函数

在 `router.tsx` 登录后布局下懒加载。在 `shared/config/paths.ts` 增加路径：

```ts
activity: '/activity';
```

若侧栏需要入口，再更新 AppShell 导航。测试直接 URL、导航点击和刷新。

## 9. 写操作需要设计缓存策略

假设支持删除一条活动：

- Mutation 请求用稳定端点；
- 提交中禁用重复操作；
- 成功后使 `activityKeys.all` 失效，或做谨慎的乐观更新；
- 失败时保留原数据并展示 Toast；
- 批量操作明确部分成功如何反馈。

不要 Mutation 成功后调用 `window.location.reload()`，这会丢弃 SPA 缓存和交互状态。

## 10. 是否需要 Widget

只有当活动条目在多个页面复用或本身包含复杂交互时，才创建 `widgets/activity-card`。如果只是当前页面的简单行，可以留在页面目录中。

## 11. 是否需要 Mock

需要离线开发或 E2E 时，在 `mocks/handlers/<domain>.handlers.ts` 增加与真实契约相同的处理器，通过 `mocks/handlers.ts` 按确定顺序组装，并更新 `mocks/fixtures/`。新增可变状态放在 `mocks/state/` 并接入 `resetMockState()`。Mock 的字段不能随意比真实响应更宽松，否则页面只在 Mock 中工作。

## 12. 验证顺序

```powershell
npx vitest run path/to/new-tests
npm run typecheck
npm run lint
npm run lint:css
npm run build
```

若改动跨越关键旅程，再运行 Playwright。

## 13. Code Review 自查

- [ ] 没有页面直接写底层 `fetch`；
- [ ] 没有把服务端列表复制进 Zustand；
- [ ] Query Key 唯一且可正确失效；
- [ ] DTO/ViewModel 边界明确；
- [ ] 处理加载、错误、空、权限和不可用；
- [ ] 没有假数据作为请求失败兜底；
- [ ] 手机和桌面布局可用；
- [ ] 表单和按钮语义正确；
- [ ] 新增公共能力没有重复实现；
- [ ] 公开入口、分层与允许的领域读取依赖通过 `boundaries:check`，复用通过 `reuse:check`；
- [ ] 文档/路由图/项目树按需要同步；
- [ ] 测试与构建通过。

## 14. 常见错误开发顺序

不推荐：

```text
先照截图写完整页面
→ 编造假数据
→ 最后才找后端接口
→ 为了对上类型大量 as any
→ 请求失败继续显示假数据
```

推荐：

```text
确认契约
→ 领域类型与 API
→ Adapter/Hook
→ 测试
→ 页面状态
→ 路由与交互
→ 构建验证
```

## 15. 本章自测

1. 为什么实现页面前必须确认后端契约？
2. 什么情况下应该新建 Widget？
3. 删除成功后为什么通常要使 Query 失效？
4. Mock 为什么必须遵循真实契约？
5. 请求失败时展示假数据会造成什么误导？

上一章：[构建、部署与 CI](./12-build-deploy-and-ci.md)；下一章：[术语与 FAQ](./14-glossary-and-faq.md)。
