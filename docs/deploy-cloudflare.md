# Tools-Web Cloudflare deployment

This project is best deployed as a Cloudflare Pages app:

- Static frontend: Cloudflare Pages
- Backend APIs: Cloudflare Pages Functions in `functions/`
- Database: Cloudflare D1, binding name `DB`

When the frontend and Functions are on the same Cloudflare Pages domain, keep `VITE_FUNCTIONS_BASE_URL` empty. The frontend will call `/api/...` on the same origin.

## 1. Cloudflare Pages build settings

Use these settings when creating the Pages project:

```text
Framework preset: None / Vue / Vite
Build command: pnpm build:pro
Build output directory: dist
Root directory: /
Node.js version: 20
```

Production environment variables:

```env
NODE_VERSION=20
NODE_ENV=production
VITE_SITE_URL=https://your-domain.example
VITE_FUNCTIONS_BASE_URL=
SITE_URL=https://your-domain.example
```

## 2. D1 database

Create a D1 database, for example `tools-web-db`, then bind it to the Pages project:

```text
Variable name: DB
D1 database: tools-web-db
```

Initialize the database once with Wrangler:

```bash
wrangler login
wrangler d1 execute tools-web-db --remote --file=functions/db/000_init_core_tables.sql
wrangler d1 execute tools-web-db --remote --file=functions/db/001_create_short_links.sql
wrangler d1 execute tools-web-db --remote --file=functions/db/002_create_bookmarks.sql
wrangler d1 execute tools-web-db --remote --file=functions/db/003_create_letters.sql
wrangler d1 execute tools-web-db --remote --file=functions/db/005_create_ai_apps.sql
wrangler d1 execute tools-web-db --remote --file=functions/db/006_insert_ai_apps_data.sql
wrangler d1 execute tools-web-db --remote --file=functions/db/007_update_system_apps_prompts.sql
wrangler d1 execute tools-web-db --remote --file=functions/db/008_create_user_season_scenery.sql
wrangler d1 execute tools-web-db --remote --file=functions/db/009_add_ultimate_essence_analysis.sql
wrangler d1 execute tools-web-db --remote --file=functions/db/010_add_domain_crash_course.sql
wrangler d1 execute tools-web-db --remote --file=functions/db/011_add_critical_knowledge.sql
wrangler d1 execute tools-web-db --remote --file=functions/db/012_add_prompt_reverse_engineering.sql
wrangler d1 execute tools-web-db --remote --file=functions/db/013_add_content_distillation.sql
wrangler d1 execute tools-web-db --remote --file=functions/db/014_add_cynefin_analysis.sql
wrangler d1 execute tools-web-db --remote --file=functions/db/015_add_x_viral_content.sql
wrangler d1 execute tools-web-db --remote --file=functions/db/016_create_favorite_apps.sql
```

Skip `004_alter_user_table.sql` for a new database because `000_init_core_tables.sql` already creates `password` and `salt` columns.

## 3. Secrets and API variables

Required for email/password login:

```env
JWT_SECRET=replace-with-a-long-random-secret
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=Tools Web <noreply@your-domain.example>
```

OAuth variables are optional. Only configure the providers you want to enable:

```env
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_REDIRECT_URI=https://your-domain.example/github-auth

GITEE_CLIENT_ID=
GITEE_CLIENT_SECRET=
GITEE_REDIRECT_URI=https://your-domain.example/gitee-auth

LINUXDO_CLIENT_ID=
LINUXDO_CLIENT_SECRET=
LINUXDO_REDIRECT_URI=https://your-domain.example/linuxdo-auth

QQ_CLIENT_ID=
QQ_CLIENT_SECRET=
QQ_REDIRECT_URI=https://your-domain.example/qq-auth
```

## 4. Custom domain

After the first successful Pages deployment, add your domain in:

```text
Cloudflare Pages -> your project -> Custom domains
```

Then set:

```env
VITE_SITE_URL=https://your-domain.example
SITE_URL=https://your-domain.example
```

Redeploy after changing build-time variables.

## 5. Verification

Check these URLs after deployment:

```text
https://your-domain.example
https://your-domain.example/markdown
https://your-domain.example/api/mock-samples
```

Then test:

- Email verification code
- Register/login
- Notes or QA save/load
- Refreshing a deep route such as `/markdown`
