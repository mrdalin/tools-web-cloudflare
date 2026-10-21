# Youngbar 工具箱

Youngbar 工具箱是部署在 Cloudflare Pages 上的一站式在线工具站，当前生产站点为：

- 站点地址：https://youngbar.com
- GitHub 仓库：https://github.com/mrdalin/tools-web-cloudflare
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
- 邮件验证码：Resend
- 登录：邮箱验证码、邮箱密码、Google 登录
- 统计：Google Analytics 4
- SEO：已配置 `robots.txt`、`sitemap.xml`、canonical、基础 Open Graph、核心工具页 SEO 内容模块

## 项目进度快照（2026-10-21）

- 主生产分支为 main，推送后自动执行 CI 和 Cloudflare Pages 构建部署。
- AI 栏目、专用页面、模型适配与代理接口已退役；闪卡复习归入教育学术，本地五子棋继续保留。
- 每个静态工具路由现在生成包含独立标题、描述、canonical、结构化数据和可读正文的 HTML。
- 首页 HTML 提供分类与工具链接；原有交互继续由 Vue 按页面加载。
- JS、CSS、assets 使用带提交版本的文件名和 immutable 缓存；未知地址和缺失资源保持真实 404。
- 登录、个人资料和参数化分享详情不参与工具索引，站点地图只包含可索引的规范地址。
- 涉及路由、缓存或资源文件名时，必须检查桌面、手机、生产深链及缺失资源响应。

## 常用功能

工具箱覆盖以下类型：

- 开发运维：JSON、Base64、MD5、JWT、URL、正则、Cron、HTTP 状态码、Mock 数据等。
- 文本处理：Markdown、文本对比、字数统计、文本去重、字符串清理等。
- 图片处理：二维码、图片压缩、图片裁剪、图片转 Base64、证件照、签名图片等。
- 内容管理：笔记、待办、QA、收藏夹、体重记录、简历、公司对比等。
- 教育学术：单位换算、算法可视化、逻辑训练、闪卡复习等。
- 趣味工具：2048、扫雷、数独、五子棋、记忆训练等。

内容管理类功能的基本策略：

- 未登录：尽量允许直接使用，数据保存在当前浏览器本地。
- 登录后：支持保存到云端，便于长期保存和多设备同步。
- 必须登录的功能：页面需要明确提示用户先登录。

## 独立页面与搜索收录

每个工具使用独立 URL，例如 /json、/md5、/base64。生产构建完成后，postbuild:pro 读取路由、分类、工具原有静态说明和精选使用指南，生成对应的 HTML 页面。搜索引擎及未启用 JavaScript 的浏览器可以直接读取标题、介绍、说明和相关链接；启用 JavaScript 后继续使用原有工具交互。

长度、面积、重量、时间、温度、压力、热量和功率换算分别使用 /unit/length、/unit/area 等独立页面，包含各自的说明、示例和常见问题。旧的 /unit?active=temperature 等参数链接在浏览器加载后自动切换到对应的新页面。

页面生成与浏览器导航共同使用 src/utils/pageSeo.ts 中的规范地址、标题和索引规则。动态分享详情使用独立的 dynamic-page.html 入口并标记 noindex，不再返回首页副本；隐私政策旧地址和旧待办地址维持 301 跳转。

运行 pnpm generate:sitemap 可更新 public/sitemap.xml。每次生产构建同时重新生成 dist/sitemap.xml，避免路由和站点地图不同步。登录、个人资料、404、别名和参数化详情均不列入。站点地图不使用虚构的构建日期作为 lastmod。

独立且内容明确的页面有助于发现和理解，实际收录与排名仍由搜索引擎决定。

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

# 终端 2：启动 Vite（端口 5173），/api 和登录回调会代理到 8788
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
```

可选变量：

```env

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

## D1 数据库初始化

新建 D1 数据库后，按顺序执行：

```bash
npx wrangler d1 execute tools-web-db --remote --file=functions/db/000_init_core_tables.sql
npx wrangler d1 execute tools-web-db --remote --file=functions/db/001_create_short_links.sql
npx wrangler d1 execute tools-web-db --remote --file=functions/db/002_create_bookmarks.sql
npx wrangler d1 execute tools-web-db --remote --file=functions/db/003_create_letters.sql
npx wrangler d1 execute tools-web-db --remote --file=functions/db/008_create_user_season_scenery.sql
npx wrangler d1 execute tools-web-db --remote --file=functions/db/017_create_verification_codes.sql
```

说明：

- 新库一般跳过 `004_alter_user_table.sql`，因为 `000_init_core_tables.sql` 已包含核心用户字段。
- 已执行过的 SQL 不要重复盲目执行；执行前先确认当前数据库状态。
- 新代码依赖新表时，生产环境应先执行对应迁移，再推送或合并会触发部署的代码。

历史退役功能的迁移 SQL 作为数据库历史保留，不再作为新库必需步骤；本次改造不清空已有数据库数据。

## 发布流程

日常开发从 `main` 创建功能分支，功能分支通过 CI 后再合并；`main` 推送后继续由 Cloudflare Pages 自动部署：

```bash
git switch main
git pull
git switch -c codex/功能名称
git status
git add 需要提交的文件
git commit -m "说明这次改了什么"
git push -u origin codex/功能名称
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
https://youngbar.com/base64
https://youngbar.com/flashcards
https://youngbar.com/travel-map/plaza
https://youngbar.com/sitemap.xml
```

