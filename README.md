# Youngbar 工具箱

Youngbar 工具箱是部署在 Cloudflare Pages 上的一站式在线工具站，当前生产站点为：

- 站点地址：https://youngbar.com
- GitHub 仓库：https://github.com/ideajoker/tools-web-cloudflare
- Cloudflare Pages 项目：`tools-web`
- D1 数据库：`tools-web-db`

本项目基于以下开源项目继续维护和改造：

- 源站：[naroat/tools-web](https://github.com/naroat/tools-web)
- 二次项目：[2424004764/tools-web](https://github.com/2424004764/tools-web)

## 当前状态

本仓库已经按 Youngbar 的 Cloudflare 部署方式完成整理：

- 前端：Vue 3 + Vite + Element Plus
- 部署：Cloudflare Pages
- 后端：Cloudflare Pages Functions
- 数据库：Cloudflare D1，绑定名为 `DB`
- 域名：`youngbar.com`
- 主要 AI 服务：Agnes API，备用/历史兼容包含 Pollinations
- 邮件验证码：Resend
- 登录：邮箱验证码、邮箱密码、Google 登录
- 统计：Google Analytics 4
- SEO：已配置 `robots.txt`、`sitemap.xml`、canonical、基础 Open Graph、核心工具页 SEO 内容模块

## 常用功能

工具箱覆盖以下类型：

- 开发运维：JSON、Base64、MD5、JWT、URL、正则、Cron、HTTP 状态码、Mock 数据等。
- 文本处理：Markdown、文本对比、字数统计、文本去重、字符串清理等。
- 图片处理：二维码、图片压缩、图片裁剪、图片转 Base64、证件照、签名图片等。
- 内容管理：笔记、待办、QA、收藏夹、体重记录、简历、公司对比等。
- AI 工具：AI 对话、AI 翻译、AI 起名、每日文案、文生图、文生视频等。
- 趣味工具：2048、扫雷、数独、五子棋、记忆训练等。

内容管理类功能的基本策略：

- 未登录：尽量允许直接使用，数据保存在当前浏览器本地。
- 登录后：支持保存到云端，便于长期保存和多设备同步。
- 必须登录的功能：页面需要明确提示用户先登录。

## 本地开发

推荐环境：

```bash
node -v
# 建议 Node.js 20 或 22

pnpm -v
# 建议 pnpm 10+
```

安装依赖：

```bash
pnpm install
```

启动前端开发服务：

```bash
pnpm dev
```

生产构建：

```bash
pnpm build:pro
```

本地预览：

```bash
pnpm preview
```

本地调试 Cloudflare Pages Functions：

```bash
pnpm build:pro
npx wrangler pages dev dist
```

## Cloudflare 部署

Cloudflare Pages 构建配置：

```text
框架预设：Vue / Vite / None 均可
构建命令：pnpm build:pro
构建输出目录：dist
根目录：/
Node.js 版本：20
```

`wrangler.toml` 中维护普通变量和 D1 绑定：

```toml
name = "tools-web"
compatibility_date = "2024-09-23"
pages_build_output_dir = "dist"

[vars]
NODE_ENV = "production"
VITE_APP_TITLE = "Youngbar工具箱"
VITE_APP_DESC = "一个轻量的在线工具箱"
VITE_SITE_URL = "https://youngbar.com"
VITE_FUNCTIONS_BASE_URL = ""
SITE_URL = "https://youngbar.com"

[[d1_databases]]
binding = "DB"
database_name = "tools-web-db"
database_id = "你的 D1 database_id"
```

Cloudflare Pages 后台只需要维护加密变量，也就是“变量和密钥”里的密钥。

## 必要密钥

生产环境至少建议配置：

```env
JWT_SECRET=替换成足够长的随机字符串
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=Youngbar <noreply@youngbar.com>
AGNES_API_KEY=你的 Agnes API Key
IMGBB_API_KEY=你的 ImgBB API Key
```

可选变量：

```env
POLLINATIONS_API_KEY=
AITOOLS_API_KEY=

GOOGLE_CLIENT_ID=
VITE_GOOGLE_CLIENT_ID=

GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_REDIRECT_URI=https://youngbar.com/github-auth

GITEE_CLIENT_ID=
GITEE_CLIENT_SECRET=
GITEE_REDIRECT_URI=https://youngbar.com/gitee-auth

LINUXDO_CLIENT_ID=
LINUXDO_CLIENT_SECRET=
LINUXDO_REDIRECT_URI=https://youngbar.com/linuxdo-auth

QQ_CLIENT_ID=
QQ_CLIENT_SECRET=
QQ_REDIRECT_URI=https://youngbar.com/qq-auth
```

注意：

- 不要把真实密钥写入 `wrangler.toml`。
- 不要提交 `.dev.vars`、`.env.production`、`.env.development`。
- 示例变量放在 `.dev.vars.example`。

## D1 数据库初始化

新建 D1 数据库后，按顺序执行：

```bash
npx wrangler d1 execute tools-web-db --remote --file=functions/db/000_init_core_tables.sql
npx wrangler d1 execute tools-web-db --remote --file=functions/db/001_create_short_links.sql
npx wrangler d1 execute tools-web-db --remote --file=functions/db/002_create_bookmarks.sql
npx wrangler d1 execute tools-web-db --remote --file=functions/db/003_create_letters.sql
npx wrangler d1 execute tools-web-db --remote --file=functions/db/005_create_ai_apps.sql
npx wrangler d1 execute tools-web-db --remote --file=functions/db/006_insert_ai_apps_data.sql
npx wrangler d1 execute tools-web-db --remote --file=functions/db/007_update_system_apps_prompts.sql
npx wrangler d1 execute tools-web-db --remote --file=functions/db/008_create_user_season_scenery.sql
npx wrangler d1 execute tools-web-db --remote --file=functions/db/009_add_ultimate_essence_analysis.sql
npx wrangler d1 execute tools-web-db --remote --file=functions/db/010_add_domain_crash_course.sql
npx wrangler d1 execute tools-web-db --remote --file=functions/db/011_add_critical_knowledge.sql
npx wrangler d1 execute tools-web-db --remote --file=functions/db/012_add_prompt_reverse_engineering.sql
npx wrangler d1 execute tools-web-db --remote --file=functions/db/013_add_content_distillation.sql
npx wrangler d1 execute tools-web-db --remote --file=functions/db/014_add_cynefin_analysis.sql
npx wrangler d1 execute tools-web-db --remote --file=functions/db/015_add_x_viral_content.sql
npx wrangler d1 execute tools-web-db --remote --file=functions/db/016_create_favorite_apps.sql
npx wrangler d1 execute tools-web-db --remote --file=functions/db/017_create_verification_codes.sql
```

说明：

- 新库一般跳过 `004_alter_user_table.sql`，因为 `000_init_core_tables.sql` 已包含核心用户字段。
- 已执行过的 SQL 不要重复盲目执行；执行前先确认当前数据库状态。

## 发布流程

日常代码提交：

```bash
git status
git add 需要提交的文件
git commit -m "说明这次改了什么"
git push
```

国内网络不稳定时，Windows CMD 可临时设置代理：

```bat
set HTTPS_PROXY=http://127.0.0.1:10808
set HTTP_PROXY=http://127.0.0.1:10808
git push
```

推送到 GitHub 后，Cloudflare Pages 会自动重新部署。

部署后重点检查：

```text
https://youngbar.com
https://youngbar.com/markdown
https://youngbar.com/json
https://youngbar.com/api/mock-samples
https://youngbar.com/ai-chat
https://youngbar.com/ai-text-to-image
```

## 已完成的重要改造

安全与账号：

- 清理仓库中的真实密钥，密钥改由 Cloudflare 加密变量管理。
- Markdown/AI/QA 渲染收口，避免直接渲染不可信 HTML。
- API CORS 和代理 URL 校验加固。
- 邮箱验证码增加专门表和服务端校验逻辑。
- 密码哈希升级为 PBKDF2，并兼容旧密码迁移。
- 修复邮箱注册验证码一次性消耗导致注册失败的问题。
- Google 登录已适配 Cloudflare Pages 部署。

Cloudflare 部署：

- `wrangler.toml` 维护 D1 绑定和普通变量。
- `VITE_FUNCTIONS_BASE_URL` 支持前端和 Functions 分离，但当前 youngbar.com 使用同源 `/api/...`。
- `dist/` 已从 Git 跟踪中移除，并加入 `.gitignore`。
- `public/_redirects` 支持 SPA fallback 和旧路径重定向。

产品体验：

- 顶部搜索栏支持向上滚动时浮出。
- 首页 logo/左上角区域点击后回到首页顶部和默认分类。
- 内容管理类工具支持“未登录本地使用，登录后云同步”的方向。
- 本地保存提示已补充“清除浏览器数据会丢失”的风险说明。
- 页脚改为 Youngbar 版权和“一切来自 2006 年的「飘」”纪念文案。
- 移除旧评论区、原作者备案信息和第三方统计/验证残留。

AI：

- 文本 AI 主要切到 Agnes `agnes-2.0-flash`。
- 文生图/图生图支持 Agnes `agnes-image-2.1-flash` 方向。
- 文生视频/图生视频支持 Agnes `agnes-video-v2.0` 方向。
- 图床上传使用 ImgBB API Key。

SEO 与统计：

- 接入 GA4：`G-YVWF2H3GQ5`。
- 隐私政策已补充 Google Analytics 匿名访问统计说明。
- 已整理 sitemap/robots，提交 Google Search Console。
- 已给核心工具页补 SEO 内容模块、FAQ 和相关工具内链。
- 404 页面改为可搜索、可回首页的友好页面，并补 SEO meta。

性能：

- 构建前自动生成工具图标 sprite。
- ECharts 改为按需注册，图表包体大幅下降。
- 移除首页对 Element Plus、ECharts、Codemirror 的不必要预加载。
- `vue-vendor` 单独缓存，工具依赖按页面懒加载。
- 生产构建开启 gzip 和 brotli 压缩产物。

## 维护注意事项

- `dist/` 是构建产物，不要提交。
- 修改路由后同步检查 `sitemap.xml` 和旧路径重定向。
- 新增需要云同步的功能时，优先设计“未登录本地可用，登录后云同步”。
- 新增用户可输入内容时，默认不要使用 `v-html`，必须先做可信过滤。
- 新增外部 API 代理时，必须做 URL origin 白名单校验。
- 新增密钥时，只放 Cloudflare 加密变量，并同步更新 `.dev.vars.example`。
- 新增数据库表时，把 SQL 放到 `functions/db/`，使用递增编号。
- 修改 Cloudflare 变量后需要重新部署 Pages。
- 改动 UI 后建议检查桌面和移动端，尤其是按钮文字、浮动顶部栏、底部页脚。

## 常见问题

### Git 提示 dubious ownership 怎么办？

在项目目录执行：

```bash
git config --global --add safe.directory F:/HTML/tools-web
```

### Wrangler 代理报 Invalid URL 怎么办？

代理地址要带协议：

```bat
set HTTPS_PROXY=http://127.0.0.1:10808
set HTTP_PROXY=http://127.0.0.1:10808
set ALL_PROXY=http://127.0.0.1:10808
```

不要只写 `127.0.0.1:10808`。

### Cloudflare Pages 后台为什么只能添加密钥？

因为普通变量和绑定已经由 `wrangler.toml` 管理。Cloudflare 后台只允许继续维护加密变量，这是正常的。

### 生成失败或 AI 偶发失败怎么办？

AI 接口本身可能偶发超时或限流。优先检查：

- `AGNES_API_KEY` 是否存在。
- Cloudflare Pages 是否已重新部署。
- 浏览器 Network 中 `/api/...` 是否返回错误。
- Agnes 后台 Key 额度和调用状态。

## 后续优化方向

当前项目已经达到可稳定维护和推广的状态。后续如果继续优化，建议按优先级推进：

1. 用 PageSpeed Insights 检查首页、JSON、Markdown、AI 生图等核心页。
2. 针对大型工具页继续做依赖按需加载，例如 PDF、签名图片、富文本编辑器。
3. 根据 Google Search Console 的未收录原因，继续优化薄内容页、重复标题和 404。
4. 为注册、登录、验证码、AI 生成等关键 API 补充更系统的异常日志。
5. 给核心功能补自动化测试，至少覆盖账号注册、登录、D1 读写和主要 AI 代理。

## License

本项目继承原开源项目协议。继续维护时请保留原项目来源链接。
