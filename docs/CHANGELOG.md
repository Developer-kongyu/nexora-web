# 修改记录

## 2026-08-03 · 当前用户导航卡与冷启动会话水合

- B02 users owner 新增 `CurrentUserCardView` 与 `usersApi.getCurrentUserCard()`，对接后端 `GET /api/users/me`。
- `AuthBootstrap` 在 Refresh 成功并提交新 Token 后读取当前用户卡，更新 `id/handle/displayName/avatarUrl`，同时保留既有 onboarding 状态。
- 用户卡请求关闭 401 自动刷新，避免 refresh handler 递归等待；401 清空会话，404/503/网络错误保留已认证占位会话。
- Refresh generation/stale guard 同时保护 Token 和用户卡写回，退出或新一轮刷新后旧响应不能污染 Auth Store。
- MSW 增加精确静态 `/api/users/me` handler，并置于动态用户路由之前。
- 增加 users API 与 AuthBootstrap 覆盖：成功水合、503 降级、401 失效且不递归、Refresh 401 不读取用户卡。
- 资料编辑成功继续复用 `updateAuthUser`，使导航摘要与刚保存的昵称/头像即时收敛。

### 全仓复用门禁残留收口

- B05 media owner 新增 canonical `MediaAssetKind`，上传语义 `UploadableMediaKind` 改为兼容别名，B09 Feed 媒体槽位复用 owner 类型。
- B03 permissions owner 新增 canonical `AccountVisibility`，权限策略与 B12 Settings Overview 共同复用，不把后端大写枚举混入前端小写展示类型。
- B04 posts owner 新增 `PostReadStatus`，卡片与详情 DTO 共同复用；`PostDetailDto` 从 adapter 迁回 owner model。
- Auth onboarding 与 Permissions 分别新增 `model/queryKeys.ts`，推荐用户、推荐社区和当前隐私策略页面不再手写 Query Key。
- 隐私策略保存成功后使用 `permissionKeys.currentPolicy` 同步 Query Cache，读取与写回保持同一缓存身份。
- `npm run reuse:check` 实际扫描 212 个生产文件并通过，重复联合、重复声明和公共能力绕过均为 0。

## 2026-07-28 · 阶段 002：通知与用户关系闭环

### 备份与可恢复性

- 修改前完整基线保存在外部工作目录 `backups/20260728-001-baseline/`。
- Git 基线提交为 `3b5f3a5`，标签为 `baseline-20260728-001`。
- 本阶段完成后另建完整源码快照、文档快照、ZIP 和 SHA-256，不覆盖基线。

### 通知中心

- 通知 DTO 改为后端正式的 `notificationId / streamSeq / category / readAt / actor / entity / masked` 结构。
- 列表查询支持 `tab / unreadOnly / cursor / pageSize`。
- 未读汇总改为 `totalUnreadCount / mentionUnreadCount / interactionUnreadCount / communityUnreadCount / systemUnreadCount`。
- “全部已读”改用 `POST /api/notifications/read-all`，不再批量拼接当前页 ID 冒充全量处理。
- 关注申请改为读取 `GET /api/users/me/follow-requests/incoming`，通过与拒绝分别调用正式审批接口。
- 移除静态“独立开发者小周”卡片和仅弹 Toast 的伪成功行为。
- 通知目标优先使用服务端 `actionUrl`；缺失时调用目标解析接口，失效目标不再错误跳转。
- 实时初始化合同由错误的 `token/cursor` 修正为 `summary/latestSeq`；Socket 握手不再使用不存在的 bootstrap token。
- Mock 改为可变已读状态、分类筛选、全部已读、delta、目标解析和关注请求审批。

### 用户主页与关系

- “是否本人”由固定 Handle 比较改为 `authStore.user.id === profile.userId`。
- 公开资料页使用正式 `UserProfileHeaderView`，不再展示合同中不存在的加入时间、Pro/认证标识和推测所在地。
- 关注、取关、取消待审批关注请求均根据服务端关系快照执行。
- 静音、取消静音、屏蔽、解除屏蔽接入正式关系接口，并将返回的 authoritative relationship 写回 Query Cache。
- 移除静态共同关注头像与人数。
- 移除用作者帖子倒序/截取伪造的“喜欢”和“回复”列表，仅保留已有正式数据源支持的帖子与媒体。
- 置顶状态改为读取 `pinnedPostIds`，不再默认把第一条帖子标为置顶。
- 资料更新路径由 `/api/me/profile` 修正为 `/api/users/me/profile`；保存成功改为失效用户查询，避免把可编辑 DTO 写进公开资料页缓存。
- Mock 增加关系状态机，关注、静音和屏蔽操作会真实改变后续读取结果。

