# 12. 生产构建、Docker、Nginx 与 CI

## 1. 开发服务器不等于生产部署

`npm run dev` 启动的是 Vite 开发服务器，它包含热更新、源码提示和开发代理，不适合直接暴露到生产环境。

生产流程：

```text
TypeScript 检查
→ Vite 转换、分包、压缩
→ dist 静态文件
→ Nginx/CDN 提供文件
→ 浏览器运行 JavaScript
```

## 2. `npm run build` 做了什么

[`package.json`](../../package.json)：

```json
"build": "tsc -b && vite build"
```

先执行 TypeScript 工程构建检查，再执行 Vite：

- 把 TS/TSX 转为浏览器 JavaScript；
- 处理 CSS Modules；
- 将静态引用纳入资源图；
- 路由懒加载形成 Chunk；
- 对文件做压缩和 Hash 命名；
- 生成 Sourcemap；
- 输出 `dist/`。

Hash 文件名让内容变化时 URL 变化，适合长期缓存。

## 3. `public` 与源码资源的差别

`public/` 下文件原样复制，例如 `/favicon.svg`、`/mockServiceWorker.js`。源码中 import 的资源由 Vite 处理、Hash 和依赖追踪。

一般：

- 必须保持固定 URL 的文件放 `public`；
- 组件专属资源优先通过 import 让构建工具管理；
- 不要把大量源码依赖资源随意塞进 public 绕开构建。

## 4. Dockerfile 为什么有两个阶段

[`Dockerfile`](../../Dockerfile)：

```text
阶段 1：node:22-alpine
  npm ci
  npm run build
  产生 /app/dist

阶段 2：nginx:1.29-alpine
  只复制 dist 和 Nginx 配置
  对外提供 80 端口
```

这叫多阶段构建。最终镜像不需要 Node、TypeScript 或源码依赖，因此更小、攻击面也更低。

## 5. Nginx 配置逐项解释

[`nginx.conf`](../../nginx.conf) 的重点：

### 健康检查

```nginx
location = /healthz { return 200 'ok'; }
```

容器平台用它判断静态服务是否存活。

### 静态资源长期缓存

带 Hash 的 JS/CSS/图片设置一年缓存和 immutable。因为内容变化会产生新文件名，旧缓存不会覆盖新版本。

### HTML 不缓存

`index.html` 需要尽快指向最新 Hash 资源，因此使用 `no-cache`。

### SPA 回退

```nginx
try_files $uri $uri/ /index.html;
```

直接刷新 `/settings/account` 时，服务器磁盘上没有这个目录，需要返回 `index.html` 再由 React Router 匹配。

## 6. 构建期环境变量

Vite 的 `VITE_` 变量通常在构建时被替换进前端 Bundle，而不是容器启动后动态读取。

这意味着：

- 同一个静态镜像若要部署不同 API 地址，需要在构建阶段提供对应值；
- `docker run -e VITE_API_BASE_URL=...` 通常不会自动改已经构建好的 JS；
- 生产密钥仍绝不能放进去，因为用户能下载 Bundle。

若未来需要“同镜像多环境运行时配置”，应设计单独的公开配置文件或启动时模板替换机制，而不是误以为 Vite 自动支持。

## 7. Sourcemap 的价值与注意事项

[`vite.config.ts`](../../vite.config.ts) 开启 `sourcemap: true`。它让压缩后的生产错误映射回 TypeScript 源码，便于监控定位。

公开 Sourcemap 也会暴露更多源码结构。正式环境可根据监控平台选择：上传到错误监控但不公开服务，或保留受控访问。

## 8. 本地预览与 Docker 验证

先验证生产构建：

```powershell
npm run build
npm run preview
```

再验证容器：

```powershell
docker compose up -d --build
Invoke-WebRequest http://localhost:8080/healthz
docker compose logs web
```

验证深层路由：直接访问 `http://localhost:8080/auth/login`，刷新后仍应正常，而不是 404。

## 9. CI 流水线

[`ci.yml`](../../.github/workflows/ci.yml) 在 push 或 PR 时：

1. Checkout；
2. 安装 Node 22；
3. `npm ci`；
4. 边界规则自测、边界检查与复用检查（`boundaries:test`、`boundaries:check`、`reuse:check`）；
5. 格式检查；
6. 类型检查；
7. ESLint；
8. Stylelint；
9. Vitest；
10. 生产构建；
11. Storybook 构建；
12. 安装 Chromium；
13. Playwright E2E；
14. 上传 `dist` Artifact。

CI 不是“替开发者找所有错误”的替代品。提交前本地运行相应检查可以更快反馈，也减少远端流水线浪费。

## 10. 为什么格式、类型、Lint、测试都需要

它们检查的问题不同：

- Prettier：代码格式一致；
- TypeScript：类型契约；
- ESLint：危险代码模式与 Hook 规则；
- Boundaries：层级、公开入口、允许的领域依赖和循环；
- Reuse：重复实现与绕过公共能力；
- Stylelint：CSS 质量；
- Vitest：业务行为；
- Build：真实打包链路；
- E2E：浏览器旅程。

通过其中一个不代表其他都通过。

## 11. 发布前检查表

- [ ] 使用正确生产环境变量重新构建；
- [ ] `npm ci` 与 lock 文件一致；
- [ ] `npm run check` 通过；
- [ ] 关键 E2E 通过；
- [ ] `/healthz` 正常；
- [ ] 深层路由刷新不 404；
- [ ] API 与 Socket 指向正确域名；
- [ ] HTTPS、Cookie、CORS/Origin 配置匹配；
- [ ] JS/CSS 缓存长期，HTML 不被永久缓存；
- [ ] Sourcemap 策略符合安全和监控要求；
- [ ] 回滚版本可用。

## 12. 本章自测

1. 为什么不能把 Vite 开发服务器直接作为生产服务器？
2. 多阶段 Docker 构建有什么好处？
3. 为什么 Hash 静态资源可以缓存一年，而 HTML 不应该？
4. 运行容器时设置 `VITE_API_BASE_URL` 为什么可能无效？
5. Typecheck 通过为什么仍不能跳过测试和 Build？

上一章：[调试指南](./11-debugging-guide.md)；下一章：[如何增加一个功能](./13-how-to-add-a-feature.md)。
