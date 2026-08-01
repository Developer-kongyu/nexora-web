# 已知问题与外部阻断

本文件只记录当前源码无法单方面消除的接口能力缺口或运行环境阻断。页面内部可修复的问题不得长期放在此处代替实现。

## 1. 楼中楼回复缺少公开读取入口

### 当前合同

- 顶层评论读取：`GET /api/posts/:postId/replies?cursor&limit`
- 根评论创建：`POST /api/posts/:postId/comments`
- 回复评论创建：`POST /api/comments/:commentId/replies`
- 评论删除：`DELETE /api/comments/:commentId`

B06 owner service 内部具备按 `rootPostId + parentCommentId` 读取 child page 的能力，但 B04 当前公开 controller 只接收 `postId / cursor / limit`，没有向客户端暴露 `parentCommentId`。

### 前端处理

- 展示正式顶层 relation page、删除/隐藏 tombstone 和评论卡片。
- 允许通过正式接口回复顶层评论。
- 显示服务端返回的回复计数，但不使用静态数组或错误的“评论派生帖 ID”请求伪造楼中楼列表。

### 后端建议

在保持 root view gate 和 cursor owner 规则不变的前提下，公开一条明确的 child-page controller，例如：

```text
GET /api/posts/:rootPostId/comments/:parentCommentId/replies?cursor&limit
```

返回结构继续复用 `ReplyListPageView`。前端接入后应使用独立 query key：

```text
['posts', 'replies', rootPostId, 'parent', parentCommentId]
```

## 2. 社群举报队列和自由文本公告没有公开接口

B08 当前提供社群成员、申请、规则、设置、置顶和审计日志，但没有公开社群举报列表/审批 controller，也没有独立自由文本公告资源。

前端处理：

- 内容管理区显示明确的不可用状态，不展示静态举报。
- 公告通过正式 `POST /api/communities/:communityId/manage/pinned-posts`，并使用 `pinType=ANNOUNCEMENT` 关联一条已发布社群帖子。
- 不再调用不存在的 `reviewJoinRequest`、`/manage/settings` 或自由文本公告接口。

后端后续如新增举报能力，应提供稳定分页 DTO、状态机、审批幂等结果和审计字段后再接入。

## 3. 已删除内容恢复/永久清理与历史批量删除没有公开接口

B07 当前公开了：

- `GET /api/me/content-center/deleted`：读取自己的已删除内容。
- `DELETE /api/me/history/posts/:postId`：删除单条浏览历史。
- `DELETE /api/me/history/posts`：清空浏览历史。

当前没有公开已删除内容恢复、永久清理或浏览历史批量删除 controller。

前端处理：

- 内容中心把已删除内容作为只读记录展示，不提供伪造的“恢复成功”或“永久删除成功”。
- 浏览历史的“删除所选”只组合正式单项删除接口，以有界并发逐条执行，并保留失败项的选中状态。
- 清空历史只调用正式清空接口；不会把多个单项删除误报为服务端原子批处理。

后端如后续开放恢复或永久清理能力，应同时明确恢复窗口、媒体引用处理、幂等语义、逐项结果和审计要求后再接入。

## 4. 当前执行环境无法完整安装 npm 依赖

阶段 006 执行 `npm ci --ignore-scripts --no-audit --no-fund --prefer-offline` 时，内部 npm registry 对多个依赖持续返回 HTTP 503，最终在 `zustand@5.0.14` 返回 E503。阶段 007 的一次安装在代理无有效输出时超时；残留进程与不完整 `node_modules` 已删除。阶段 008 使用 `--fetch-retries=0 --fetch-timeout=5000` 快速失败复验，内部 registry 仍在 `zustand` 请求上立即返回 E503。阶段 009 在复用治理完成后再次使用快速失败参数复验，仍在相同依赖请求上返回 HTTP 503；本阶段同样未保留 `node_modules`。这些环境日志和不完整依赖均不会进入源码或阶段备份。 阶段 010～011 进一步确认这不是单个包或单个版本问题：registry 根路径、`/-/ping`、元数据和直接 tarball 请求均统一返回 nginx HTTP 503；公共 npm、jsDelivr 与 Debian 源在当前容器中也无法解析域名。阶段 011 最后一次根路径复验时间为 2026-07-28 09:00 UTC。因此当前环境尚未执行完整的：

```bash
npm run typecheck
npm run lint
npm run lint:css
npm run test
npm run build
npm run storybook:build
npm run test:e2e
```

这是一项验证阻断，不代表这些命令已通过。正式交付前仍需在 registry 正常的开发机或 CI 中执行。
