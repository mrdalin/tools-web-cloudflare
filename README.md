# Youngbar 工具箱

Youngbar 工具箱是部署在 Cloudflare Pages 上的一站式在线工具站，当前生产站点为：

- 站点地址：https://youngbar.com
- GitHub 仓库：https://github.com/ideajoker/tools-web-cloudflare
- Cloudflare Pages 项目：`tools-web-cloudflare`
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
- 文本 AI：Agnes API 为主，Pollinations 自动回退
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

## AI 文本调用与每日鸡汤内容池

文本类 AI 工具统一请求同源接口 `/api/ai-chat`：

- 配置 `AGNES_API_KEY` 时，默认先调用 Agnes `agnes-2.0-flash`。
- Agnes 超时、报错、返回空正文或因长度截断时，自动回退到 Pollinations `openai-fast`。
- 未配置 `AGNES_API_KEY` 时，直接使用 Pollinations。
- Provider Key 只存在于 Cloudflare Pages 加密变量中，前端不能直接持有或调用这些 Key。

`/ai-daily-motivation` 使用 D1 共享内容池减少 AI 调用：

1. 页面先通过 `GET /api/daily-motivations?style=...` 读取该风格的历史文案。
2. 浏览器用 `youngbar:ai-daily-motivation-seen:v1` 记录当前展示周期看过的文案 ID，并随机选择未展示内容。
3. 只有未展示库存不足时，前端才通过 `POST /api/daily-motivations` 请求缺少的数量。
4. 服务端确认该浏览器提交的当前库存已全部消费后，才调用现有的 Agnes → Pollinations 回退链路。
5. AI 本次返回的全部有效文案都会写入 D1；页面只展示当前所需数量，剩余内容留给后续刷新。

相关 D1 表：

- `ai_daily_motivations`：按风格保存文案，`UNIQUE(style, content)` 防止重复。
- `ai_daily_motivation_generation_locks`：按风格防止并发重复生成；正常请求结束后锁会释放，异常锁最多保留 60 秒。
- `ai_daily_motivation_generation_rate_limits`：按每日哈希客户端和十分钟窗口限制生成次数，默认每个客户端最多生成 3 批。

每日鸡汤的 GET 读取不受该限制；只有库存耗尽后真正调用 AI 的 POST 才消耗额度。达到限制时接口返回 `429` 和 `Retry-After`，防止恶意请求持续消耗 AI 配额。

清除浏览器本地数据只会重置该浏览器的展示周期，不会删除 D1 共享内容池。不要为了让单个浏览器重新开始而清空生产数据库。

## 本地开发

推荐环境：

```bash
node -v
# 使用 Node.js 22

pnpm -v
# 使用 pnpm 10.34.5
```

安装依赖：

```bash
pnpm install --frozen-lockfile
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
pnpm dev:wrangler
```

需要一边使用 Vite 热更新、一边调试 Functions 时，使用两个终端：

```bash
# 终端 1：先构建一次，再启动本地 Pages Functions（端口 8788）
pnpm build:pro
pnpm dev:wrangler

# 终端 2：启动 Vite（端口 5173），/api、/proxy 和登录回调会代理到 8788
pnpm dev
```

本地 Wrangler 默认使用本地状态；不要在日常开发命令中添加 `--remote`。

## 测试与交付前检查

至少执行：

```bash
node --test tests/**/*.test.js
pnpm build:pro
git diff --check
```

`pnpm build:pro` 已包含 `vue-tsc --noEmit`。涉及 Pages Functions 或 D1 时，还应使用本地 Wrangler 和本地 D1 状态验证接口；不要让本地测试连接生产 D1。

## Cloudflare 部署

Cloudflare Pages 构建配置：

```text
框架预设：Vue / Vite / None 均可
构建命令：pnpm build:pro
构建输出目录：dist
根目录：/
Node.js 版本：22
```

