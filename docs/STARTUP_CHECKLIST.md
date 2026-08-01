# 项目启动清单

## 后端契约

- [ ] 获取正式 OpenAPI 文件或 URL。
- [ ] 确认统一 envelope 与错误码。
- [ ] 确认 cursor 字段名和排序稳定性。
- [ ] 确认登录、refresh、logout 的 Cookie、CSRF、CORS 设置。
- [ ] 确认 B04/B06 的互动 owner 路由。
- [ ] 确认 B05 上传会话、直传签名、完成确认和处理状态。
- [ ] 确认 B11 Socket.IO namespace、事件名、token 和 cursor。

## 前端配置

- [ ] 建立 `.env.local`、staging 和 production 环境变量。
- [ ] 配置真实 API/Socket URL。
- [ ] 配置 Google Client ID。
- [ ] 接入 Sentry 或同类错误监控。
- [ ] 设置构建 release 与 source map 上传策略。

## 首批联调

- [ ] B01 会话启动、登录、刷新和退出。
- [ ] B09 首页 cursor feed。
- [ ] B04 帖子详情、草稿和发布。
- [ ] B05 媒体上传与查看。
- [ ] B06 点赞乐观更新与失败回滚。
- [ ] B07 收藏、内容中心、浏览历史。
- [ ] B08 社群列表、详情、加入、创建和管理。
- [ ] B10 搜索权限过滤。
- [ ] B11 通知列表、未读角标和断线补拉。
- [ ] B12 设置总览与偏好。

## 质量与发布

- [ ] `npm run reuse:check` 未发现重复合同、枚举、常量、函数或公共能力绕过。
- [ ] `npm run check` 全绿。
- [ ] Storybook 关键组件状态齐全。
- [ ] Playwright 覆盖登录、发帖、上传、互动、社群和通知。
- [ ] Nginx/网关支持 SPA history fallback。
- [ ] CORS、Cookie SameSite/Secure 和 CSP 在 staging 验证。
- [ ] 404、403、删除、空结果、限流和 5xx 状态验收。
- [ ] 桌面、平板和移动布局验收。
