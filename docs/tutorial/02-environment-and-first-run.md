# 02. 环境准备与首次启动

## 1. 你需要安装什么

本项目要求：

- Node.js 22.12 或更高版本；
- npm 10 或更高版本；
- Git；
- VS Code（推荐）；
- 连接真实业务时需要 Nexora Backend；
- 使用容器构建时需要 Docker Desktop。

仓库根目录的 [`.nvmrc`](../../.nvmrc) 记录推荐 Node 主版本。先检查：

```powershell
node --version
npm --version
git --version
```

## 2. 为什么用 `npm ci` 而不是随手 `npm install`

仓库同时提交了 [`package.json`](../../package.json) 和 [`package-lock.json`](../../package-lock.json)：

- `package.json` 描述允许的依赖和项目命令；
- `package-lock.json` 锁定完整依赖树的精确版本；
- `npm ci` 严格按照 lock 文件重建 `node_modules`，适合新环境和 CI；
- `npm install` 更适合主动增加或升级依赖，因为它可能更新 lock 文件。

首次安装：

```powershell
Set-Location C:\Users\lct_f\Desktop\X项目\twitter-clone-web
npm ci
```

不要提交 `node_modules/`。它体积很大且可由 lock 文件重建。

## 3. 环境变量如何生效

Vite 会按运行模式读取 `.env` 文件。项目中常见文件：

| 文件                      | 用途                           |
| ------------------------- | ------------------------------ |
| `.env.example`            | 可复制的变量模板               |
| `.env.development`        | `npm run dev` 的开发默认值     |
| `.env.test`               | 测试模式                       |
| `.env.production.example` | 生产配置示例                   |
| `.env.local`              | 当前机器的本地覆盖，通常不提交 |

安全创建本地文件：

```powershell
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
```

最重要的变量：

```dotenv
VITE_API_BASE_URL=
VITE_SOCKET_URL=
VITE_ENABLE_MOCK=false
VITE_API_TIMEOUT_MS=15000
```

所有暴露给浏览器的自定义变量必须以 `VITE_` 开头。项目在 [`src/shared/config/env.ts`](../../src/shared/config/env.ts) 中用 Zod 解析它们，把字符串 `"true"` 转成布尔值，并给超时时间设置默认值。

修改环境变量后必须重启 Vite，因为它们是在开发服务器启动或构建时读取的。

## 4. 两种开发模式

### 模式 A：连接真实后端

适合联调登录、数据库、通知、上传等真实功能。

确保 `.env.local`：

```dotenv
VITE_ENABLE_MOCK=false
VITE_API_BASE_URL=
VITE_SOCKET_URL=
```

当 API 地址为空时，代码请求相对路径 `/api/...`。Vite 在 [`vite.config.ts`](../../vite.config.ts) 中把它代理到 `http://localhost:3000`：

```text
浏览器请求 localhost:5173/api/...
        ↓ Vite proxy
后端收到 localhost:3000/api/...
```

这样浏览器看来请求仍来自 5173，同源开发更方便。

先启动后端，再启动前端：

```powershell
npm run dev
```

访问 <http://localhost:5173>。

### 模式 B：使用 MSW Mock

适合暂时不启动后端、只练习界面与组件。

```dotenv
VITE_ENABLE_MOCK=true
VITE_API_BASE_URL=
VITE_SOCKET_URL=
```

重启：

```powershell
npm run dev
```

[`src/app/mountApplication.ts`](../../src/app/mountApplication.ts) 会在开发或测试模式动态加载 [`src/mocks/browser.ts`](../../src/mocks/browser.ts)。MSW 的 Service Worker 拦截请求，并由 [`src/mocks/handlers.ts`](../../src/mocks/handlers.ts) 按固定顺序组装各领域处理器，返回模拟响应。接口规则位于 `mocks/handlers/`，可变数据位于 `mocks/state/`。

Mock 只模拟 HTTP 响应，不代表真实数据库、短信、Google 验签或异步 Worker 正常。

## 5. 如何判断启动成功

终端应该显示 Vite 地址，并且浏览器能打开登录页。进一步检查：

1. 按 `F12` 打开开发者工具；
2. Console 中没有红色启动异常；
3. Network 中能看到 `/api` 请求；
4. 请求状态是成功或预期业务错误，而不是连接失败；
5. React Query Devtools 按钮在开发环境出现；
6. 修改一个页面文案后，浏览器能热更新。

## 6. 常用命令与其真正含义

| 命令                | 实际工作                                       |
| ------------------- | ---------------------------------------------- |
| `npm run dev`       | 启动 Vite 开发服务器，不生成最终部署包         |
| `npm run typecheck` | 用 TypeScript 检查类型，不输出 JS              |
| `npm run lint`      | 检查 TS/TSX/JS 的代码规则                      |
| `npm run lint:css`  | 检查 CSS 规则                                  |
| `npm run test`      | 用 Vitest 运行单元和组件测试                   |
| `npm run build`     | 先做 TypeScript 构建，再用 Vite 生成 `dist/`   |
| `npm run preview`   | 本地预览已经生成的生产包                       |
| `npm run check`     | 串行执行复用、格式、类型、Lint、测试和构建检查 |

## 7. 常见启动故障

### 5173 被占用

项目设置了 `strictPort: true`，不会偷偷换成 5174：

```powershell
Get-NetTCPConnection -State Listen -LocalPort 5173
```

找到并停止冲突进程，再重新启动。

### 页面能开但全部请求失败

按顺序检查：

1. 后端是否监听 3000；
2. `VITE_ENABLE_MOCK` 是否符合预期；
3. `VITE_API_BASE_URL` 是否写错；
4. 修改 `.env.local` 后是否重启 Vite；
5. Network 中的 Request URL 到底是什么。

### PowerShell 不允许运行脚本

可先直接执行 `npm.cmd run dev`，或检查组织的 PowerShell 策略。不要为了一个项目随意永久关闭系统安全策略。

### 页面出现旧内容

先确认启动的是当前目录，再强制刷新浏览器。若修改的是环境变量或依赖，需要重启开发服务器。

## 8. VS Code 推荐工作方式

1. 用“打开文件夹”打开仓库根目录，不要只打开某个 `.tsx`；
2. 使用集成终端运行命令；
3. 保持 TypeScript 语言服务启用；
4. 在 Problems 面板查看类型与 Lint 错误；
5. 使用全局搜索追踪组件或 API 名称；
6. 不要在 `dist/` 或 `node_modules/` 中改代码。

## 9. 本章自测

1. `npm ci` 和 `npm install` 的使用场景有什么不同？
2. 为什么 `VITE_` 变量不能存私钥？
3. `VITE_API_BASE_URL` 为空时，API 请求怎样到达 3000？
4. Mock 模式能证明真实短信发送正常吗？
5. 为什么修改环境变量后必须重启开发服务器？

上一章：[Web 与项目全景](./01-web-and-project-overview.md)；下一章：[TypeScript 与 React 基础](./03-typescript-and-react-basics.md)。
