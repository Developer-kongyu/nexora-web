# 前端复用与唯一职责规范

## 1. 目标

相同的业务合同、枚举、状态机、缓存键、查询参数构造、选择逻辑和展示规则只能有一个权威实现。页面负责组合，不得为了局部方便复制一份“差不多”的类型或函数。

复用治理遵循两个边界：

1. **同一语义必须合并**：字段、取值、行为和生命周期一致时，必须复用一个实现。
2. **同值但不同语义不得强行合并**：两个领域类型恰好拥有相同字符串取值，但 owner、权限或未来演进方向不同，应保留独立名称和合同。

## 2. 权威实现位置

| 能力 | 唯一实现 | 使用约束 |
| --- | --- | --- |
| 查询参数拼接 | `src/shared/api/query.ts` | 领域 API 不得自行创建 `URLSearchParams` |
| cursor 请求、页面与合并 | `src/shared/api/pagination.ts` | 新 cursor 列表使用 `CursorRequest`、`CursorPageView<T>` 和共享 next-page 解析 |
| Infinite Query 列表修改 | `src/shared/api/infiniteData.ts` | 删除或过滤缓存项不得在页面重复遍历 page 结构 |
| 通用键选择状态 | `src/shared/hooks/useKeySelection.ts` | 列表选择、全选、反选和清理统一由该 Hook 管理 |
| 乐观布尔写操作 | `src/shared/hooks/useOptimisticBooleanMutation.ts` | 点赞、加入、关注等同构切换不得各自复制回滚状态机 |
| 剪贴板、日期、Set、文本、URL | `src/shared/lib/*` | 页面和领域优先调用共享纯函数，不复制兼容分支 |
| 认证字段校验 | `src/domains/auth/model/validation.ts` | 注册、找回与重置密码复用验证码、密码强度和确认匹配规则 |
| 通用用户摘要 | `src/shared/model/userIdentity.ts` | 只在确属同一展示语义时复用；owner DTO 仍保留在对应领域 |
| 通用媒体解析状态 | `src/shared/model/media.ts` | 不在帖子、通知和用户领域重复声明同一媒体状态联合 |
| Select 选项模型 | `src/shared/model/options.ts`、`src/shared/ui/Select/SelectOptions.tsx` | 枚举标签和选项由领域 presentation 层集中生成 |
| 图片类型、大小和校验 | `src/domains/media/lib/imageSelection.ts` | 页面不得重复 MIME、大小上限或错误文案 |
| 单图上传状态机 | `src/domains/media/lib/uploadMediaImageSelection.ts` | 资料和社群图片共用 B05 上传、确认、重试与 READY 编排 |
| 双图片选择 | `src/pages/_shared/useMediaImagePairSelection.ts` | 同时管理头像/封面的页面复用该组合 Hook |
| 社群枚举标签和选项 | `src/domains/communities/lib/presentation.ts` | 创建、管理和卡片展示不各自维护角色/策略文案 |
| 草稿列表选择 | `src/domains/posts/hooks/useDraftListSelection.ts` | 内容中心和草稿箱复用同一 draft ID 选择规则 |
| 草稿批量删除汇总 | `src/domains/library/model/draftBatch.ts` | 逐项成功/失败归并只保留一份实现 |
| 收藏/历史不可用文案 | `src/domains/library/model/presentation.ts` | PLACEHOLDER 原因到文案的映射集中维护 |
| Query Keys | 各领域 `model/queryKeys.ts` | 页面、Provider、Hook 和 Mutation 禁止手写同领域根 key |
| 页面标题 | `src/shared/ui/PageHeader` | `PageTitle` 仅作为兼容别名，不再维护第二套结构与样式 |

## 3. 类型、枚举与常量规则

### 3.1 服务端合同

服务端 DTO、输入和结果联合放在 owner 领域的 `model/types.ts`。其他领域通过 owner 的公开 `index.ts` 引用，不复制字段相同的本地 DTO。

```ts
// 正确：复用 owner 类型
import type { UserRelationSnapshotView } from '@/domains/users';

// 错误：页面重新声明同构类型
interface LocalRelation {
  following: boolean;
  followedBy: boolean;
  requestPending: boolean;
}
```

### 3.2 字面量联合与枚举值

同一领域的取值集合用 `as const` 数组定义，再从数组推导类型；标签和 `<option>` 从该集合生成。不得在页面重新写同一联合或数组。

```ts
export const COMMUNITY_VISIBILITIES = ['PUBLIC', 'PRIVATE'] as const;
export type CommunityVisibility = (typeof COMMUNITY_VISIBILITIES)[number];
```

### 3.3 允许保留的语义别名

以下情况即使底层结构暂时相同，也不要求合并：

- 不同后端 owner 的输入类型。
- 写入合同与读取 ViewModel。
- 权限级别、可见范围等未来可能独立演进的领域概念。
- 为迁移旧调用方保留、且明确标记为兼容层的类型别名。

兼容别名不得包含第二份字段定义，只能引用权威类型。

## 4. Hook、流程与组件规则

- 页面 Hook 只组合领域 Hook 和共享 Hook，不复制网络、重试、回滚或分页算法。
- 相同状态机出现第二次时，在合并前先确认生命周期和错误语义完全一致；确认一致后抽到 owner 领域或 `shared`。
- 领域组件包含业务语义；纯视觉组件进入 `shared/ui`。不得仅因 JSX 相似就把不同业务组件强行合并。
- 测试应直接覆盖权威纯函数和合同，页面测试不再各自复制相同的期望构造器。
- Mock 必须调用与正式代码相同的 presentation 或归并规则；不得维护一套仅测试环境使用的平行枚举。

## 5. Query Key 规则

每个拥有服务端缓存的领域在 `model/queryKeys.ts` 暴露层级 key factory：

```ts
export const postKeys = {
  all: ['posts'] as const,
  detail: (postId: string) => [...postKeys.all, 'detail', postId] as const,
};
```

约束：

- Query 和 Mutation 都从 key factory 取 key。
- 跨页面失效使用领域根 key，不手写 `['posts']`、`['feed']` 等数组。
- key factory 不导入 React Query，避免模型层引入运行时依赖和循环引用。
- 参数对象必须是稳定、可序列化值，不传入函数、Signal 或可变实例。

## 6. 自动门禁

提交前执行：

```bash
npm run reuse:check
```

门禁扫描生产 TypeScript/TSX，阻止：

- 跨文件重复导出的类型或枚举名称。
- 同构接口、类型别名和字面量联合。
- 重复静态数组/对象常量。
- 完全相同或结构高度相同的函数实现。
- 领域 API 绕过 `shared/api/query` 自行拼查询参数。
- 绕过共享剪贴板工具。
- 恢复已删除的页面级图片上传实现。

完整质量命令 `npm run check` 已将 `reuse:check` 放在最前面，使重复实现先于格式、类型和测试阶段失败。

## 7. 评审清单

新增功能或修改 PR 至少确认：

1. 是否已有同名、同结构或同状态机能力。
2. 类型是否属于正确 owner，页面是否重新声明 DTO。
3. 字面量集合、标签、Query Key 和错误文案是否已有权威映射。
4. 分页、选择、缓存修改、乐观更新和上传是否复用公共实现。
5. 抽象是否保持语义，不把仅仅“长得像”的不同领域强行耦合。
6. `npm run reuse:check` 是否通过。
