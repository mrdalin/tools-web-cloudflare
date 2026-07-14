# CLAUDE.md

本项目指南，供 Claude Code 在处理仓库代码时使用。

## 项目概述

Tools-Web 是一个基于 Vue 3 + TypeScript + Vite 的在线工具箱应用。提供 100+ 个工具，涵盖开发、文本处理、图片处理、数据可视化、游戏、AI 工具等多个分类。

**技术栈：** Vue 3（Composition API）、TypeScript、Vite、Element Plus、Tailwind CSS、Pinia、Vue Router

**部署：** Cloudflare Pages + D1 数据库，Cloudflare Workers 无服务器函数

**运行时：** Node.js 22 + pnpm 10.34.5

## ⚠️ 关键约束（必须遵守）

### Cloudflare Functions 路由注册

本项目使用 Cloudflare Pages Functions 部署后端 API。**新增任何 API 接口必须在 `functions/_routes.json` 的 `include` 数组中注册路由**，否则生产环境部署后该接口会被静态资源拦截，返回 404。

**路由规则：**
- 文件路径 `functions/api/foo.js` → 对应路由 `/api/foo`
- 文件路径 `functions/api/foo/[id].js` → 对应路由 `/api/foo/:id`
- 文件路径 `functions/api/foo/[[path]].js` → 对应路由 `/api/foo/*`（通配）
- **`_routes.json` 中必须同时列出精确路径和带 `/*` 的通配路径**

**示例：** 新增 `functions/api/favorite-apps.js`，必须同时添加：
```json
"/api/favorite-apps",
"/api/favorite-apps/*"
```

**部署前自检清单：**
1. ✅ API 文件已创建于 `functions/api/`
2. ✅ 已在 `functions/_routes.json` 的 `include` 中添加对应路径
3. ✅ 数据库迁移 SQL 已放在 `functions/db/`，并确认执行目标后再运行（线上才使用 `--remote`）
4. ✅ `/api` 路径由 `vite.config.ts` 的通用代理转发到 `http://127.0.0.1:8788`

> Cloudflare Pages 直接读取仓库根目录的 `functions/`。不要把 Functions 复制进 `dist/functions/`。新增根级路由（非 `/api`）时，需要同时检查 `_routes.json` 和 Vite 本地代理。

### 本地开发注意事项

### 本地开发注意事项

- `pnpm dev` 仅启动 Vite（端口 5173），**不加载 Cloudflare Functions**
- 调试完整应用时，先运行 `pnpm build:pro`，然后在终端 1 运行 `pnpm dev:wrangler`（端口 8788），终端 2 运行 `pnpm dev`
- Vite 会把 `/api`、`/proxy` 和登录回调代理到 Wrangler；也可直接访问 `http://127.0.0.1:8788/`
- 修改 `_routes.json` 后如遇 404，重启 wrangler 即可（缓存目录 `.wrangler` 在 Windows 上可能无法直接删除，但重启会自动刷新函数扫描）

## 快速导航

- [命令与构建](.claude/project/commands.md) — 开发命令、构建与部署
- [目录结构](.claude/project/structure.md) — 项目文件结构
- [添加新工具](.claude/project/new-tool.md) — 创建新工具的完整步骤
- [架构详情](.claude/project/architecture.md) — 状态管理、HTTP、AI、Supabase、D1、Functions
- [编码规范](.claude/project/coding-conventions.md) — 编码规范、核心原则、UI 指南
- [环境变量](.claude/project/env.md) — 环境变量说明
- [通用模式与 SEO](.claude/project/patterns.md) — 工具组件结构、SEO 要求、布局组件
