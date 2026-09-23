# 11. 调试指南：从现象定位到根因

## 1. 不要从“随便改点东西”开始

一个可靠的调试过程：

```text
稳定复现 → 缩小层级 → 收集证据 → 提出假设 → 最小验证 → 修复 → 回归测试
```

先写清：

- 访问哪个 URL；
- 使用真实后端还是 Mock；
- 执行了哪些操作；
- 预期和实际分别是什么；
- Console、Network、页面错误是什么；
- 是否只在刷新、首次登录或特定账号出现。

## 2. 浏览器开发者工具四个核心面板

### Console

看启动异常、未捕获 Promise、React 警告、Socket 连接失败。不要只截图最后一行，第一条错误通常更接近根因。

### Network

检查：

- Request URL；
- Method；
- Status；
- Request Headers；
- Payload；
- Response；
- Timing；
- `x-request-id`；
- Cookie 是否发送。

### Application

查看 Cookie、Session Storage、Service Worker。Mock 模式依赖 Service Worker；Google 补全流程使用 Session Storage 保存短期状态。

### Elements

查看实际 DOM、类名、盒模型、计算样式和被覆盖规则。

## 3. 按 HTTP 状态分类

| 现象                  | 常见原因                                       |
| --------------------- | ---------------------------------------------- |
| 无请求                | 事件没触发、校验拦截、按钮禁用、条件渲染       |
| `(failed)` / status 0 | 后端未启动、代理错误、DNS、TLS、请求被中止     |
| 400/422               | 输入或契约错误                                 |
| 401                   | Access Token 过期、Refresh 失败、Cookie 未携带 |
| 403                   | CSRF、权限或 Origin                            |
| 404                   | 路径/参数错误，或生产 SPA 未回退               |
| 409                   | 版本冲突、重复资源、幂等冲突                   |
| 429                   | 限流，关注 Retry-After                         |
| 5xx                   | 后端或依赖故障，使用 Request ID 查日志         |

## 4. API 失败的排查顺序

1. Network 中有没有请求；
2. URL 是否指向预期环境；
3. Method 和 body 是否正确；
4. Response 的 `code/message/details`；
5. Request ID；
6. `apiClient` 是否把错误正确转换；
7. 页面是否误把错误当空数据；
8. 后端对应日志和依赖状态。

不要看到“Network Error”就先改 UI。

## 5. React Query Devtools

开发模式下 [`AppProviders.tsx`](../../src/app/providers/AppProviders.tsx) 加载 React Query Devtools。它能查看：

- Query Key；
- fresh/stale/fetching 状态；
- 缓存数据；
- 最后更新时间；
- 失效与重新请求。

如果页面显示旧数据，先判断：

- Mutation 是否使正确 Key 失效；
- 两个页面是否使用相同 Key；
- Query 是否被 `enabled: false` 禁用；
- 当前数据只是仍处于 `staleTime` 内。

## 6. 认证循环与跳转问题

登录后又回登录页时检查：

1. 登录响应是否成功；
2. `useLogin` 是否调用 `setSession`；
3. Store 状态是否为 authenticated；
4. Refresh Cookie 是否存在并允许发送；
5. 页面刷新时 Refresh 接口结果；
6. 引导状态是否把用户重定向；
7. 是否混用了 `localhost` 与 `127.0.0.1`。

不要把路由守卫简单删掉，这会隐藏状态问题并削弱体验。

## 7. 环境变量为什么看起来“不生效”

常见原因：

- 没有 `VITE_` 前缀；
- 修改后没有重启 Vite；
- `.env.local` 覆盖了 `.env.development`；
- 构建镜像时变量与运行容器时变量混淆；
- 值是字符串，直接按布尔值使用；
- 打开的不是当前仓库启动的端口。

可以运行：

```powershell
npm run env:check
```

但不要把包含敏感值的完整环境输出贴到公开 Issue。

## 8. CSS 问题如何定位

1. Elements 确认目标元素存在；
2. 查看 CSS Module 生成的实际类；
3. Computed 面板确认最终值；
4. 找被划掉的规则和更高优先级来源；
5. 检查父容器宽度、overflow、position；
6. 检查 Grid/Flex 子项的 `min-width`；
7. 在不同视口和长文本下测试。

不要用连续增加 `!important` 的方式解决结构问题。

## 9. TypeScript 错误怎么看

从最上游错误开始修。一个类型定义错误可能造成几十条下游报错。常见模式：

- `possibly undefined`：下标或可选字段未处理；
- `not assignable`：实际数据与契约不一致；
- `property does not exist`：类型或字段名过期；
- `cannot find module`：路径、别名或文件名大小写问题；
- `used before assigned`：分支没有覆盖全部情况。

不要用 `as any` 一把压掉，它会把编译期问题推迟到运行时。

## 10. React StrictMode 的“双调用”

开发时发现 Effect 执行、连接建立或日志出现两次，先检查清理函数是否完整。StrictMode 会帮助发现副作用不安全。生产构建通常不执行这套开发检查。

## 11. 最小复现技巧

- 关闭无关 Tab 和页面区块；
- 用一个固定 ID 或最小输入；
- 用 MSW 精确返回某个错误；
- 把复杂转换抽成纯函数测试；
- 用 MemoryRouter 指定初始 URL；
- 记录问题是否依赖缓存、登录态或时间。

最小复现不是重写项目，而是去掉与问题无关的变量。

## 12. 常用诊断命令

```powershell
npm run typecheck
npm run lint
npm run lint:css
npx vitest run path/to/file.test.tsx
npm run build
git diff --check
git status --short
```

## 13. 本章自测

1. 请求完全没有出现在 Network 时，应先检查什么？
2. 401、403、429 通常分别代表哪类问题？
3. Query Devtools 能帮助判断哪些缓存问题？
4. 为什么不建议用 `as any` 消除类型错误？
5. StrictMode 暴露重复副作用时应怎样处理？

上一章：[Mock 与测试](./10-mocks-and-testing.md)；下一章：[构建、部署与 CI](./12-build-deploy-and-ci.md)。
