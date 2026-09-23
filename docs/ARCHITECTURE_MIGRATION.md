# 架构迁移记录

迁移日期：2026-09-18。依据：[推荐项目目录与架构设计](./推荐项目目录与架构设计.md)。

本次实施文档中职责明确的公共组件迁移、首批发帖与互动 feature、公开入口、依赖检查、Mock 拆分和 CI 接入。登录、编辑资料、社群创建 feature，以及 loader/action 和独立查询配置仍按原方案的“有实际需求时提取”执行；没有新增空模块。

## 已落地的职责

| 职责                  | 当前位置                                                                 | 行为与边界                                                                                        |
| --------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| 发帖表单与媒体队列 UI | `src/features/compose-post/ui`                                           | 编辑器通过 props 接收上下文，通过回调通知完成，可在无 Router 的容器使用                           |
| 表单模型              | `features/compose-post/model/compose.schema.ts`、`composeForm.ts`        | 临时空选项、表单值与接口输入转换分开；posts 保留发布和草稿合同                                    |
| 发帖生命周期          | `useComposer`、`useDraftAutosave`、`useComposeUploads`、`usePublishPost` | 1.5 秒防抖、版本递增、冲突停止自动重试、媒体等待与失败处理、重复提交/卸载保护                     |
| URL 与导航            | `src/pages/compose/ComposePage.tsx`                                      | 保留 draftId、community、quotePostId；保存替换草稿 URL，发布转入详情                              |
| 发布缓存              | `features/compose-post/model/usePublishPost.ts`                          | 单一 mutation 调用直接/草稿发布；成功刷新 feed、草稿列表和对应草稿详情；posts 不再反向依赖 feed   |
| 帖子互动              | `src/features/post-interactions/model`                                   | 卡片和评论统一点赞，帖子统一转发/收藏；按目标帖子共享等待状态与提交锁，失败回滚                   |
| 互动缓存              | `features/post-interactions/model/interactionCache.ts`                   | 刷新活跃读模型、标记其他副本过期，覆盖首页、详情/评论、搜索、收藏、历史、内容中心、主页及社群帖子 |
| 基础 UI               | `src/shared/ui/{Notice,LoadingRows,SideCard,EmptyPanel}`                 | SideCard 接受上层传入的 action 节点；PageTitle 消费者直接使用已有 PageHeader                      |
| 页面布局              | `src/shared/ui/layout`                                                   | PageLayout、Stack 与无业务的 ContentLayout 样式                                                   |
| 快速发帖              | `src/widgets/quick-compose`                                              | 当前用户与发帖入口保留在业务 widget                                                               |
| 页面内部 UI           | `pages/settings/ui`、`pages/profile-edit/ui`                             | 设置导航壳、资料保存/取消页脚随页面归位                                                           |
| 双图片选择            | `domains/media/hooks/useMediaImagePairSelection.ts`                      | 复用媒体选择控制器、清理规则和错误反馈                                                            |
| Mock                  | `src/mocks/{handlers,fixtures,state}`                                    | 十二领域 handler，稳定顺序组装；静态样例与可变状态分离，统一重置                                  |

旧 `widgets/compose-editor`、`widgets/layout` 与 `pages/_shared` 的实现已迁走，未保留平行实现。`mocks/fixtures.ts` 保留显式样例重导出，供原有测试与 Stories 使用；可变 Mock 数据只由 state 持有。

## 工程边界

依赖方向为 `app → pages → widgets → features → domains → shared`，允许上层直接使用下层公开接口。跨领域读取允许列表及用途见 [ARCHITECTURE.md](./ARCHITECTURE.md)。

- widget/feature 使用根入口，领域使用显式根、model、api、lib 入口，内部使用相对路径。
- `scripts/check-boundaries.mjs` 使用 TypeScript 模块解析，覆盖别名、相对路径、重导出、静态/动态导入、require、类型导入与 CSS，检测文件和模块循环。
- 禁止生产模块引入测试/Mock；仅保留受开发/测试模式与开关双重控制的启动动态导入。
- `boundaries:test` 用故意违规样例验证规则，`boundaries:check` 与 `reuse:check` 均进入本地 `check` 及 CI；Storybook/E2E 保持执行。
- 领域公开入口改为显式导出；静态 Mock 合同通过纯 model 入口访问，不从领域总出口加载 React/HTTP。

## 一并修复的集成问题

原有复用门禁暴露的手机验证码用途、设置隐私类型和两个设置页查询键，改为复用所属领域定义；feed 社群可见性/加入策略复用 communities 合同。没有把语义不同的账号和社群可见性强行合并。

默认 Mock 的点赞、转发、收藏现在将操作保存到同一帖子状态，详情、feed、收藏、历史和社群置顶读取当前投影；重复请求不重复计数，reset 同时恢复。它让迁移后统一回读缓存的行为在演示环境中也保持一致。

原有七处格式偏差仅按现有 Prettier 规则修正。迁移前已有的 ToastProvider 注释修改保留，README 与学习文档在原有内容基础上同步新路径。

## 验收

- 公共 CSS 拆分前后逐规则比对：99 条规则及响应式条件完整保留。
- Mock 注册顺序逐项比对：138 个 method/path 的顺序保持一致。
- 发帖回归覆盖草稿版本、防抖、冲突、发布失效、重复提交、失败媒体、卸载取消与无 Router 回调。
- 互动回归覆盖原帖/评论目标、权限、并发、失败回滚及活跃/未挂载缓存的更新。
- Mock 回归覆盖静态/动态路径优先级、跨领域数据重置与 fixture 隔离。

### 完成记录

- 架构规则验证：15 项通过；生产代码边界检查与复用检查通过。
- 全量 Vitest：75 个测试文件、250 项测试通过。
- ESLint、Stylelint 与 Storybook 构建通过。
- Playwright：4 项通过，包括既有 2 项冒烟测试、新增草稿到发布及跨页互动链路、390px 手机布局。测试使用本机 Chrome，通过现有 `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` 指定浏览器，配置未写入本机路径。
- 最终 `npm run check` 完整通过：规则测试、边界、复用、格式、类型、ESLint、Stylelint、全量 Vitest 与生产构建均成功。生产页面继续按路由拆包。
