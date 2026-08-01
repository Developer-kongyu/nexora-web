# LCT Web 完整前端工程

LCT 是一套现代兴趣社交网络前端。该工程依据压缩包中的 31 张 1440 × 1024 高保真图、逐页补充说明和后端模块文档完成，覆盖认证、引导、信息流、搜索、内容创作、个人主页、收藏、社群、通知、设置、浏览历史以及系统状态等完整业务页面。

本项目不是静态页面拼装：路由、领域 API、服务端状态、表单校验、写操作、Mock 契约、错误状态、响应式布局、测试与部署配置均已按正式工程组织。

## 技术栈

- React 19 + TypeScript（strict）
- Vite 8 + React Router 7
- TanStack Query：服务端状态、缓存与 Mutation
- Zustand：认证内存态与上传队列等客户端状态
- React Hook Form + Zod：表单状态与校验
- CSS Modules + 全局设计令牌
- Lucide React：统一图标体系
- MSW：开发、单测和 E2E 共用接口模拟
- Vitest + Testing Library + Playwright + Storybook
- Docker + Nginx：生产构建与 SPA 路由回退

## 快速启动

环境要求：Node.js 22.12+、npm 10+。

```bash
npm ci
npm run dev
```

开发环境默认读取 `.env.development` 并启用 MSW。浏览器打开 Vite 输出的地址后，根路由会进入 `/home`；也可直接访问 `/auth/login` 检查完整认证流程。

接入真实后端时复制环境变量模板：

```bash
cp .env.example .env.local
```

```dotenv
VITE_APP_ENV=local
VITE_API_BASE_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
VITE_ENABLE_MOCK=false
VITE_RELEASE=local
```

Access Token 仅保存在内存中；刷新会话通过携带 HttpOnly Cookie 的 `/api/auth/refresh` 完成，不把认证令牌写入 localStorage。

## 工程结构

```text
src/
├─ app/          # 启动、Providers、Router、布局、错误边界、全局样式
├─ pages/        # 路由级页面与页面编排
├─ widgets/      # PostCard、ComposeEditor、AppShell 等跨页面业务组件
├─ domains/      # 按业务 owner 拆分的 API、hooks、types、局部状态
├─ shared/       # API 基础设施、环境配置、工具与基础 UI
├─ mocks/        # 与领域 API 对齐的 MSW fixtures 和 handlers
└─ test/         # 测试环境初始化
```

依赖方向固定为：

```text
app → pages → widgets → domains → shared
```

页面和组件不得直接使用裸 `fetch`；网络请求集中在 `shared/api/client.ts` 与 `domains/*/api`。服务端事实由 TanStack Query 管理，页面临时交互使用组件 state，跨页面客户端状态使用 Zustand。

## 已实现页面与关键交互

- 认证：密码/验证码登录、注册验证码、注册、找回密码、重置密码、Google 资料补全。
- 新手引导：兴趣选择、推荐关注、推荐社群，包含步骤状态和提交行为。
- 信息流与发现：Following/推荐切换、快速发布、趋势与推荐区域、加载和空状态。
- 搜索：帖子/用户/社群分类、排序、媒体/关系/时间筛选、清空与加载更多。
- 内容创作：正文、可见范围、媒体预览、链接、提及、表情、地点、定时、草稿保存与发布。
- 帖子详情：评论、回复、评论点赞、排序、权限切换、加载更多和不可用状态。
- 个人主页与关系：关注/取关/取消请求、资料信息、内容 Tab、复制链接、静音/屏蔽；粉丝/关注正式 cursor 列表使用权威关系快照，支持搜索、关系筛选、`followedAt` 排序和加载更多。
- 收藏与内容中心：收藏夹创建、重命名、可见范围、删除回迁、权限占位、跨收藏夹移动与批量移除；草稿按正式合同发布/删除；已删除内容按当前后端能力只读展示。
- 社群：发现与筛选、加入/退出、详情 Tab、创建、成员/申请/内容/公告/规则/日志/设置管理。
- 通知：分类、未读筛选、全部已读、关注请求、目标路由跳转和实时连接状态。
- 设置：资料、账号与设备、隐私、通知、偏好、安全与停用账号，以及 owner-only 静音/屏蔽列表、不可见账号占位和可操作条目的解除流程；后端未开放的永久删除和双重验证入口明确禁用。
- 浏览历史：筛选、单条删除、批量删除、全选和清空确认。
- 系统状态：404、403、会话失效、媒体失败、加载与空状态统一展示。

