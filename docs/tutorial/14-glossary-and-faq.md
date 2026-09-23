# 14. 前端术语表与常见问题

## 术语表

### API

前后端约定的通信接口，包括 URL、HTTP 方法、参数、响应和错误。

### API Envelope

统一响应外壳，例如 `{ code, message, data }`。通用 Client 负责解包。

### AbortSignal

用于取消异步请求。用户离开页面或 Query 被替换时，可中止无用请求。

### Adapter

把一种数据形状转换为另一种形状，本项目常用于 DTO → ViewModel。

### Bundle / Chunk

构建后的 JavaScript 文件。Chunk 是按路由或依赖拆分的代码块。

### Client State

只属于前端交互的状态，例如弹窗、当前 Tab、认证内存态。

### CSRF

跨站请求伪造攻击。项目对修改类请求附带 CSRF Token，后端必须验证。

### CSS Modules

把 CSS 类名局部化的方案，避免不同组件的类名冲突。

### Cursor Pagination

用游标而不是页码获取下一批数据，适合持续变化的信息流。

### DTO

Data Transfer Object，接口传输的数据结构，不一定适合直接渲染。

### E2E

端到端测试，使用真实浏览器从用户入口验证完整旅程。

### HMR

Hot Module Replacement，开发时修改代码后局部热更新。

### Hook

React 的可组合状态/副作用函数，例如 `useState`、`useFeed`。

### Idempotency Key

幂等键，用来帮助后端识别重复写请求，避免重复执行。

### Invalidation

标记 Query 缓存已过期，促使它重新读取服务端权威数据。

### JSX / TSX

在 JavaScript/TypeScript 中描述 UI 的语法。TSX 是带 TypeScript 的 JSX。

### Lazy Loading

进入某个路由时才下载其代码，减少初始 Bundle。

### Mock

模拟外部依赖。本项目使用 MSW 模拟 HTTP 响应。

### Mutation

创建、修改、删除等写操作在 TanStack Query 中的抽象。

### Origin

协议、主机、端口三者组合。`localhost:5173` 与 `127.0.0.1:5173` 是不同 Origin。

### Provider

通过 React Context 为组件树提供缓存、Toast 等全局能力的组件。

### Query Key

TanStack Query 缓存条目的身份键。

### Server State

权威来源在服务器的数据，具有异步、缓存、过期和并发特征。

### SPA

单页应用。使用前端路由在一份 HTML 壳内切换页面。

### Sourcemap

把生产压缩代码映射回源码的文件，帮助定位错误。

### Store

共享客户端状态容器，本项目使用 Zustand 管理认证状态。

### ViewModel

为 UI 展示整理后的数据模型，与后端 DTO 解耦。

## 常见问题

### 为什么不用 Redux？

项目的大部分远端数据由 TanStack Query 管理，少量跨页客户端状态由 Zustand 管理，目前不需要 Redux 的额外结构。工具选择取决于问题，不是 Redux 不好。

### 为什么不把所有 API 数据放 Zustand？

服务端数据需要缓存过期、请求去重、分页、失效、重试和并发控制。TanStack Query 已专门解决这些问题，复制到 Store 会造成双份权威来源。

### 为什么 API Client 不直接放每个领域？

Token、CSRF、超时、错误解包等协议行为应一致；领域只需要定义端点和业务转换。

### 为什么页面和领域旁边都有测试？

测试靠近被测代码更容易维护。E2E 因为从应用外部驱动浏览器，集中在 `tests/e2e`。

### 为什么有些页面有内联样式？

少量一次性、简单、无伪类/响应式需求的样式可内联。复杂规则仍应进入 CSS Module。

### 为什么开发请求有时显示 5173 而不是 3000？

因为使用相对 `/api` 时，浏览器先请求 Vite，Vite 再代理到后端。Network 展示的浏览器入口可能仍是 5173。

### 为什么刷新后 Access Token 没了却还能登录？

Access Token 只在内存；应用启动时用 HttpOnly Refresh Cookie 请求后端恢复会话。

### 为什么我不能在 JavaScript 中读取 Refresh Cookie？

HttpOnly Cookie 故意禁止 JavaScript 读取，以降低 XSS 直接窃取长期凭据的风险。

### 为什么开发时 Effect 似乎执行两次？

React StrictMode 会在开发环境帮助检测不安全副作用。应保证 Effect 有正确清理，而不是删除 StrictMode。

### 为什么 `VITE_ENABLE_MOCK=false` 仍然像使用旧 Mock？

修改后需重启 Vite，并检查浏览器 Service Worker。确认当前 `.env.local` 覆盖关系和 Network 响应来源。

### 为什么直接刷新生产 URL 返回 404？

静态服务器没有真实的 `/settings` 文件，需要配置 SPA 回退到 `index.html`。仓库 Nginx 已配置。

### 为什么构建通过但页面仍可能有 Bug？

构建主要证明语法、类型和资源图可处理，不证明所有业务行为。仍需要单元、组件和 E2E 测试。

### 为什么不应该修改 `dist`？

`dist` 是构建产物，下次构建会覆盖。应修改 `src` 或配置，然后重新构建。

### 新增依赖前应该考虑什么？

- 原生平台或现有依赖能否解决；
- 包是否维护、体积和许可证；
- 是否引入重复能力；
- 浏览器兼容与类型质量；
- 对 Bundle 和安全面的影响。

上一章：[如何增加一个功能](./13-how-to-add-a-feature.md)；下一章：[练习实验](./15-practice-labs.md)。
