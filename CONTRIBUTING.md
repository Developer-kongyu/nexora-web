# 贡献指南

## 分支与提交

- `main`：可部署版本。
- `develop`：日常集成。
- 功能分支：`feat/<domain>-<subject>`。
- 修复分支：`fix/<domain>-<subject>`。
- 提交建议遵循 Conventional Commits，例如 `feat(posts): add draft autosave`。

## 提交前检查

```bash
npm run check
npm run test:e2e:list
```

涉及关键用户链路时再执行：

```bash
npx playwright install chromium
npm run test:e2e
```

## 代码边界

- `shared` 不依赖 `domains/widgets/pages/app`。
- `domains` 不依赖 `widgets/pages/app`。
- `widgets` 不依赖 `pages/app`。
- 页面不直接访问 HTTP；接口必须收敛到领域 API。
- 服务端数据不复制进 Zustand。
- 禁止新增第二套帖子互动栏、API client、分页结构、Query Key、图片上传状态机或同构 DTO/枚举。
- 新增公共能力前先查阅 `docs/REUSE_GUIDELINES.md`；同语义必须复用，同值但不同 owner 的概念不得强行合并。

## Pull Request 最低要求

- 描述影响的后端模块和页面。
- 说明接口契约、权限、空状态和错误状态。
- 新逻辑包含单元/组件测试；主链路包含 E2E 或明确测试计划。
- UI 改动附桌面与窄屏截图。
- `npm run reuse:check` 通过。
- `npm run check` 通过。