完整路由见 [`docs/ROUTE_MAP.md`](docs/ROUTE_MAP.md)，实现清单见 [`docs/IMPLEMENTATION.md`](docs/IMPLEMENTATION.md)。原设计第 15 页已在输入文档中删除，因此不创建页面。

## Mock 与真实接口

`VITE_ENABLE_MOCK=true` 时启动 `src/mocks/browser.ts`；`false` 时请求发送到 `VITE_API_BASE_URL`。Mock 数据和 handlers 与领域 API 使用同一请求路径及返回结构，涵盖认证、信息流、用户关系、帖子、收藏、社群、通知、设置和历史等链路。用户关系 Mock 会维护 follow edge、pending request、静音和屏蔽状态，并区分 Handle 解析失败与写入后权威回读降级。

新增或调整接口时应同步修改：

1. `domains/<domain>/api` 中的契约和类型；
2. TanStack Query hook 或页面 Mutation；
3. `mocks/handlers.ts` 和 fixtures；
4. 对应成功、失败或回滚测试。

## 常用命令

| 命令                               | 说明                                         |
| ---------------------------------- | -------------------------------------------- |
| `npm run dev`                      | 启动开发服务器                               |
| `npm run build`                    | TypeScript 工程构建并输出 `dist/`            |
| `npm run preview`                  | 本地预览生产包                               |
| `npm run typecheck`                | TypeScript 严格类型检查                      |
| `npm run lint`                     | ESLint 检查                                  |
| `npm run lint:css`                 | Stylelint 检查                               |
| `npm run format`                   | Prettier 格式化                              |
| `npm run test`                     | Vitest 单元与组件测试                        |
| `npm run test:e2e`                 | Playwright E2E                               |
| `npm run storybook`                | 启动组件工作台                               |
| `npm run api:generate -- <schema>` | 从 OpenAPI 生成类型                          |
| `npm run env:check -- <env-file>`  | 校验部署环境变量                             |
| `npm run reuse:check`              | 检查重复类型、枚举、常量、函数和公共能力绕过 |
| `npm run check`                    | 执行复用、格式、类型、Lint、测试和生产构建   |

首次运行 Playwright 需执行：

```bash
npx playwright install chromium
npm run test:e2e
```

## 构建与部署

```bash
npm run build
```

生产产物位于 `dist/`。静态服务器必须把未知路由回退到 `index.html`。项目同时提供多阶段 `Dockerfile`、`docker-compose.yml` 和 Nginx 配置：

```bash
docker compose up --build
```

Nginx 配置包含 SPA 回退、静态资源缓存和 `/healthz` 健康检查。

## 文档入口

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)：分层、状态、请求、实时通知与质量约束。
- [`docs/BACKEND_MAPPING.md`](docs/BACKEND_MAPPING.md)：前端领域与后端 owner 对接表。
- [`docs/DEVELOPMENT_GUIDE.md`](docs/DEVELOPMENT_GUIDE.md)：新增页面、接口和组件的开发规范。
- [`docs/REUSE_GUIDELINES.md`](docs/REUSE_GUIDELINES.md)：唯一职责、权威实现位置与复用评审规则。
- [`docs/VALIDATION_REPORT.md`](docs/VALIDATION_REPORT.md)：本次交付的实际检查结果与环境限制。
- [`design-reference/`](design-reference/)：原始高保真图与逐页说明，便于继续视觉回归。
