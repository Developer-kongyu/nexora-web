# 前端领域与后端模块对接表

本文件用于联调时定位接口 owner。当前源码已经按领域建立 API 契约、Query/Mutation 和 MSW 同路径实现；真实部署时仍应以正式 OpenAPI、错误码和权限规则为最终依据。

| 后端 | 前端目录 | 当前实现能力 | 联调重点 |
| --- | --- | --- | --- |
| B01 账号与认证 | `src/domains/auth` | 刷新、密码/验证码登录、注册、找回、重置、Google 补全、登出 | HttpOnly refresh cookie、CSRF、错误码、onboarding 状态 |
| B02 用户资料与关系 | `src/domains/users` | 正式公开资料头、owner-only 可编辑资料、七字段资料 PATCH、关注/取关/取消请求、入站请求审批、followers/following cursor 列表、owner-only 静音/屏蔽管理列表与解除操作 | 关系列表严格使用 canonical relationship snapshot；管理列表保留 FULL/PLACEHOLDER 和 canUnblock 语义；资料媒体只提交 B05 READY 后的 storage key |
| B03 权限与隐私 | `src/domains/permissions` | 隐私策略保存与影响预览 | 服务端裁决可见性；前端只展示结果和禁用原因 |
| B04 帖子/草稿/发布 | `src/domains/posts` | 详情、作者/社群内容、草稿、发布、顶层评论 cursor、回复写入、删除 tombstone | draft version、幂等；当前公开 controller 尚未暴露按 `parentCommentId` 读取楼中楼的入口 |
| B05 媒体与链接卡片 | `src/domains/media` | 上传会话、七牛对象直传、确认/轮询、失败自动重试、文件绑定检查点与头像/封面复用上传编排 | 真实对象存储回执、处理延迟、不可重试失败分类、媒体标题/描述 |
| B06 互动与传播 | `src/domains/engagement` | 点赞/取消、曝光回传、乐观更新与回滚 | 幂等计数、重复请求、最终一致性 |
| B07 收藏与内容中心 | `src/domains/library` | 收藏夹增删改、条目移动、内容中心、删除恢复、浏览历史 | cursor、批量操作、恢复期限、清理策略 |
| B08 社群 | `src/domains/communities` | 管理详情/概览、申请审批、成员角色、移除、规则、七字段设置、三槽位置顶、审计日志和正式创建 DTO；创建页媒体经 B05 READY 后提交 `avatarKey/coverKey` | 真实权限错误码、置顶降级原因、公开发现/详情分页与公开成员数据合同 |
| B09 时间线/推荐/发现 | `src/domains/feed` | Following、For You、Explore cursor 列表 | 曝光回传、刷新提示、去重和推荐解释 |
| B10 搜索 | `src/domains/search` | 帖子/用户/社群聚合结果、排序与筛选参数 | 权限过滤、相关性、cursor 和高亮片段 |
| B11 通知 | `src/domains/notifications` | 正式卡片 DTO、分类/未读筛选、单批已读、全部已读、bootstrap、delta、目标解析与 Socket.IO | 需要在真实后端验证 Socket 事件名和断线 gap 处理 |
| B12 设置与偏好 | `src/domains/settings` | 设置总览、通知偏好、兴趣标签 | B12 聚合但不代理 B01/B02/B03 的 owner 写入口 |

## 统一响应约定

API client 支持标准 envelope：

```ts
interface ApiEnvelope<T> {
  code: string;
  message: string;
  data: T;
}
```

建议错误结构：

```json
{
  "code": "VALIDATION_ERROR",
  "message": "参数错误",
  "fieldErrors": {
    "content": ["正文最多 280 字"]
  }
}
```

响应头建议包含 `x-request-id`；限流响应包含 `retry-after`。权限不足应返回可识别错误码和用户可理解的原因，而不是只返回模糊的 403。

## Cursor 列表约定

```ts
interface CursorPageView<T> {
  list: T[];
  nextCursor: string | null;
}

interface LegacyCursorPage<T> extends CursorPageView<T> {
  hasMore: boolean;
}
```

是否包含 `hasMore` 由各后端 owner 的正式 DTO 决定，前端不得自行补字段。B02 的 followers、following、入站关注请求、静音和屏蔽列表，以及 B07 的收藏项、内容中心和浏览历史固定以 `nextCursor` 是否为空判断是否继续；仍返回显式 `hasMore` 的旧 feed/search 合同由兼容类型承接。前端不混用 page number 与 cursor，游标始终视为 opaque token，并按各资源的稳定键跨页去重，例如 `bookmarkItemId`、`draftId`、`postId` 或用户 ID。

## 写请求约定

- 创建、发布和批量敏感操作支持 `idempotency-key`。
- 草稿保存提供 `version` 或 ETag；冲突返回 409 并附可比较版本。
- 点赞、关注、加入、收藏等操作应可重放或幂等。
- 批量操作返回逐项结果或明确原子性语义。
- 媒体上传状态由 B05 返回；前端只轮询 authoritative status，不根据时间猜测完成，并将断点绑定到场景、文件名、文件时间、类型、大小与 client upload ID。
- Mutation 成功后需明确受影响的 Query key，避免全局无差别刷新。
