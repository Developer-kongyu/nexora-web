# 10. Mock 与自动化测试

## 1. 为什么要分层测试

不同测试回答不同问题：

| 类型            | 回答的问题                           | 速度 |
| --------------- | ------------------------------------ | ---- |
| 纯函数测试      | 输入输出规则对不对？                 | 最快 |
| Hook/Store 测试 | 状态变化与缓存规则对不对？           | 快   |
| 组件测试        | 用户点击后界面和请求是否正确？       | 中等 |
| API 契约测试    | 请求路径、方法、body、适配是否正确？ | 中等 |
| E2E             | 从浏览器入口到完整旅程能否工作？     | 最慢 |

不要只写 E2E。它覆盖面大但定位慢；也不要只写纯函数测试，因为它无法证明页面连接正确。

## 2. Vitest 配置

[`vitest.config.ts`](../../vitest.config.ts) 设置：

- `jsdom` 模拟浏览器 DOM；
- `src/test/setup.ts` 作为全局初始化；
- 加载 CSS Modules；
- 测试文件位于 `src/**/*.test.ts(x)`；
- E2E 单独排除；
- V8 生成覆盖率。

运行：

```powershell
npm run test
npm run test:watch
npm run test:coverage
```

只运行一个文件：

```powershell
npx vitest run src/pages/auth/RegisterPage.test.tsx
```

## 3. 测试结构：Arrange、Act、Assert

以 [`feedRefresh.test.ts`](../../src/domains/feed/lib/feedRefresh.test.ts) 为例：

1. Arrange：准备当前分页和新第一页；
2. Act：调用 `mergeRefreshedFeed`；
3. Assert：检查新帖、重复帖、旧帖顺序和 Cursor。

纯函数测试不需要渲染 React，也不需要 Mock 网络，失败时非常容易定位。

## 4. Testing Library 的核心观念

Testing Library 鼓励像用户一样查找元素：

```ts
screen.getByRole('button', { name: '发送验证码' });
screen.getByLabelText('手机号');
```

优先顺序通常是：

1. Role + 可访问名称；
2. Label；
3. 可见文本；
4. 最后才考虑 Test ID。

这会反过来促进可访问性。若测试无法通过角色找到按钮，真实辅助技术可能也无法理解它。

## 5. MSW 如何模拟网络

MSW 在网络层拦截请求，而不是 Mock `fetch` 函数。

测试初始化 [`src/test/setup.ts`](../../src/test/setup.ts)：

```ts
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  resetMockState();
});
afterAll(() => server.close());
```

`onUnhandledRequest: 'error'` 很重要：测试发出未声明请求时立即失败，防止意外访问真实网络或漏写处理器。

单个测试可临时覆盖：

```ts
server.use(http.post('/api/example', () => apiSuccessResponse({ ok: true })));
```

测试后 `resetHandlers()` 恢复默认处理器；从 [`mocks/state`](../../src/mocks/state/index.ts) 导入的 `resetMockState()` 另行恢复各领域 Map、数组与 fixture 副本。MSW 不会自动清理业务数据，因此两步都需要。QueryClient 与组件使用的其他状态仍按各测试需要隔离。

默认接口实现在 `mocks/handlers/*.handlers.ts`，由 [`handlers.ts`](../../src/mocks/handlers.ts) 按固定顺序组装。新增路由时保持静态资源（如 `/api/users/me`）先于可能匹配它的参数路由；新增可变状态时接入统一重置入口。

## 6. 组件测试需要提供依赖环境

注册页依赖 Query、Router 和 Toast，所以测试包装：

```text
QueryClientProvider
└─ MemoryRouter
   └─ ToastProvider
      └─ RegisterPage
```

测试用 QueryClient 应关闭重试，否则一个预期失败可能等待多次请求，使测试变慢和不稳定。

## 7. 异步断言

网络和 React 更新不是同步完成的：

```ts
await waitFor(() => expect(submittedBody).toEqual(expected));
expect(await screen.findByText('验证码已发送')).toBeInTheDocument();
```

- `getBy`：元素现在就应存在；
- `findBy`：等待元素出现；
- `queryBy`：检查元素不存在；
- `waitFor`：等待一个断言最终成立。

不要用任意 `setTimeout` 等待，这会让测试慢且易抖动。

## 8. 测什么，不测什么

应该测试：

- 用户可见结果；
- 请求路径、方法与请求体；
- 加载、错误和禁用状态；
- 缓存失效或纯转换规则；
- 路由跳转和权限守卫；
- 回归 Bug 的最小复现。

通常不应该测试：

- React 自己是否调用 `useState`；
- 私有变量名称；
- CSS 的每一个具体像素；
- 第三方库内部实现。

## 9. Playwright E2E

[`playwright.config.ts`](../../playwright.config.ts) 会：

1. 用测试模式构建；
2. 在 4173 启动生产预览；
3. 开启 MSW；
4. 使用 Chromium 执行 `tests/e2e`；
5. 失败时保留截图，首次重试保留 Trace。

安装浏览器：

```powershell
npx playwright install chromium
npm run test:e2e
```

E2E 应覆盖少量高价值旅程，不要复制所有组件测试。

## 10. Storybook 与测试的区别

Storybook 是组件工作台，适合人工查看不同 Props、尺寸和状态；它不是自动断言的替代品。组件可以同时拥有 Story 和 Test：前者帮助视觉开发，后者保证行为回归。

## 11. 修 Bug 的正确测试策略

1. 先写或找到能稳定复现 Bug 的最小测试；
2. 确认测试在修复前失败；
3. 修改实现；
4. 确认测试通过；
5. 运行相邻测试和构建；
6. 不要为了让测试绿而弱化关键断言。

## 12. 本章自测

1. 为什么纯函数测试比 E2E 更容易定位问题？
2. `getByRole` 为什么优于随处加 Test ID？
3. MSW 的 `onUnhandledRequest: error` 有什么价值？
4. `findBy` 与 `getBy` 的区别是什么？
5. 修回归 Bug 时为什么应先构造失败测试？

上一章：[真实功能链路](./09-feature-flow-walkthrough.md)；下一章：[调试指南](./11-debugging-guide.md)。
