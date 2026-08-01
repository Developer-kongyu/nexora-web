# 工程架构说明

## 1. 架构目标

本工程服务于 LCT 现代兴趣社交网络的 SPA 前端。设计重点不是堆叠页面，而是让后端 B01–B12 的 owner 边界、UI 高保真组件和前端数据流保持一致。

## 2. 分层

```text
app
└─ pages
   └─ widgets
      └─ domains
         └─ shared
```

| 层        | 责任                                          | 不允许                |
| --------- | --------------------------------------------- | --------------------- |
| `app`     | 启动、Provider、Router、全局布局、错误边界    | 实现具体业务          |
| `pages`   | 读取路由参数、组合查询、组织页面区域          | 裸 HTTP、复制领域规则 |
| `widgets` | 组合多个领域的可复用业务 UI                   | 成为服务端数据仓库    |
| `domains` | API、query/mutation hooks、领域类型、局部状态 | 依赖页面或应用壳      |
| `shared`  | API client、设计系统、通用工具                | 引用任何业务领域      |

## 3. 状态模型

### 服务端状态

使用 TanStack Query：

- 用户、帖子、时间线、社群、通知和设置。
- cursor 分页与缓存失效。
- mutation 的乐观更新与失败回滚。
- 页面切换时的数据复用和预取。

### 客户端状态

使用 Zustand 或组件 state：

- Access Token 内存态。
- 媒体上传队列和本地预览。
- 媒体查看器当前页与播放状态。
- 不适合进入 URL 的短生命周期交互状态。

搜索词、筛选项、当前标签等可分享状态优先放入 URL query string。

## 4. HTTP 与认证

`src/shared/api/client.ts` 负责：

- 统一 base URL、JSON 解析和 typed envelope。
- `credentials: include`。
- Access Token 注入。
- request ID 与幂等键。
- timeout/AbortSignal。
- 401 单飞刷新后重试一次。
- 抛出统一 `ApiError`。

Access Token 只存在模块内存；Refresh Token 由后端 HttpOnly Cookie 承载。刷新流程由 `authSession` 单飞控制，多请求同时 401 时只发起一次 refresh。

## 5. 领域与后端 owner

| 前端领域      | 后端模块 | 前端责任                                                       |
| ------------- | -------- | -------------------------------------------------------------- |
| auth          | B01      | 登录、注册、刷新、密码、onboarding                             |
| users         | B02      | 资料、关注/粉丝 cursor 列表、请求、静音/屏蔽管理与权威关系状态 |
| permissions   | B03      | 隐私/权限读取与交互禁用原因                                    |
| posts         | B04      | 帖子、草稿、发布、评论/回复/引用/转发入口                      |
| media         | B05      | 上传会话、进度、媒体资产、链接卡片                             |
| engagement    | B06      | 点赞与计数交互；其他传播写链遵循 B04 owner                     |
| library       | B07      | 收藏、内容中心、浏览历史                                       |
| communities   | B08      | 社群发现、成员关系、创建与管理                                 |
| feed          | B09      | Following、For You、Explore                                    |
| search        | B10      | 统一搜索结果与筛选                                             |
| notifications | B11      | 通知列表、未读、Socket.IO 增量                                 |
| settings      | B12      | 偏好与设置总览；资料/账号/隐私写入回各 owner                   |

### B02 关系列表与管理列表

- followers/following 页面只消费 `UserListItemView` 与 `{ list, nextCursor }`，不再把旧 `UserSummary.isFollowing`、前端推测粉丝数或 `hasMore` 当成正式合同。
- 可执行按钮由 `UserRelationSnapshotView` 推导；关注、取关和取消请求成功后使用服务端返回的 authoritative relationship 更新当前卡片，并失效 users 领域查询。
- 静音/屏蔽设置读取 self-only owner 列表。`PLACEHOLDER` 条目必须保留原始行，不伪造昵称、头像或 Handle；屏蔽项只有 `canUnblock=true` 且 Handle 可路由时才显示可执行解除操作。
- route-facing Handle 解析失败映射为 `USER_RELATION_TARGET_NOT_FOUND`；`targetState='TARGET_NOT_FOUND'` 仅表示写事务已提交后的权威回读降级成功，两者不得混为同一 UI 结果。

