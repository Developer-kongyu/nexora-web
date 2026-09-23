# 03. TypeScript 与 React 基础

本章不试图覆盖两门技术的全部语法，只讲阅读本项目最常用的概念。

## 1. ES Module：代码为什么能跨文件使用

项目使用 ESM，因为 [`package.json`](../../package.json) 设置了 `"type": "module"`。常见语法：

```ts
export function formatName(name: string) {
  return name.trim();
}

import { formatName } from './formatName';
```

本项目配置了 `@` 别名：

```ts
import { Button } from '@/shared/ui';
```

等价于从 `src/shared/ui` 导入。别名同时配置在 TypeScript、Vite、Vitest 中；只配置其中一个会造成“编辑器能识别但运行失败”或相反的问题。

## 2. TypeScript 最常见的类型

```ts
const title: string = '首页';
const count: number = 3;
const active: boolean = true;
const tags: string[] = ['React', 'TypeScript'];
```

### 对象接口

```ts
interface UserSummary {
  id: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
}
```

`string | null` 是联合类型，表示头像地址可能不存在。使用前必须处理 `null`。

### 字面量联合类型

[`src/domains/feed/model/queryKeys.ts`](../../src/domains/feed/model/queryKeys.ts) 中：

```ts
export const FEED_TABS = ['following', 'for-you'] as const;
export type FeedTab = (typeof FEED_TABS)[number];
```

`FeedTab` 只能取两个值。它比普通 `string` 更安全，拼错 `followng` 会在编译期报错。

### 泛型

[`apiClient.request<TResponse>()`](../../src/shared/api/client.ts) 的 `TResponse` 是泛型参数：调用者告诉通用请求函数“这次响应是什么类型”。

```ts
const result = await apiClient.request<UserSummary>({ path: '/api/users/me' });
```

泛型让同一个函数能服务多种响应，同时保留类型信息。

## 3. 为什么严格类型很重要

[`tsconfig.app.json`](../../tsconfig.app.json) 启用了：

- `strict`：严格空值、函数和对象检查；
- `noUncheckedIndexedAccess`：数组下标访问可能得到 `undefined`；
- `isolatedModules`：每个文件都能被独立转换；
- `noEmit`：TypeScript 只检查，实际输出交给 Vite。

这会让初学时错误更多，但能把很多线上崩溃提前变成编辑器提示。

## 4. React 组件是什么

组件通常是返回 JSX 的函数：

```tsx
interface GreetingProps {
  name: string;
}

function Greeting({ name }: GreetingProps) {
  return <p>你好，{name}</p>;
}
```

使用：

```tsx
<Greeting name="Nexora" />
```

`Props` 是父组件传入的只读数据。组件不应直接修改 Props。

## 5. JSX 不是 HTML 字符串

JSX 允许在标记中嵌入表达式：

```tsx
{
  isLoading ? <Spinner /> : <PostList posts={posts} />;
}
```

几个常见区别：

- HTML 的 `class` 在 JSX 中是 `className`；
- 事件使用函数：`onClick={handleClick}`；
- 样式对象使用驼峰：`style={{ marginTop: 8 }}`；
- 自定义组件首字母大写；
- 列表渲染需要稳定的 `key`。

## 6. State：组件自己的记忆

[`LoginPage.tsx`](../../src/pages/auth/LoginPage.tsx) 使用：

```tsx
const [mode, setMode] = useState<LoginMode>('password');
const [showPassword, setShowPassword] = useState(false);
```

State 改变会触发重新渲染。它适合：

- 当前 Tab；
- 弹窗开关；
- 是否显示密码；
- 输入中的临时值。

不要把后端帖子列表长期复制进 `useState`，否则缓存、刷新和并发状态需要自己重造。

## 7. Effect：与 React 外部系统同步

[`RealtimeProvider.tsx`](../../src/app/providers/RealtimeProvider.tsx) 使用 `useEffect` 建立 Socket 连接，并在组件卸载时断开：

```tsx
useEffect(() => {
  if (status !== 'authenticated') return;
  // 建立外部连接
  return () => {
    // 清理连接
  };
}, [status]);
```

Effect 适合与网络连接、浏览器事件、定时器等外部系统同步。不要为了计算一个可由 Props/State 推导的值就使用 Effect。

## 8. Hook 的规则

Hook 是以 `use` 开头、组合 React 能力的函数，例如 `useFeed`、`useLogin`、`useToast`。

必须遵守：

1. 只在 React 组件或其他 Hook 顶层调用；
2. 不要放进 `if`、循环或普通事件回调；
3. 自定义 Hook 应表达一种可复用行为，而不是随意包装任何函数。

ESLint 的 React Hooks 规则会检查这些问题。

## 9. 事件与异步函数

按钮事件常见写法：

```tsx
<Button onClick={() => void sendCode()}>发送验证码</Button>
```

`sendCode()` 返回 Promise，而 DOM 事件期望返回 `void`。显式 `void` 表达“这里主动忽略返回值”；函数内部仍要让错误被 Mutation 或 `try/catch` 正确管理。项目的 ESLint 也开启了 `no-floating-promises`，防止无意丢弃 Promise。

## 10. `forwardRef` 为什么出现

[`TextField.tsx`](../../src/shared/ui/TextField/TextField.tsx) 和 [`Button.tsx`](../../src/shared/ui/Button/Button.tsx) 使用 `forwardRef`。原因是 React Hook Form 或父组件需要拿到内部原生 `input`/`button` 的引用。

这是一种“透传引用”：

```text
表单库 ref → TextField → 内部 input
```

没有它，`register()` 提供的 ref 可能无法连接到真实输入框。

## 11. React StrictMode

[`ApplicationRoot.tsx`](../../src/app/ApplicationRoot.tsx) 在开发环境使用 `StrictMode`。它会帮助暴露不纯渲染和 Effect 清理问题，开发时某些逻辑可能看起来执行两次。这不是生产环境重复渲染的证据，不应该简单删除 StrictMode 来掩盖副作用错误。

## 12. 本章自测

1. `string | null` 为什么要求额外判断？
2. Props 和 State 的区别是什么？
3. 什么场景适合 `useEffect`？
4. 为什么 Hook 不能放进条件语句？
5. `forwardRef` 在 `TextField` 中解决什么问题？

上一章：[环境与首次启动](./02-environment-and-first-run.md)；下一章：[目录与分层架构](./04-directory-architecture.md)。
