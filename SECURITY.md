# 安全说明

## 认证令牌

- Access Token 只保存在 JavaScript 内存中。
- Refresh Token 必须由后端通过 HttpOnly、Secure Cookie 管理。
- 禁止把认证令牌写入 localStorage、sessionStorage、URL 或日志。

## 前端环境变量

所有 `VITE_*` 变量都会进入浏览器构建产物，不得放置服务端密钥、私钥或第三方 Secret。

## 漏洞报告

请通过项目内部安全渠道提交，内容至少包含影响版本、复现步骤、预期与实际行为、风险范围和建议修复方式。不要在公开 Issue 中披露未修复漏洞。

## 上线检查

- API 与 Socket 必须使用 HTTPS/WSS。
- 校验 CORS、Cookie SameSite/Secure、CSRF、防点击劫持和 CSP。
- 上传文件类型、大小、签名和访问权限由后端校验。
- 前端展示后端错误时不得泄露堆栈、数据库信息或令牌。