Cloudflare Pages 后台中的实际项目名是 `tools-web-cloudflare`；`wrangler.toml` 里的 `name = "tools-web"` 是 Wrangler 配置名，不要用它替代部署查询中的 Pages 项目名。

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
CRON_SECRET=用于 GitHub Actions 定时清理接口的随机密钥
AGNES_API_KEY=你的 Agnes API Key
POLLINATIONS_API_KEY=你的 Pollinations API Key
IMGBB_API_KEY=你的 ImgBB API Key
```

可选变量：

```env
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
- 正式站使用的 Key 至少要更新到 Production 环境；只有需要验证分支预览站时，才同时更新 Preview 环境。
- 修改加密变量后必须重新部署对应环境，已经运行的旧部署不会自动读取新值。
- `/cron/clean-chat` 只接受带 `CRON_SECRET` 的 POST 请求；GitHub Actions 使用仓库 Secrets 中同名变量调用，不要把密钥写入工作流或代码。

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
npx wrangler d1 execute tools-web-db --remote --file=functions/db/018_create_ai_daily_motivations.sql
npx wrangler d1 execute tools-web-db --remote --file=functions/db/019_create_ai_daily_motivation_rate_limits.sql
```

说明：

- 新库一般跳过 `004_alter_user_table.sql`，因为 `000_init_core_tables.sql` 已包含核心用户字段。
- 已执行过的 SQL 不要重复盲目执行；执行前先确认当前数据库状态。
- 新代码依赖新表时，生产环境应先执行对应迁移，再推送或合并会触发部署的代码。

每日鸡汤内容池的常用只读检查：

```bash
npx wrangler d1 execute tools-web-db --remote --command "SELECT style, COUNT(*) AS count FROM ai_daily_motivations GROUP BY style ORDER BY style;"
npx wrangler d1 execute tools-web-db --remote --command "SELECT style, locked_until FROM ai_daily_motivation_generation_locks;"
npx wrangler d1 execute tools-web-db --remote --command "SELECT COUNT(*) AS active_rate_limit_rows FROM ai_daily_motivation_generation_rate_limits;"
```

锁表通常应为空。限流表会保留短期窗口记录，过期记录由请求顺带清理。仅在确认请求已结束且锁记录长期异常残留后再人工处理；正常异常锁会在 60 秒后失效。

## 发布流程

日常开发从 `main` 创建功能分支，功能分支通过 CI 后再合并；`main` 推送后继续由 Cloudflare Pages 自动部署：

```bash
git switch main
git pull
git switch -c feature/功能名称
git status
git add 需要提交的文件
git commit -m "说明这次改了什么"
git push -u origin feature/功能名称
```

国内网络不稳定时，Windows CMD 可临时设置代理：

```bat
set HTTPS_PROXY=http://127.0.0.1:10808
set HTTP_PROXY=http://127.0.0.1:10808
git push
```

推送到 GitHub 后，Cloudflare Pages 会自动重新部署。

查看生产部署是否已经切到目标提交：

```bash
npx wrangler pages deployment list --project-name tools-web-cloudflare
```

部署后重点检查：

```text
https://youngbar.com
https://youngbar.com/markdown
https://youngbar.com/json
https://youngbar.com/api/mock-samples
https://youngbar.com/ai-chat
https://youngbar.com/ai-text-to-image
https://youngbar.com/ai-daily-motivation
https://youngbar.com/api/daily-motivations?style=%E5%8A%B1%E5%BF%97
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
- Agnes 返回空正文、长度截断、超时或错误时，文本 AI 自动回退到 Pollinations `openai-fast`。
- AI 每日励志鸡汤文已使用 D1 共享内容池和浏览器展示周期，库存耗尽后才生成并保存新内容。
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
- 修改 `/api/daily-motivations` 时同时检查池耗尽校验、去重写入、风格锁和浏览器展示周期测试。
- 修改 Cloudflare 变量后需要重新部署 Pages。
- 改动 UI 后建议检查桌面和移动端，尤其是按钮文字、浮动顶部栏、底部页脚。

## 常见问题

### Git 提示 dubious ownership 怎么办？

在项目目录执行：

```bash
git config --global --add safe.directory F:/HTML/www.youngbar.com/tools-web-cloudflare
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
- `POLLINATIONS_API_KEY` 是否存在，且 Production 环境已经重新部署。
- Cloudflare Pages 是否已重新部署。
- 浏览器 Network 中 `/api/ai-chat` 或 `/api/daily-motivations` 是否返回错误。
- Agnes 和 Pollinations 后台 Key 额度、限流和调用状态。
- 每日鸡汤失败时，确认 `018_create_ai_daily_motivations.sql` 和 `019_create_ai_daily_motivation_rate_limits.sql` 已应用，并使用上面的只读 SQL 检查内容池、锁表和限流表。

## 后续优化方向

当前项目已经达到可稳定维护和推广的状态。后续如果继续优化，建议按优先级推进：

1. 用 PageSpeed Insights 检查首页、JSON、Markdown、AI 生图等核心页。
2. 针对大型工具页继续做依赖按需加载，例如 PDF、签名图片、富文本编辑器。
3. 根据 Google Search Console 的未收录原因，继续优化薄内容页、重复标题和 404。
4. 为注册、登录、验证码、AI 生成等关键 API 补充更系统的异常日志。
5. 给核心功能补自动化测试，至少覆盖账号注册、登录、D1 读写和主要 AI 代理。

## License

本项目继承原开源项目协议。继续维护时请保留原项目来源链接。
