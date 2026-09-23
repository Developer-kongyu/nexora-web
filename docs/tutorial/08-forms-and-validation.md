# 08. 表单、校验与提交

## 1. 一个真实表单包含哪些问题

表单不只是几个输入框。注册页需要管理：

- 邮箱/手机号模式；
- 多个输入值；
- 客户端校验；
- 字段错误和服务端错误；
- 验证码倒计时；
- 提交中的禁用状态；
- 成功后的认证状态和导航；
- 可访问性和自动填充。

因此项目组合 React Hook Form、Zod、TanStack Query Mutation 和基础 UI 组件。

## 2. React Hook Form 负责什么

[`RegisterPage.tsx`](../../src/pages/auth/RegisterPage.tsx) 创建表单：

```ts
const form = useForm<RegisterValues>({
  resolver: zodResolver(schema),
  defaultValues: { ... },
});
```

常用成员：

- `register('field')`：把原生输入框注册进表单；
- `handleSubmit(fn)`：先校验，再调用提交函数；
- `formState.errors`：字段错误；
- `getValues()`：读取当前值；
- `setError()`：手工设置错误；
- `resetField()`：重置字段；
- `trigger()`：主动校验字段。

它避免每个输入框都手写一套 `useState` 与 `onChange`。

## 3. Zod Schema 是运行时校验

TypeScript 类型只在开发和构建时存在，不能阻止用户在浏览器输入非法值。Zod Schema 在运行时执行：

```ts
const schema = z.object({
  email: z.string().email('请输入有效邮箱'),
  password: strongPasswordSchema,
});
```

还可从 Schema 推导 TypeScript 类型：

```ts
type Values = z.infer<typeof schema>;
```

这样类型和校验规则不必重复维护。

## 4. 跨字段校验

确认密码依赖另一个字段，可用 `refine`：

```ts
.refine(passwordsMatch, {
  path: ['confirmPassword'],
  message: '两次输入的密码不一致',
});
```

注册模式还用 `superRefine`：邮箱模式检查邮箱，手机号模式检查 E.164 与 6 位验证码。`superRefine` 适合根据多个字段添加多个精确错误。

## 5. 为什么前端和后端都要校验

前端校验提供即时体验，减少无效请求。后端校验保证安全与一致性。后端还知道前端不知道的事实：

- 邮箱是否已经存在；
- Handle 是否冲突；
- 验证码是否匹配或过期；
- 当前账号是否有权限；
- 请求是否触发限流。

所以页面必须展示 Mutation 返回的 `ApiError`，不能认为通过 Zod 就一定成功。

## 6. Mutation 是提交状态机

`useRegister()` 返回的 Mutation 提供：

- `mutateAsync(input)`：执行；
- `isPending`：提交中；
- `error`：失败；
- `reset()`：清除旧状态。

按钮使用：

```tsx
<Button loading={registerMutation.isPending} type="submit">
  注册并继续
</Button>
```

这可以防止用户在请求中重复点击。

## 7. 辅助操作必须使用 `type="button"`

HTML 表单中的 `<button>` 默认可能是 submit。发送验证码、切换密码可见性、切换 Tab 都不是提交表单，必须显式：

```tsx
<Button type="button" onClick={sendCode}>
  发送验证码
</Button>
```

这是初学者非常常见的“点发送验证码却整个表单提交”问题。

## 8. 验证码倒计时不是验证码本身

`useVerificationCountdown` 只管理界面中的剩余秒数与按钮禁用。验证码有效期、重发限制和最终校验仍由后端决定。

正确流程：

```text
校验手机号格式
→ 请求后端发送
→ 后端返回 retryAfterSeconds
→ 前端启动倒计时
→ 用户输入验证码
→ 注册请求由后端最终核验
```

不要只在前端生成验证码或把固定验证码写进正式代码。

## 9. 模式切换为何要重置状态

从邮箱切到手机号时，注册页会：

- 更新 `mode`；
- 重置 identifier 和 code；
- 清除字段错误；
- 清除旧 Mutation 状态。

否则邮箱模式的错误可能残留到手机号模式，或旧验证码请求错误继续显示。

## 10. 自动填充和输入语义

项目设置：

- `type="email"`；
- `type="tel"`；
- `inputMode="numeric"`；
- `autoComplete="one-time-code"`；
- `autoComplete="new-password"`；
- `autoCapitalize="none"`。

这些不会替代校验，但能改善移动键盘、密码管理器和验证码自动填充体验。

## 11. 服务端字段错误如何处理

通用 `ApiError` 支持 `fieldErrors`。复杂表单可以在 catch 或 Mutation 错误回调中将后端字段错误映射回 `form.setError()`。同时保留一个表单级错误区域处理无法归属单字段的错误。

注意不要直接把未知服务端 HTML 插入页面；使用 React 文本渲染可以默认转义。

## 12. 表单提交检查表

- [ ] 原生字段有 label；
- [ ] 默认值完整；
- [ ] 客户端 Schema 与后端契约一致；
- [ ] 跨字段规则有测试；
- [ ] 辅助按钮使用 `type="button"`；
- [ ] 提交中禁止重复操作；
- [ ] 成功和失败都有反馈；
- [ ] 服务端字段错误可展示；
- [ ] 导航只在真正成功后发生；
- [ ] 不在日志中输出密码、验证码或 Token。

## 13. 本章自测

1. TypeScript 类型为什么不能替代 Zod？
2. `refine` 适合什么场景？
3. 为什么发送验证码按钮必须声明 `type="button"`？
4. 倒计时为零能否证明验证码已经失效？
5. 前端通过校验后，后端为什么仍可能拒绝请求？

上一章：[API、状态与认证](./07-api-state-and-authentication.md)；下一章：[真实功能链路](./09-feature-flow-walkthrough.md)。
