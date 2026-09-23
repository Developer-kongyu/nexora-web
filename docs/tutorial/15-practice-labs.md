# 15. 练习实验：从阅读到动手

所有练习建议在独立分支完成：

```powershell
git switch -c learning/frontend-tutorial
```

不要把实验用假数据或临时代码直接合入主分支。

## 实验 1：追踪启动链路

目标：说清页面是怎样出现的。

1. 从 `index.html` 找入口脚本；
2. 依次打开 `main.ts`、`bootstrapApplication.ts`、`mountApplication.ts`；
3. 找到 `ApplicationRoot`；
4. 画出 Provider 顺序；
5. 在路由中找到登录页。

验收：不用搜索，能口述从 HTML 到 LoginPage 的文件顺序。

## 实验 2：增加一个本地计数器

目标：理解组件 State，而不污染全局状态。

在 `SystemStatesDevPage` 或实验组件中增加一个按钮与计数：

```tsx
const [count, setCount] = useState(0);
```

要求：

- 使用真实 `<button>`；
- 有可访问名称；
- 不使用 Zustand；
- 写一个组件测试验证点击后数字增加。

思考：为什么刷新后归零是合理的？

## 实验 3：读取 URL 查询参数

目标：理解 URL 状态。

仿照首页 Tab，让实验页面读取 `?view=compact` 并展示不同布局。使用 Link 切换，不用 `useState` 保存同一份状态。

验收：刷新、复制链接、前进后退都保持正确视图。

## 实验 4：编写一个纯转换函数

目标：练习 TypeScript 与纯函数测试。

实现：把后端兴趣标签 DTO 转换成 `{ id, label }` ViewModel。

要求：

- 不依赖 React；
- 输入数组不被修改；
- 处理空数组；
- 有至少三个 Vitest 用例；
- 不使用 `any`。

## 实验 5：用 MSW 模拟错误

目标：理解失败状态。

为某个页面的 GET 请求临时返回 503：

```ts
server.use(http.get('/api/example', () => HttpResponse.json(..., { status: 503 })));
```

验证页面显示错误和重试按钮，而不是假数据或空白。

## 实验 6：扩展基础组件

目标：理解组件 Props 与 CSS Modules。

为 Badge 增加一个项目确实需要的 tone（仅实验分支）：

- 更新联合类型；
- 使用设计令牌；
- 添加 Story 或测试；
- 检查键盘/屏幕阅读器语义不受影响；
- 运行 Stylelint。

思考：为什么不能让调用者传任意背景颜色？

## 实验 7：增加一个校验字段

目标：理解 React Hook Form + Zod。

在实验表单增加“个人网站”：

- 可为空；
- 非空时必须是 HTTPS URL；
- 展示字段错误；
- 提交中禁用按钮；
- 测试合法、非法和空值。

不要只写 TypeScript 类型而不做运行时校验。

## 实验 8：追踪 401 刷新

目标：理解认证请求生命周期。

阅读 `client.test.ts` 和 `authSession.test.ts`，回答：

1. 第一次请求 401 后发生什么；
2. 为什么最多重试一次；
3. 多个并发 401 如何共享刷新；
4. 用户退出后旧 Refresh 响应为何失效。

可画一个 Sequence Diagram，不必改生产代码。

## 实验 9：创建只读列表页

目标：完成一个最小垂直切片。

在 Mock 模式下创建一个实验列表：

1. 定义 DTO/ViewModel；
2. 定义 Query Key；
3. 创建领域 API；
4. 创建 Query Hook；
5. 创建页面；
6. 添加懒加载路由；
7. 处理 Loading/Error/Empty/Data；
8. 添加 API 与组件测试。

验收：页面中没有底层 `fetch`，没有把列表放进 Zustand。

## 实验 10：验证生产行为

目标：理解开发与生产差异。

```powershell
npm run build
npm run preview
```

检查：

- 路由懒加载产生多个 Chunk；
- `dist/index.html` 引用 Hash 资源；
- 直接访问深层路由在 Preview 中正常；
- 环境变量是构建时值；
- Source 面板可以使用 Sourcemap。

然后用 Docker 构建，检查 `/healthz` 和 Nginx 响应头。

## 综合挑战：实现一个正式小功能

从后端已有契约中选择一个尚未展示的只读字段，按第 13 章流程完成：

- 写需求与验收；
- 确认 API 契约；
- 更新领域类型和 Adapter；
- 在现有 Widget 展示；
- 处理不可用状态；
- 添加回归测试；
- 跑完整检查；
- 更新相关文档。

不要以“页面看起来有东西”为完成标准。完成意味着类型、网络、状态、错误、测试和文档一起成立。

## 推荐结业检查

```powershell
npm run format:check
npm run typecheck
npm run lint
npm run lint:css
npm run test
npm run build
```

完成后回到[教程总目录](./README.md)，尝试回答其中的七个完成标准问题。

上一章：[术语与 FAQ](./14-glossary-and-faq.md)。
