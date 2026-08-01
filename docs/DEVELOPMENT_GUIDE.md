# 开发指南

## 1. 新增一个领域接口

以 `domains/posts` 为例：

1. 在 `model/types.ts` 定义输入、服务端 DTO 或页面 ViewModel。
2. 在 `api/postsApi.ts` 使用 `apiClient` 封装 HTTP。
3. 在 `model/queryKeys.ts` 定义领域 query key factory，在 `hooks` 中定义 query/mutation 和缓存失效。
4. 从领域 `index.ts` 只导出外部需要的公开 API。
5. 在 `mocks/handlers.ts` 增加模拟接口。
6. 编写 API、hook 或组件测试。

禁止页面直接拼 URL 或调用 `fetch`。

## 2. 新增页面

1. 在 `src/pages/<name>` 创建页面。
2. 页面组合 `PageHeader`、`PageLayout`、widgets 和领域 hooks。
3. 在 `src/app/router/router.tsx` 使用 `lazy` 增加路由。
4. 如需侧栏入口，更新 `Sidebar.tsx`。
5. 更新 `docs/ROUTE_MAP.md`。
6. 增加至少一个加载、空、错误或无权限状态。

## 3. Query Key 规范

采用领域 key factory，不在页面、Provider 或 Mutation 中手写根 key：

```ts
export const postKeys = {
  all: ['posts'] as const,
  detail: (postId: string) => [...postKeys.all, 'detail', postId] as const,
};
```

Mutation 成功后只失效必要范围，避免无差别 `invalidateQueries()`。

## 4. 复用与唯一职责

- 新增类型、枚举、常量、Hook 或工具前，先搜索 owner 领域和 `shared` 是否已有同语义实现。
- 服务端 DTO 只能在 owner 领域定义；页面不得声明字段相同的本地合同。
- cursor、查询串、Infinite Query 缓存变换、选择状态、乐观布尔切换和基础纯函数复用 `shared`。
- Query Key、枚举标签、错误/占位文案和领域状态机放在对应领域的 `model`、`lib` 或 `hooks`。
- 同值但不同业务语义的类型不得为了“减少行数”强行合并。
- 详细规则和权威实现表见 `docs/REUSE_GUIDELINES.md`。

提交前单独执行：

```bash
npm run reuse:check
```

## 5. ViewModel 规范

接口 DTO 不应直接渗透全部 UI。对于 PostCard，领域层应产出稳定的 `PostViewModel`：作者、媒体、链接预览、统计、viewer 状态和权限信息已经归一化。页面不再分别判断十几种后端字段。

## 6. 表单规范

- schema 放在页面或领域附近。
- 服务端 `fieldErrors` 映射回 React Hook Form。
- 提交期间禁用重复写按钮。
- 破坏性操作必须有二次确认。
- 草稿类表单实现防抖自动保存和版本冲突提示。

## 7. 样式规范

- 全局值进入 `src/app/styles/tokens.css`。
- 组件样式使用 `*.module.css`。
- 避免绝对定位正文和动作栏。
- 帖子卡片互动区只能由 `PostActionBar` 负责。
- 桌面、平板和移动断点优先在组件内渐进处理。
- 图标按钮必须提供 `aria-label`。

## 8. 错误处理

`ApiError` 至少提供：

- `httpStatus`
- `code`
- `message`
- `requestId`
- `fieldErrors`
- `retryAfterSeconds`

页面根据错误码选择登录过期、无权限、资源已删除、冲突、限流或通用重试状态；不要用字符串模糊匹配。

## 9. 实时事件

- socket payload 必须有事件 ID 或 cursor，支持去重。
- 断线重连后调用 HTTP delta 补拉。
- 实时事件只更新 Query cache，不再维护第二份通知列表。
- 页面卸载不能误关闭整个应用共享连接。

## 10. 性能

- 页面按路由懒加载。
- 图片提供尺寸与懒加载，视频不自动下载全部内容。
- 长列表接近性能阈值后引入虚拟列表，不提前复杂化。
- 使用 React Query placeholder/initial data 防止页面闪烁。
- 对频繁搜索输入做防抖，但 AbortSignal 仍要传入请求。

## 11. 发布前检查

```bash
npm ci
npm run check
npm run storybook:build
npx playwright install chromium
npm run test:e2e
```

CI 使用 `npm ci`，提交时必须包含最新 `package-lock.json`。
