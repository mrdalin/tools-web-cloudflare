---
description: 项目命令与构建部署相关
---

## 命令

```bash
# 环境
node -v              # 22.x
pnpm -v              # 10.34.5

# 开发
pnpm dev              # 启动开发服务器
pnpm dev:wrangler     # 基于 dist 启动本地 Pages Functions

# 构建
pnpm build            # 开发构建（SEO 禁用）
pnpm build:pro        # 生产构建（SEO 启用）

# 预览
pnpm preview          # 预览生产构建

# 本地函数测试（先执行 pnpm build:pro）
pnpm dev:wrangler     # 端口 8788；另一个终端运行 pnpm dev
```

## 构建与部署说明

- 生产构建统一使用 `pnpm build:pro`，输出目录是独立的 `dist/`
- Cloudflare Pages 从仓库根目录读取 `functions/`，不要复制到 `dist/functions/`
- `public/robots.txt`、`public/sitemap.xml` 等静态文件由 Vite 自动复制到 `dist/`
- Cloudflare Pages 生产分支为 `main`，构建环境使用 Node.js 22