### 验证

- TypeScript/TSX 独立语法解析：134 个文件，0 个错误。
- npm 依赖安装：未完成；内部 npm 仓库持续返回 HTTP 503，部分下载目录已删除且未进入提交或备份。
- 完整 `typecheck / lint / test / build`：待依赖可正常安装后执行，本阶段不虚构通过结果。

## 2026-07-28 · 阶段 003：帖子评论与回复合同整改

### 备份与可恢复性

- 本阶段基于标签 `stage-20260728-002-notifications-profile` 继续修改，不覆盖阶段 001/002 快照。
- 完成后将独立保存源码快照、文档快照、Git bundle、ZIP 与 SHA-256。

### 评论读取与占位

- 评论列表改为正式的 `GET /api/posts/:postId/replies?cursor&limit` cursor 合同，不再使用静态评论数组。
- 列表项改为 `relation + postCard + tombstone` 结构；`DELETED/HIDDEN` 评论保留时间线占位。
- 显式处理 `degraded / degradedReasons / pageMayBeShort / filteredCountHint`，补卡缺失时不伪造评论正文。
- 评论分页使用 TanStack Query `useInfiniteQuery`，支持继续加载和请求失败重试。

### 评论写入与互动

- 根评论接入 `POST /api/posts/:postId/comments`。
- 回复评论接入 `POST /api/comments/:commentId/replies`，不再把 `parentCommentId` 错塞给根评论接口。
- 删除评论接入 `DELETE /api/comments/:commentId`，成功后重新读取 relation page，避免前端直接过滤导致时间线重排。
- 评论点赞改为对评论派生帖调用 B06 帖子点赞/取消点赞接口，并保留乐观更新、失败回滚与查询失效。
- 写入 body 固定使用正文、空媒体、空实体范围、链接关闭状态与 `POST_TEXT_NORMALIZATION_V1` composer 元信息。
- Mutation 改为显式变量快照，避免请求期间切换回复目标导致成功提示和缓存失效对象错位。

### 后端能力边界

- 复核 B04/B06 后确认：当前公开 `listPostRepliesController` 只公开根帖顶层评论读取，未公开 `parentCommentId` 楼中楼分页参数。
- 已删除此前通过评论派生帖 ID 递归请求子回复的错误实现；该请求与 owner relation 合同不一致。
- 回复创建仍使用正式接口；页面只展示服务端可公开读取的顶层评论和回复计数，不伪造历史楼中楼内容。
- 该能力缺口已记录于 `docs/KNOWN_ISSUES.md`，待后端公开 child-page controller 后再接入展开列表。

### Mock 与测试

- MSW 评论状态改为正式 DTO，支持顶层列表 cursor、删除占位、根评论创建、楼中楼写入、评论计数更新与幂等删除结果。
- 修正 Mock 中顶层评论 `topLevelCommentId` 应为 `null`、评论派生帖 `postKind` 应为 `REPLY`、删除结果应为 `DELETED_NOW | ALREADY_DELETED`。
- 新增 `postsApi.test.ts`，覆盖 canonical compose body、tombstone 读取、创建、回复与删除合同。
- `EmptyPanel` 图标改为可选，修复无图标错误态的组件类型约束。

### 验证

- TypeScript/TSX 独立语法解析：135 个非声明文件，0 个错误。
- 本地模块解析：136 个 TS/TSX 文件，0 个无法解析的相对路径或 `@/` 别名。
- CSS 语法解析：53 个文件，0 个解析错误。
- `git diff --check`：通过。
- 完整 `typecheck / lint / test / build`：依赖仍受内部 npm registry HTTP 503 阻断，未虚构通过结果。

## 2026-07-28 · 阶段 004：社群管理后台合同整改

### 备份与可恢复性

- 本阶段从只读标签 `stage-20260728-003-comments` 开始修改；阶段 001～003 的源码快照、文档快照与 Git bundle 均保持不变。
- 本阶段完成后单独生成 `20260728-004-community-management` 源码快照、文档快照、Git bundle、ZIP 与 SHA-256；不会覆盖既有阶段。

### 社群管理领域合同

