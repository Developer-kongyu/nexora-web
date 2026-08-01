# ADR-0001：采用领域模块化 SPA 起步架构

- 状态：已接受
- 日期：2026-07-10

## 背景

项目已有 B01–B12 后端模块设计与完整高保真 UI，需要快速启动前端，同时避免页面驱动的重复 API、重复状态和重复帖子卡片。

## 决策

采用 Vite + React + TypeScript SPA；代码按 `app/pages/widgets/domains/shared` 分层。TanStack Query 管理服务端状态，Zustand 仅管理临时客户端状态，CSS Modules 承载高保真样式。所有帖子使用统一 PostCard。

## 结果

优点：领域 owner 清晰、Mock 独立开发、路由级拆包、容易测试和替换接口。代价：需要维护明确的导入边界和 ViewModel，开发者不能在页面中随意调用接口。
