# 06. 组件、CSS 与设计系统

## 1. 组件粒度与操作职责

本项目按展示粒度与操作职责组织 UI：

| 粒度         | 例子                              | 所在目录                   |
| ------------ | --------------------------------- | -------------------------- |
| 基础组件     | Button、TextField、Modal、Avatar  | `shared/ui`                |
| 复合业务组件 | PostCard、UserCard、QuickCompose  | `widgets`                  |
| 完整操作 UI  | ComposeEditor                     | `features/compose-post/ui` |
| 页面编排     | HomePage、LoginPage、SettingsPage | `pages`                    |

拆分不是越小越好。一个只用一次、没有独立概念的三行 JSX 不必强行创建组件。

## 2. 从 Button 学组件 API

[`Button.tsx`](../../src/shared/ui/Button/Button.tsx) 的 Props 在原生按钮属性上扩展：

```ts
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: UiSize;
  loading?: boolean;
}
```

这样组件既支持项目自定义的 `variant`，又保留 `type`、`disabled`、`onClick` 等原生能力。

好的组件 API 应：

- 使用明确的有限变体，而不是任意颜色字符串；
- 保留原生语义和可访问性；
- 为常用值提供合理默认值；
- 不让调用者知道内部 DOM 细节；
- 加载时同时禁用，避免重复提交。

## 3. 组合优于巨型配置

React 倾向用 `children` 组合：

```tsx
<Button loading={mutation.isPending}>保存更改</Button>
```

而不是给 Button 传几十个与具体业务绑定的属性。基础组件不知道“保存资料”或“发送验证码”，这些语义由页面提供。

## 4. CSS Modules 如何隔离样式

文件名形如 `Button.module.css`，导入后：

```tsx
import styles from './Button.module.css';

<button className={styles.button} />;
```

构建时类名会被局部化，避免不同页面都叫 `.title` 时互相覆盖。

CSS Modules 解决类名作用域，不代表可以忽视 CSS 基础。仍需理解：

- 盒模型；
- Flexbox 与 Grid；
- 定位与层叠上下文；
- 响应式媒体查询；
- 继承与优先级；
- `:hover`、`:focus-visible`、`:disabled` 等状态。

## 5. 全局样式为何仍然存在

[`src/app/styles`](../../src/app/styles) 下有：

- `reset.css`：消除浏览器默认差异；
- `tokens.css`：颜色、间距、阴影等设计令牌；
- `typography.css`：字体和文字层级；
- `global.css`：组合全局规则。

基础组件使用：

```css
color: var(--color-primary);
```

而不是到处写 `#6d5dfc`。设计令牌的价值是：

- 全站视觉统一；
- 主题调整集中；
- 颜色含义语义化；
- 减少“差一点点”的重复值。

## 6. `cn` 工具解决什么

组件常有条件类名：

```tsx
className={cn(styles.button, styles[variant], disabled && styles.disabled, className)}
```

[`cn`](../../src/shared/lib/cn.ts) 负责过滤无效值并拼接类名。它让 JSX 更清楚，但不要把复杂业务规则藏进类名表达式。

## 7. 布局为什么单独做成组件

`AppShellLayout` 管理登录后整体外壳，`PageLayout` 管理主栏与右侧栏。布局组件让多个页面共享：

- 最大宽度；
- 栅格比例；
- 响应式折叠；
- 公共间距；
- `<Outlet />` 的内容位置。

如果每个页面自己复制 Grid CSS，稍后调整侧栏宽度会变成全仓库修改。

## 8. 可访问性不是额外装饰

项目组件中能看到：

- 图标按钮有 `aria-label`；
- 加载按钮有 `aria-busy`；
- 错误消息使用 `role="alert"`；
- `label` 与输入框通过 `htmlFor/id` 关联；
- 非按钮元素不随意冒充按钮；
- 外链使用 `rel="noopener noreferrer"`。

键盘用户、屏幕阅读器用户和自动测试都依赖正确语义。能用 `<button>` 就不要用带点击事件的 `<div>`。

## 9. PostCard 为什么属于 Widget

[`PostCard.tsx`](../../src/widgets/post-card/PostCard.tsx) 同时组合：

- 作者与主页链接；
- 帖子正文富文本；
- 图片或视频；
- 链接预览；
- 转发/回复关系；
- 曝光记录；
- 互动操作条；
- 卡片整体点击与内部链接的事件冲突处理。

它有明确业务含义，多个页面复用，又不是独立路由，因此属于 Widget，而不是 `shared/ui` 或 `pages`。

## 10. 响应式设计的思考顺序

不要只在 1920px 屏幕上写完再“缩小看看”。建议：

1. 明确内容的最小可用宽度；
2. 决定侧栏何时隐藏或移到下方；
3. 避免固定高度截断动态文本；
4. 媒体使用合理的 `aspect-ratio` 与 `object-fit`；
5. 按钮点击区域至少足够大；
6. 在 320/375、768、桌面宽度下测试；
7. 测试长用户名、长错误消息和无图片状态。

## 11. 何时用内联样式

项目中有少量简单内联样式，例如只在一个位置使用的 Grid 间距。适合内联的通常是：

- 值来自运行时计算；
- 极小且不会复用；
- 不需要伪类和媒体查询。

复杂布局、交互状态和响应式规则应放 CSS Module，避免 JSX 被视觉细节淹没。

## 12. 添加基础组件的检查表

- [ ] 组件名称表达职责而不是外观位置；
- [ ] Props 有明确类型和默认值；
- [ ] 尽量继承对应原生元素属性；
- [ ] 键盘与屏幕阅读器可使用；
- [ ] 加载、禁用、错误、空内容状态明确；
- [ ] 样式使用设计令牌；
- [ ] 没有依赖某个业务页面；
- [ ] 关键交互有组件测试；
- [ ] 从 `shared/ui/index.ts` 有选择地导出。

## 13. 本章自测

1. CSS Modules 解决了什么，没有解决什么？
2. 为什么 PostCard 不属于 `shared/ui`？
3. 设计令牌比到处写十六进制颜色好在哪里？
4. 为什么 `<div onClick>` 通常不如 `<button>`？
5. 什么样的样式适合内联？

上一章：[启动、路由与 Provider](./05-bootstrap-routing-and-providers.md)；下一章：[API、状态与认证](./07-api-state-and-authentication.md)。