- 新增 B08 正式的社群详情、权限上下文、管理概览、加入申请、成员、置顶、规则、设置和审计日志 DTO。
- 管理动作改为后端正式路由：加入申请批准/拒绝分离，成员角色调整与移除分离，置顶新增/排序/取消分离。
- 修正退出社群路径为 `DELETE /api/communities/:communityId/members/me`。
- 修正设置路径为 `PATCH /api/communities/:communityId/settings`，只允许提交 `visibility / joinPolicy / postRoleMin / commentRoleMin / quoteEnabled / repostEnabled / requireRuleAcceptanceBeforePost` 七个字段。
- 审计动作使用唯一 runtime tuple 推导类型；管理日志 `metadata` 从宽泛对象收紧为 B08 判别联合，Mock 日志同步补齐 before/after、版本、目标、原因和发生时间。

### 管理台页面模块化

- 将单文件管理台拆分为导航、模型和八个独立区块：概览、加入申请、成员、内容能力边界、置顶、规则、日志和设置。
- 概览只展示正式快照、每日增量和审计日志，不再用 `12,800`、`286` 等前端兜底数字。
- 加入申请支持状态筛选、分页、独立批准/拒绝动作和幂等结果提示；`REJECTED_AS_INELIGIBLE` 不再误报为批准成功。
- 成员列表支持后端角色筛选、分页、当前页关键词筛选、角色调整、移出确认和审计原因；本人保护改为登录用户 ID 判断。
- 置顶内容按三个正式槽位管理；公告改为“已发布帖子 + `ANNOUNCEMENT`”，不再保存自由文本公告。
- 规则按完整数组与版本保存，最多 10 条、每条最多 500 字；编辑器按规则版本重挂载，避免其它管理查询刷新时清空未保存内容。
- 权限设置同样按设置版本重挂载，避免无关详情刷新覆盖未保存表单。
- 内容管理区明确显示当前后端没有举报队列，不再展示静态举报或伪成功审批。

### 状态化 Mock 与测试

- 社群 Mock 会随加入申请审批、成员角色、成员移除、置顶、排序、取消置顶、规则和设置操作真实变化。
- 概览计数、详情版本、成员列表、待审批数、置顶列表和审计日志会联动更新。
- 新增 `communitiesApi.test.ts`，覆盖成员查询参数、申请批准路由、退出路径、七字段设置 patch，以及置顶/排序/取消置顶三条独立合同。
- 将 `BookmarkCollection / DeletedContentItem` 从 API 文件抽到 `domains/library/model`，避免 Mock fixture 为读取纯类型反向加载 API/client 层。

### 验证

- TypeScript/TSX 独立语法解析：147 个非声明文件，0 个错误。
- 本地模块与未使用导入检查：149 个 TS/TSX 文件，0 个无法解析导入，0 个未使用导入。
- 社群 DTO + 状态化 Mock 严格类型子图检查：通过；启用 `strictNullChecks` 与 `noUncheckedIndexedAccess`，外部 MSW 回调以临时声明隔离，临时文件未写入源码。
- CSS 语法解析：53 个文件，0 个错误；CSS Modules 类名引用检查：0 个缺失类名。
- `git diff --check`、冲突标记与空文件检查：通过。
- 完整 `npm run typecheck/lint/test/build` 仍受 npm registry HTTP 503 阻断；新增测试已写入但未虚构执行通过。

## 2026-07-28 · 阶段 005：社群创建与媒体上传合同整改

### 可恢复检查点

- 本阶段基于 `stage-20260728-004-community-management` 继续修改；阶段 001～004 的源码、文档和 Git bundle 均未覆盖。
- 第一份只读中间检查点为 `checkpoint-20260728-005a-community-create-media`，用于恢复社群创建和媒体上传初版。

### 社群创建

- 删除演示型预填内容、Base64 图片提交和后端不存在的 `membersCanPost / reviewPosts / membersCanInvite` 等字段。
- 创建请求只提交 B08 正式字段：Slug、名称、说明、媒体 key、分类、标签、locale/region、加入策略、发帖/评论最低角色、引用/转发开关、规则确认和规则数组。
- 创建响应按 `communityId / slug / ownerUserId / rulesVersion / settingsVersion` 读取，不再把返回值误当完整详情 DTO。
- 请求保留幂等键；Slug 冲突、保留字和格式错误会落到对应字段错误，而不是只显示通用 Toast。

### 可恢复媒体上传

