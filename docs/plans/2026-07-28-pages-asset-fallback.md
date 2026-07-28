# Cloudflare Pages 静态资源回退修复实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 让缺失的 Cloudflare Pages 静态资源返回可验证的 404，同时保留已注册 Vue 路由的深链 200 回退。

**Architecture:** 在顶层提供无脚本 `404.html`，构建后为单层 Vue 路由生成 `dist/<route>.html`，仅用 `_redirects` 处理三个动态子路由和旧路径跳转，并删除会把错误资源响应缓存一年的宽泛资源缓存头。用配置测试、生产构建、本地 Pages 模拟和线上请求逐层验证。

**Tech Stack:** Cloudflare Pages `_redirects`/`_headers`、Vite、Node.js `node:test`、Wrangler、Playwright CLI。

---

### Task 1: 锁定失败行为

**Files:**
- Modify: `tests/config/pages-routing.test.js`

**Steps:**
1. 断言顶层 `404.html` 存在、全局 `/* /index.html 200` 不存在、已知页面路由有 200 回退。
2. 断言资源路径不再使用宽泛 immutable 缓存规则。
3. 运行 `node --test tests/config/pages-routing.test.js`，在实现前确认失败。

### Task 2: 收紧 Pages 配置

**Files:**
- Modify: `public/_redirects`
- Modify: `public/_headers`
- Create: `public/404.html`
- Create: `scripts/build-pages-route-shells.mjs`
- Modify: `package.json`

**Steps:**
1. 构建后从当前 `src/router/router.ts` 提取单层页面路径并生成同内容 HTML；`_redirects` 只保留旧路径 301 和动态子路由。
2. 删除会覆盖缺失资源的 immutable/Content-Type 规则，保留安全头和文档/首页缓存策略。
3. 添加无脚本、`noindex` 的 404 页面。
4. 运行配置测试，确认通过。

### Task 3: 构建与本地 Pages 验证

**Files:**
- No additional source changes unless verification exposes a defect.

**Steps:**
1. 运行 `pnpm build:pro`，确认 `dist/404.html`、配置文件存在且无递归产物。
2. 用 Wrangler Pages 本地服务检查已知深链为 200、缺失 `.js` 为 404、首页正常。
3. 运行完整测试集并检查 `git diff --check`。

### Task 4: 发布与线上验证

**Steps:**
1. 提交并推送聚焦分支，等待 CI/Preview 通过后合并。
2. 等待生产部署完成。
3. 用 Edge/Playwright 检查已知深链、缺失资源状态与 `Content-Type`/`Cache-Control`，并抽查老照片下载和两个紧凑上传页面。
