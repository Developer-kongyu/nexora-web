# Nexora Web 初学者教程

这套教程不是一份只告诉你“运行 `npm install`”的速查表，而是一条从 Web 基础走到能够独立修改 Nexora Web 的学习路线。文中所有目录、命令和代码路径都以当前仓库为准。

## 适合谁

- 刚学完 HTML、CSS、JavaScript，准备进入 React 项目的人；
- 会写简单 React 组件，但不理解大型项目为何拆成很多目录的人；
- 能运行项目，却不知道请求、缓存、登录状态和页面路由如何串起来的人；
- 想在本项目中增加页面、接口调用、表单或测试的人。

如果你完全没有写过 JavaScript，建议先掌握变量、函数、对象、数组、模块、Promise 和 `async/await`，再从第 1 章开始。

## 学习路线

| 章节                                           | 主题                     | 学完后你应该能做到                                          |
| ---------------------------------------------- | ------------------------ | ----------------------------------------------------------- |
| [01](./01-web-and-project-overview.md)         | Web 与项目全景           | 解释浏览器、服务器、SPA、React、Vite 各自负责什么           |
| [02](./02-environment-and-first-run.md)        | 环境与首次启动           | 在真实后端或 Mock 模式下启动前端并检查请求                  |
| [03](./03-typescript-and-react-basics.md)      | TypeScript 与 React 基础 | 看懂组件、Props、State、Hook、联合类型和泛型                |
| [04](./04-directory-architecture.md)           | 目录与分层架构           | 判断新代码应该放进 app、pages、widgets、domains 还是 shared |
| [05](./05-bootstrap-routing-and-providers.md)  | 启动、路由与 Provider    | 从 `index.html` 追到页面，理解懒加载、布局和路由守卫        |
| [06](./06-components-css-and-design-system.md) | 组件、CSS 与设计系统     | 编写可复用组件，使用 CSS Modules 和设计令牌                 |
| [07](./07-api-state-and-authentication.md)     | API、状态与认证          | 区分本地状态、服务端状态和认证状态，追踪一次真实请求        |
| [08](./08-forms-and-validation.md)             | 表单与校验               | 使用 React Hook Form、Zod 和 Mutation 构建可靠表单          |
| [09](./09-feature-flow-walkthrough.md)         | 真实功能链路             | 完整追踪首页信息流和手机号注册的数据流                      |
| [10](./10-mocks-and-testing.md)                | Mock 与测试              | 编写纯函数、组件、接口和 E2E 测试                           |
| [11](./11-debugging-guide.md)                  | 调试方法                 | 用浏览器、React Query Devtools 和日志定位常见故障           |
| [12](./12-build-deploy-and-ci.md)              | 构建、Docker 与 CI       | 解释 `dist`、Nginx、SPA 回退、缓存与流水线                  |
| [13](./13-how-to-add-a-feature.md)             | 新功能开发流程           | 按契约、领域、页面、路由、测试的顺序实现功能                |
| [14](./14-glossary-and-faq.md)                 | 术语与常见问题           | 快速查阅项目中频繁出现的前端术语                            |
| [15](./15-practice-labs.md)                    | 练习实验                 | 通过循序渐进的小任务检验理解程度                            |

## 推荐读法

1. 初学者按编号顺序阅读，不要一开始就钻进复杂页面。
2. 每读一章，都在 VS Code 中打开文中提到的真实文件。
3. 运行开发服务器，使用浏览器开发者工具观察页面与请求。
4. 完成每章末尾的自测，再进入下一章。
5. 修改代码前创建 Git 分支；实验完成后可丢弃分支，不污染主线。

## 先记住五条原则

1. **页面不直接拼装底层 HTTP 请求。** 网络细节统一放在 `shared/api` 和 `domains/*/api`。
2. **服务端数据不复制进 Zustand。** 帖子、用户列表和通知等由 TanStack Query 管理。
3. **按业务域组织代码。** `posts`、`auth`、`feed` 等领域拥有自己的类型、API 和 Hook。
4. **依赖只向下走。** 大体方向是 `app → pages → widgets → domains → shared`。
5. **界面只是业务状态的投影。** 加载、成功、空列表、无权限、失败都必须来自真实状态，而不是写死演示数据。

## 你会反复用到的入口

- 应用入口：[`src/app/main.ts`](../../src/app/main.ts)
- 路由表：[`src/app/router/router.tsx`](../../src/app/router/router.tsx)
- 环境变量解析：[`src/shared/config/env.ts`](../../src/shared/config/env.ts)
- API 客户端：[`src/shared/api/client.ts`](../../src/shared/api/client.ts)
- 首页：[`src/pages/home/HomePage.tsx`](../../src/pages/home/HomePage.tsx)
- 注册页：[`src/pages/auth/RegisterPage.tsx`](../../src/pages/auth/RegisterPage.tsx)
- 测试初始化：[`src/test/setup.ts`](../../src/test/setup.ts)
- 构建配置：[`vite.config.ts`](../../vite.config.ts)

## 与其他文档的关系

这套教程负责“教会初学者为什么和怎么做”。已有文档仍各有用途：

- [`README.md`](../../README.md)：快速启动和技术栈概览；
- [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md)：面向维护者的架构约束；
- [`docs/BACKEND_MAPPING.md`](../BACKEND_MAPPING.md)：前后端接口映射；
- [`docs/ROUTE_MAP.md`](../ROUTE_MAP.md)：路由清单；
- [`docs/DEVELOPMENT_GUIDE.md`](../DEVELOPMENT_GUIDE.md)：日常工程操作；
- [`docs/adr/0001-domain-modular-spa.md`](../adr/0001-domain-modular-spa.md)：为何采用领域模块化 SPA 的决策记录。

## 完成标准

当你能独立回答下面的问题，就已经具备在本项目中开发普通功能的基础：

- 浏览器访问 `/home` 后，哪些文件依次参与渲染？
- 为什么帖子列表应该交给 TanStack Query，而不是 `useState` 或 Zustand？
- 为什么 `pages` 可以依赖 `domains`，反过来却不应该？
- `VITE_API_BASE_URL` 为空时，请求为何仍能到达 3000 端口？
- 登录过期后的 401 是在哪里触发刷新和重试的？
- 为什么直接刷新生产环境的 `/settings` 需要 Nginx 回退到 `index.html`？
- 一个新接口功能至少应该包含哪些类型、API、Hook、页面状态和测试？