- 社群头像与封面改为 B05 上传会话、七牛对象直传、上传确认、READY 轮询后再向 B08 提交 `avatarKey / coverKey`。
- 单文件上传会话必须精确返回一个同 `clientUploadId / scene / assetKind` 的结果；确认和重试响应同样校验资产身份。
- 上传检查点绑定场景、文件名、`lastModified`、MIME、大小和 client upload ID，拒绝旧图片检查点被另一张图片复用。
- 图片处理返回 `FAILED` 时只调用一次正式 retry；重试后继续确认，第二次失败明确终止，避免无限循环。
- 七牛 SDK 动态加载支持 AbortSignal 清理；未知 Region 不再作为原始字符串传给 SDK。

### Mock 与测试

- MSW 媒体状态会从 `UPLOADING -> UPLOADED -> READY` 演进，并提供正式 retry DTO。
- 社群创建 Mock 验证媒体场景和 READY 状态，不允许未处理图片直接写入社群。
- 新增上传会话、确认、retry、断点恢复、文件错配和社群创建字段/幂等合同用例；依赖未安装，因此未虚构 Vitest 已执行通过。

## 2026-07-28 · 阶段 006：资料编辑与媒体上传复用

### 备份与恢复

- 修改开始前创建只读 WIP 源码 ZIP、补丁和 SHA-256；本阶段完成后另建源码快照、文档快照和 Git bundle。
- 所有修改均在 `stage-006-hardening` 分支增量进行，不覆盖阶段 005a 或更早标签。

### B02 可编辑资料合同

- 编辑页先读取 `GET /api/users/me/profile`，不再使用固定昵称、所在地、网站和生日。
- PATCH 只允许 `displayName / bio / location / websiteUrl / birthday / avatarStorageKey / coverStorageKey`；移除旧 `occupation / website / avatarAssetId / coverAssetId`。
- 网站输入支持无 scheme 主机名并交给 owner service canonicalize；显式 `ftp:` 等非 HTTP(S) scheme 在前端和 Mock 都会拒绝。
- 生日执行严格 date-only 校验；非法月份、日期和时间字符串不提交。
- 保存成功后更新 owner profile cache、公开资料查询和认证壳用户摘要，并重新 hydrate 表单以清理 dirty 状态和对象 URL。

### 头像与封面

- 抽出通用 `useMediaImageSelection` 和 `ProfileImageField`，头像、封面与社群图片复用同一 B05 上传编排。
- 支持选择、取消替换、移除现有图片、撤销移除、上传进度、处理状态、失败原因与断点续传。
- 上传达到 READY 后才提交 storage key；纯文本资料修改不会误清空现有头像或封面。
- 请求被新提交替代或页面卸载时会 abort；控制器只由创建它的 mutation 清理，避免旧请求完成后覆盖新请求引用。

### 高保真与可访问性

- 页面恢复设计图中的单列表单、头像/封面面板和“保存结果”侧栏；保存结果区分未保存、保存中、校验失败、媒体失败、网络失败和成功。
- 修复两处 Link 包裹 Button 的嵌套交互节点，并为新窗口链接补齐 `noopener noreferrer`。
- 文件输入具备可访问名称；状态提示使用 `aria-live`；上传进度和减少动画偏好均有明确处理。

### 验证

- TypeScript/TSX 独立语法与本地导入扫描：162 个非声明文件，0 个语法错误、0 个无法解析导入、0 个未使用导入。
- B02 users DTO/API 与 B05 media DTO/API/上传编排严格类型子图：通过 `strict + noUncheckedIndexedAccess`；临时声明未进入源码。
- CSS：53 个文件，0 个解析错误、0 个缺失 CSS Module 类名。
- 分层依赖、循环依赖、裸 `fetch`、冲突标记、空源码/文档、残留标记、无行为按钮、基础可访问性和未声明 CSS 变量：0 个问题。
- `git diff --check`：通过。
- `npm ci` 仍因内部 registry 对 `zustand@5.0.14` 返回 HTTP 503/E503 失败；完整 typecheck/lint/test/build 未执行，也未标记为通过。

## 2026-07-28 · 阶段 007：用户关系列表与安全管理合同整改

### 隔离修改与备份

- 阶段从 `stage-20260728-006-profile-media` 的 Git bundle 创建独立工作区，避免与另一组未确认的收藏模块增量相互覆盖。
- 修改前保存阶段起点、发现并隔离的混合工作区快照，以及本阶段第一轮 B02 合同快照；所有中间 ZIP、补丁和 SHA-256 均保留，不覆盖阶段 001～006。