## 6. 帖子统一组件

所有页面必须复用：

```text
src/widgets/post-card/PostCard.tsx
src/widgets/post-card/PostActionBar.tsx
src/widgets/post-card/PostCard.module.css
```

互动顺序固定为：评论、点赞、转发、收藏、分享、浏览、更多。分隔线属于 `actionRegion` 的 `border-top`，不得在页面单独绘制横线，避免与图标文字重叠。

## 7. 发布与上传

`ComposeEditor` 用 React Hook Form + Zod 管理正文和权限；帖子上传队列由 Zustand 保存本地文件、预览、进度、失败和媒体 asset ID。头像、封面和社群图片复用 `domains/media` 的单文件上传编排：

1. B05 创建上传会话，并校验返回项与 `clientUploadId / scene / assetKind` 精确对应。
2. 根据后端 ticket 直传对象存储；未知 Region 不作为原始字符串传给 SDK。
3. 用 `uploadSessionRevision` 确认上传，轮询 authoritative status；`FAILED` 时只自动调用一次正式 retry。
4. 断点同时绑定场景、文件名、`lastModified`、MIME、大小和 client upload ID，拒绝把旧文件的检查点复用到新文件。
5. 头像/封面和社群创建只提交达到 `READY` 的 storage key；B04 发布仍按帖子合同提交媒体 asset IDs。
6. 草稿自动保存携带版本号，409 时进入冲突处理 UI。

## 8. 实时通知

`RealtimeProvider` 在已登录后：

1. 调用 B11 bootstrap 获取 `summary / latestSeq`，不依赖不存在的短期 token。
2. 使用现有认证上下文建立 Socket.IO 连接。
3. 收到通知后更新 unread query 和列表缓存。
4. 断线重连后以最后确认的 stream sequence 补拉 delta；发现 gap 时重新 bootstrap，而不是猜测 cursor。

本工程提供连接边界和 Mock 事件，正式事件名应由后端契约生成或共享类型包定义。

## 9. 路由与代码拆分

路由页面使用 `lazy` 动态导入，主壳、公共认证壳和 onboarding 壳独立。生产环境可进一步用路由预取改善首次导航；不建议把所有页面打进首屏 bundle。

## 10. 复用与唯一职责

相同语义的合同和流程只允许有一个权威实现：

- 通用查询参数、cursor 页面、Infinite Query 缓存变换、列表键选择、乐观布尔写操作和基础纯函数归 `shared`。
- 服务端 DTO、领域枚举、Query Key 和 presentation 映射归对应 owner 领域；页面只消费公开出口，不重新声明平行类型。
- B05 单图上传状态机归 `domains/media`，资料头像/封面和社群图片共用该实现。
- 社群角色/加入策略、收藏与历史 PLACEHOLDER、草稿批处理等业务规则在对应领域保留唯一映射。
- 同值但不同 owner、权限或演进方向的概念不因结构相同而强行合并；需要兼容旧调用方时只保留类型别名，不复制字段。
- 各领域 Query Key 由 `model/queryKeys.ts` 统一生成，Provider、页面、Query 和 Mutation 不手写同领域根 key。

详细 owner 表、允许保留的语义别名及评审清单见 `docs/REUSE_GUIDELINES.md`。

## 11. 质量门禁

- TypeScript strict。
- ESLint/Stylelint/Prettier。
- Vitest + Testing Library + MSW。
- Playwright E2E。
- Storybook + a11y addon。
- `npm run reuse:check` 在其他门禁前扫描重复类型、枚举、常量、函数和公共能力绕过。
- GitHub Actions 在 PR 上执行复用、format、typecheck、lint、test、build。