## 已完成的重要改造

安全与账号：

- 清理仓库中的真实密钥，密钥改由 Cloudflare 加密变量管理。
- Markdown/QA 渲染收口，避免直接渲染不可信 HTML。
- API CORS 和代理 URL 校验加固。
- 邮箱验证码增加专门表和服务端校验逻辑。
- 密码哈希升级为 PBKDF2，并兼容旧密码迁移。
- 修复邮箱注册验证码一次性消耗导致注册失败的问题。
- Google 登录已适配 Cloudflare Pages 部署。

Cloudflare 部署：

- `wrangler.toml` 维护 D1 绑定和普通变量。
- `VITE_FUNCTIONS_BASE_URL` 支持前端和 Functions 分离，但当前 youngbar.com 使用同源 `/api/...`。
- `dist/` 已从 Git 跟踪中移除，并加入 `.gitignore`。
- postbuild:pro 为每个静态路由生成独立页面及最新站点地图；public/_redirects 处理动态详情入口与旧地址跳转。
- 生产构建会把当前提交短 SHA 加入 JS、CSS 和其他 Vite 资产名；这些版本化资源使用一年 `immutable` 缓存，HTML 壳仍要求重新验证。

产品体验：

- 顶部搜索栏支持向上滚动时浮出。
- 首页 logo/左上角区域点击后回到首页顶部和默认分类。
- 内容管理类工具支持“未登录本地使用，登录后云同步”的方向。
- 本地保存提示已补充“清除浏览器数据会丢失”的风险说明。
- 页脚改为 Youngbar 版权和“一切来自 2006 年的「飘」”纪念文案。
- 移除旧评论区、原作者备案信息和第三方统计/验证残留。

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

### 新增工具页面为什么没有出现在站点地图？

确认路由包含独立的 title、keywords、description，属于静态路径且不是别名或账号页，再运行 pnpm generate:sitemap 和 pnpm build:pro。发布后直接检查该工具地址返回的原始 HTML 与 sitemap.xml。

## 已知遗留问题

| 优先级 | 问题或观察项 | 当前影响 | 建议处理方式 |
| --- | --- | --- | --- |
| P1 | 缺少正式的浏览器端冒烟测试 | 当前依赖人工 Playwright 复验深链、骨架屏和资源响应，路由或缓存回归可能到 Preview 阶段才被发现 | 在 CI 中增加至少一个 Chromium 冒烟测试，覆盖首页、普通工具深链、动态详情页、缺失 JS 404 和 JS `Content-Type` |
| P2 | Cloudflare Zone 级规则没有纳入仓库 | Pages `_headers` 可追踪，但 Zone 的 Browser Cache TTL、Cache Rules 等仍可能在控制台漂移；当前 Wrangler OAuth 只有 `zone:read`，不能读取 Zone Settings 或 Rulesets | 使用单独的最小权限 API Token 获取 `Zone Settings Read`、`Cache Rules Read`，先导出只读快照，再决定是否采用 Terraform 或受控脚本管理 |
| P2 | Cloudflare Insights beacon 被现有 CSP 拦截 | 不影响站点业务和 GA4，但 Cloudflare Web Analytics beacon 当前不会上报 | 明确是否需要 Cloudflare Web Analytics；需要则只放行 `static.cloudflareinsights.com`，不需要则关闭对应注入，避免无意义的控制台错误 |
| P2 | 部分大型 chunk 仍超过 800 kB | PDF、富文本、签名图片等页面首次加载成本较高，弱网下更明显 | 用 bundle 分析定位后继续拆分 PDF、编辑器和图片处理依赖，逐页验证，避免为了消除警告进行全局重构 |
| P3 | 构建存在第三方依赖警告 | `@vueuse/core` 的 PURE 注释位置和 `tui-image-editor` 的 `backbround-color` 拼写警告来自依赖，当前不影响构建 | 依赖升级时复查；除非出现实际样式或压缩错误，不在本仓库内复制或改写第三方源码 |
| P3 | GTM 在部分本地网络下连接失败 | 生产业务不受影响，但本地或受限网络中的统计请求会报 `ERR_CONNECTION_CLOSED` | 用不同网络验证 GA4；不要把第三方网络失败当作 Vue 路由或资源加载失败 |

## 后续优化方向

当前项目已经达到可稳定维护和推广的状态。后续建议按以下顺序推进：

1. 先补浏览器端冒烟测试，把本轮路由与缓存故障的生产验证固化到 CI。
2. 建立 Cloudflare Zone 设置的只读快照和变更记录，减少控制台配置漂移。
3. 明确 Cloudflare Insights 的使用取舍并消除对应 CSP 控制台错误。
4. 用 PageSpeed Insights 和 bundle 分析检查首页、JSON、Markdown、PDF、签名图片、富文本编辑器等核心页，按页面拆分大型依赖。
5. 为注册、登录、验证码、D1 读写和主要数据接口补充端到端测试与结构化异常日志。
6. 根据 Google Search Console 的未收录原因，继续处理薄内容页、重复标题和无效链接。

## License

本项目继承原开源项目协议。继续维护时请保留原项目来源链接。