### B02 DTO 与 API

- followers/following 从旧 `UserSummary + hasMore` 展示模型迁移到正式 `UserListItemView + { list, nextCursor }`。
- 新增 owner-only `GET /api/users/me/mutes` 与 `GET /api/users/me/blocks`，管理列表保留 `FULL / PLACEHOLDER`、`placeholderReason` 和 blocked item 的 `canUnblock`。
- 关注、取关、取消请求、静音、取消静音、屏蔽和解除屏蔽均使用各自精确 `actionResult` 联合，并保留 `FOUND / TARGET_NOT_FOUND` 权威回读结果。
- route-facing Handle 解析失败在 Mock 中改为 `USER_RELATION_TARGET_NOT_FOUND`，不再错误伪装为写事务提交后的 degraded success。

### 粉丝与关注页面

- 使用 `useInfiniteQuery` 请求正式 opaque cursor，支持 loading、error、retry、empty 和加载更多。
- 搜索只基于已经加载的昵称、Handle 与简介；关系筛选只读取 canonical relationship snapshot，不再依赖旧 `isFollowing`。
- 排序只使用服务端 `followedAt` 的最近/最早顺序，删除没有后端事实支撑的粉丝数或活跃度排序。
- 新增复用的 `RelationUserCard`；关注、取关和取消待审批请求根据服务端返回的权威 relationship 更新卡片并失效 users 查询。
- 幂等 no-op 与正常写入使用不同成功文案，避免把 `NOOP_NOT_FOLLOWING / NOOP_NOT_PENDING` 误报为本次发生了实际变更；blocked 字段会阻止错误展示关注按钮。

### 屏蔽与静音设置

- 删除硬编码静音/屏蔽数组和后端未提供的假开关，改为两条 self-only 管理列表查询。
- 列表支持已加载数据搜索、加载/失败/空状态、分页和正式取消静音/解除屏蔽 Mutation。
- `PLACEHOLDER` 条目不会猜测昵称、头像或 Handle；无法路由的屏蔽项遵守 `canUnblock=false`，按钮明确禁用。
- 操作完成后按 `actionResult` 区分真实删除与幂等 no-op；权威回读降级时显示警告而非伪造完整资料。

### Mock、模型与测试

- MSW 新增 follow edge、pending request、静音记录和屏蔽记录的可变状态，列表与写操作会相互联动。
- 新增关系动作解析、列表筛选/排序和安全管理展示模型，纯函数与页面编排分离。
- 新增 users API 合同测试及两个模型测试文件，覆盖 cursor 路径、owner route、精确 actionResult、占位语义和 route not-found。
- 纯模型编译后执行 13 项 Node 断言通过；本阶段子图在临时外部依赖声明下通过 `strict + noUncheckedIndexedAccess`，临时文件未进入源码。

### 验证限制

- 静态语法/导入扫描覆盖 170 个 TS/TSX 文件，0 个语法错误、0 个无法解析本地导入。
- 生产源码质量扫描覆盖 169 个 TS/TSX 文件，0 个未使用 import、0 个本地循环依赖、0 个缺失 CSS Module 类名。
- 本阶段再次尝试 `npm ci`，进程在当前代理环境中 180 秒无有效输出并超时；残留进程与部分 `node_modules` 已删除。完整 typecheck、Lint、Vitest 和构建仍未虚构为通过。

## 2026-07-28 · 阶段 008：收藏、内容中心、草稿、浏览历史与双分支集成

### 隔离工作区与备份

- 收藏/草稿/历史改动先在阶段 006 基线上完成并提交为独立检查点；发现正式阶段 007 用户关系分支后，从其 Git bundle 新建阶段 008 集成工作区，再以 cherry-pick 合并，不覆盖任一来源分支。
- 修改前、合同层完成后、页面迁移后、草稿整改前和集成前均保留只读 ZIP/补丁/状态记录；阶段 001～007 的源码、文档、Git bundle 与所有中间检查点均未覆盖。
- 新增通用 `CursorPageView<T>` 和按业务稳定键合并 cursor 页的 `mergeCursorItemsBy`，保留旧 feed/search `hasMore` 合同兼容类型。

### B07 收藏夹与帖子收藏

- 收藏夹目录、默认/自定义类型、可见范围、删除回迁、item count 与更新时间改为正式 DTO，不再把旧展示模型当服务端合同。
- 收藏项按 `bookmarkItemId` 选择和操作；支持 ACTIVE 卡片与权限/资料补卡失败 PLACEHOLDER，失效内容不会被静默丢弃。
- 创建、重命名、可见范围、删除、移动和移除使用正式路由和 body；删除自定义收藏夹增加二次确认，并按服务端 `fallbackCollectionId / movedItemCount` 同步缓存。
- 名称和可见范围连续保存发生部分写入时，主动重新拉取服务端事实，避免前端继续展示旧状态。
- 帖子卡片的点赞、转发、收藏和取消操作接入正式 API、乐观更新与失败回滚；移除不存在的举报/不感兴趣伪成功。

### 内容中心与草稿箱

- 内容中心三类列表改为正式 cursor DTO：已发布内容支持 `degraded / degradedReasons / pageMayBeShort / filteredCountHint`，草稿与已删除内容按 owner view 展示。
- 当前 B07 没有已删除内容恢复或永久清理 controller，页面改为只读记录和明确能力边界，不再伪造写操作。
- 独立草稿箱改为 B04 正式列表、单条删除和发布合同；发布携带 `Idempotency-Key` 与 `allowWaitingMediaPublish`，正确区分 `PUBLISHED` 和 `PUBLISHING / WAIT_MEDIA_READY`。
- 批量删除使用 B07 正式 `/api/me/content-center/drafts/batch-delete`，按逐项结果保留失败草稿；移除不存在的 `/api/posts/drafts/batch-delete`。
- 多草稿发布通过 `settleBatch` 有界并发执行，部分成功不会被误报为整体失败，失败项继续保留并保持选中。

### 浏览历史

- 列表改为 B07 正式 cursor、来源场景/模块、查看次数和权限占位 DTO；筛选不会丢失已选择记录。
- 增加“全选当前筛选”，批量删除只组合正式单条删除接口并限制并发；成功项立即从缓存移除，失败项继续选中。
- 单条删除、删除所选和清空历史均增加确认与失败反馈；Mutation 后重新校准 cursor 缓存，避免沿用服务端已失效游标。

### Mock、适配器与测试

- MSW 收藏夹、收藏项、内容中心、草稿发布/删除和浏览历史均改为状态化正式 DTO；同一用户同一帖子只保留唯一有效收藏关系。
- 新增 `postCardAdapter`，集中把 B04/B07 卡片 DTO 映射到共享帖子卡片展示模型，并在作者资料补卡不可用时使用不可跳转降级展示。
- 新增 `settleBatch` 稳定顺序、有界并发和逐项 fulfilled/rejected 结果工具。
- 新增收藏 API、草稿 API、转发 API、帖子卡适配和批处理工具合同测试；更新帖子卡组件测试的 QueryClient 上下文与作者资料不可用场景。

### 验证

- TypeScript/TSX 独立语法解析：177 个文件，0 个错误；生产源码质量扫描覆盖 176 个文件。
- 本地导入、未使用导入、循环依赖、CSS Modules、分层、裸请求、冲突标记、空文件、残留标记、CSS 变量和基础 JSX 可访问性：0 个问题。
- CSS 文件：54 个，独立解析 0 error。
- B02 与 B04/B07 两组目标类型子图在临时外部依赖隔离下通过 `strict + noUncheckedIndexedAccess`；实际编译执行 23 项纯模型断言通过。
- 集成类型检查额外发现并修复收藏 Mock 判别联合非空收窄和社群创建 `Promise.allSettled` 成功结果收窄。
- `git diff --check`：通过。
- 阶段 008 快速失败复验仍在内部 registry 的 `zustand@5.0.14` 请求上返回 HTTP 503；自动化用例已编写，但未虚构完整 typecheck/lint/test/build 已执行通过。

## 2026-07-28 · 阶段 009：复用治理与唯一职责加固

### 隔离修改与中间备份

- 以 `stage-20260728-008-library-integration` 为最新完整基线创建 `stage-009-reuse-hardening` 分支，未覆盖阶段 001～008 的提交、标签、源码包或文档包。
- 修改前冻结阶段 009 起点；类型/分页基础层完成后、Query Key 与流程收敛后分别保存 009a、009b、009c 检查点，提交前先后保存 009d 完整快照与 009e 晚到增量快照；最终复核后另建 009f 完整源码、文档、补丁、状态和 SHA-256；发布后对审计计数做一致性复核时再建立 009g 文档修正快照。可从任一检查点恢复。
- 重复治理使用 TypeScript AST、结构克隆扫描和人工语义复核结合；没有把仅因字段或字符串暂时相同、但 owner 与演进方向不同的领域概念强行合并。

### 共享基础能力

- 新增统一查询串工具 `shared/api/query.ts`；领域 API 不再分别创建 `URLSearchParams`。
- 扩展 cursor 基础合同，统一 `CursorRequest`、`CursorPageView<T>`、next-page 解析、按稳定键合并和查询串附加。
- 新增 Infinite Query 缓存过滤/删除工具，页面不再复制 page 遍历与空页处理。
- 新增 `useKeySelection`，收藏、内容中心、草稿和历史列表统一选择、全选、反选与失效键清理。
- 新增 `useOptimisticBooleanMutation`，点赞、社群关系等同构乐观布尔写入共用快照、回滚和 pending 状态机。
- 剪贴板、date-only、Set、稳定键去重、文本规范化和 HTTP(S) URL 处理收敛到 `shared/lib`，删除页面/领域中的平行实现。
- 新增共享用户摘要、媒体解析状态、Select 选项类型与通用标签选项构造；旧调用方只保留引用权威类型的兼容别名。
- 注册与重置密码共用验证码、强密码和确认密码匹配规则，认证页面不再各自维护同一套 Zod 校验。

### 领域合同与流程复用

- B05 图片 MIME、大小上限、校验结果、状态文案和单图上传编排集中到 `domains/media`；资料编辑与社群创建共享文件输入、选择 Hook、双图组合 Hook、确认/重试/READY 状态机。
- 社群可见范围、加入策略、角色、概览窗口的取值、标签和 Select 选项集中到 `domains/communities` presentation 层，创建和管理页面不再维护两套数组与中文文案。
- 草稿箱与内容中心共享 draft ID 选择 Hook；批量删除逐项成功/失败汇总只保留 `domains/library/model/draftBatch.ts` 一份实现。
- 收藏和浏览历史的权限/资料补卡 PLACEHOLDER 文案集中到 library presentation，不再在两个页面分别维护同一 reason 映射。
- 帖子发布/删除/类型/状态、用户关系写结果、权限类型和安全管理 `mute/block` 条目类型分别回收到对应 owner 领域。
- followers/following Mock 使用同一连接列表处理器；页面标题统一使用 `PageHeader`，旧 `PageTitle` 仅作兼容别名，不再维护第二套 JSX/CSS。

### Query Key 与缓存边界

- feed、posts、users、library、communities、notifications、search、settings 分别新增或完善 `model/queryKeys.ts`；社群管理子查询也迁回 communities owner。
- Query、Mutation、Realtime Provider 和跨页面缓存失效改为使用领域 key factory，移除手写 `['feed']`、`['notifications']` 等根 key。
- key factory 保持纯模型层实现，不依赖 React Query，避免循环依赖和运行时耦合。

### 自动化复用门禁

- 新增 `scripts/check-reuse.mjs` 和 `npm run reuse:check`，并把该步骤放到 `npm run check` 最前面。
- 门禁扫描生产 TS/TSX，阻止重复导出类型/枚举名称、同构声明、重复字面量联合、重复静态常量、完全或结构高度相同的函数以及公共能力绕过。
- 额外策略检查阻止领域 API 自行拼查询参数、直接写剪贴板、恢复已删除的页面级图片上传实现等已知分叉入口。
- 新增 `docs/REUSE_GUIDELINES.md`，记录权威 owner、允许保留的语义别名、Query Key 规则和代码评审清单。

### 测试与验证

- 新增或扩充 cursor、Infinite Query 缓存、日期/URL/Set/文本、图片校验、草稿批量汇总和 library presentation 纯函数测试。
- `npm run reuse:check` 实际通过：扫描 188 个生产文件，0 个重复类型/枚举、常量、函数或公共能力绕过；生产审计覆盖 328 个声明、93 个字面量联合、64 个静态常量和 205 个函数，全源码审计覆盖 342 个声明、95 个字面量联合、117 个静态常量和 248 个函数，均为 0 个高置信重复组。
- 最终独立语法与本地导入扫描覆盖 `src + tests` 共 221 个非声明 TS/TSX 文件，0 个语法错误、0 个无法解析本地导入；生产依赖图覆盖 187 个非声明文件，0 个未使用导入、0 个本地循环依赖或分层逆向依赖。
- 54 个 CSS 文件 0 个解析错误、0 个缺失 CSS Module 类名、0 个未声明变量；裸请求、冲突标记、空文件和残留标记均为 0 个问题。
- 共享纯函数/合同与 Hook/Query 集成两个目标类型子图在临时外部依赖声明下通过 `strict + noUncheckedIndexedAccess`；另外实际转译并执行 41 项公共纯函数断言，全部通过。临时声明和运行目录均位于工作目录外，不进入源码。
- 完整依赖安装仍受当前内部 registry 环境阻断；离线复验在 `zustand@5.0.14` 返回 `ENOTCACHED`，此前在线尝试无可用响应。未虚构 format、全项目 typecheck、Lint、Vitest、构建、Storybook 或 Playwright 已通过。

## 2026-07-28 · 阶段 011：发帖编辑器、草稿状态机与媒体合同加固

### 发帖输入与草稿一致性

- 将发帖正文、媒体、实体范围、链接、可见范围、互动权限、社群、地点、回复/引用/转发来源和编辑器元数据统一为 `PostComposeInput`，直接发布、草稿创建、手动保存、自动保存和草稿发布不再维护平行请求结构。
- 新增 `toPostComposeInput` 作为提交合同的唯一字段选择函数；服务端草稿快照中的 `bodyTextNormalized` 等只读投影字段不会再进入保存指纹、Mock 对比或发布请求。
- 修复打开已有草稿后即被误判为“未保存”的问题；指纹只比较可提交字段，并对媒体、实体范围和编辑器元数据做防引用复制。
- 链接抽取会去除中文/英文句末标点，提及和 Hashtag 支持中文标点边界，实体位置继续使用 UTF-16 code unit。

### 编辑器保存与发布

- 编辑器改为异步草稿详情加载后的 keyed form，不在 effect 中复制服务端表单状态。
- 手动保存使用有界并发上传：成功媒体会进入草稿，失败媒体保留在队列中供重试；不会因单个媒体失败而丢失已经编辑的正文。
- 自动保存不再被待上传/失败媒体永久阻断；先保存正文和已 READY 的媒体，媒体处理完成后再触发下一次自动保存。
- 发布仍保持严格边界：任一已选择媒体失败时不提交；草稿版本冲突继续显示服务端版本并允许重载。
- 媒体数量上限同时计算服务端已保存媒体和本地队列，避免恢复草稿后突破单帖 10 个媒体限制。

### 媒体约束复用

- 新增纯合同模块 `domains/media/model/constraints.ts`，统一拥有图片/视频 MIME、accept 字符串、头像/封面与帖子媒体大小上限及单帖媒体数量。
- 文件选择、上传队列、编辑器、Mock 和测试全部引用该模块；删除散落在上传器和 Mock 中的同值数组与数字。
- Mock 的 `POST_COMPOSE` 上传会话正式支持 MP4、WebM 和 MOV，同时校验媒体类型和大小；头像与封面仍只接受受支持图片。

### 状态化 Mock 与测试

- 补齐草稿详情、创建、手动保存、自动保存、版本冲突、列表投影同步、删除和发布后的状态闭环。
- 直接发布与草稿发布返回正式发布状态；待处理媒体按 `allowWaitingMediaPublish` 区分立即拒绝或 `PUBLISHING / WAIT_MEDIA_READY`。
- 新增草稿状态机、视频上传确认、超限文件拒绝、直接发布详情、提交字段指纹和媒体约束测试。
- 修复社群管理页在回调中丢失 Query 数据非空收窄的问题。

### 当前验证

- `npm run reuse:check` 实际通过，扫描 196 个生产文件，未发现高置信重复类型、枚举、常量、函数或公共能力绕过。
- TS/TSX AST 与本地导入预检覆盖 240 个文件，0 个语法、导入、未使用 import 或 React Refresh 混合导出问题；Hooks 预检覆盖 234 个文件，0 条违规。
- 54 个 CSS 文件通过独立解析、CSS Modules 类名和 CSS 变量预检。
- 源码、测试、配置和 E2E 在临时外部依赖声明下分别通过 `strict + noUncheckedIndexedAccess` 预检；Mock 与新增集成测试另有目标严格类型检查通过。
- 实际转译执行发帖合同 7 项、媒体合同 12 项，共 19 项 Node 断言通过。
- 内部 npm registry 根路径与 `/-/ping` 仍返回 HTTP 503；正式 Prettier、全项目 TypeScript、ESLint、Stylelint、Vitest、Vite Build、Storybook Build 和 Playwright 尚未执行，不作通过声明。
