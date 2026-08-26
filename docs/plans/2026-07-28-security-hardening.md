# Youngbar Security Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Protect the destructive chat-cleanup cron route and persistently limit AI daily-motivation generation without changing existing product behavior.

**Architecture:** Authenticate the cron request with one shared Bearer secret stored in Cloudflare Pages and GitHub Actions. Add a D1-backed fixed-window limiter for daily-motivation generation, recheck the pool after acquiring the existing style lock, and keep dependency remediation in a later isolated change.

**Tech Stack:** Cloudflare Pages Functions, Cloudflare D1/SQLite, GitHub Actions, Node.js test runner, Vue/Vite.

---

### Task 1: Establish the security branch and baseline

**Files:**
- Create: `docs/plans/2026-07-28-security-hardening-design.md`
- Create: `docs/plans/2026-07-28-security-hardening.md`

**Steps:**

1. Confirm `main` is clean and synchronized with `origin/main`.
2. Create `fix/security-hardening`.
3. Run `node --test tests/**/*.test.js` and record the existing 14-test passing baseline.

### Task 2: Add failing cron-authentication tests

**Files:**
- Create: `tests/functions/clean-chat.test.js`
- Modify: `functions/cron/clean-chat.js`

**Steps:**

1. Add tests proving GET returns `405`, missing/wrong Bearer tokens return `401`, a missing configured secret fails closed, and valid authentication reaches the Supabase count request.
2. Stub `globalThis.fetch` and assert unauthorized requests never call Supabase.
3. Run `node --test tests/functions/clean-chat.test.js` and confirm the new security assertions fail against the current handler.

### Task 3: Implement cron authentication

**Files:**
- Create: `functions/utils/cron-auth.js`
- Modify: `functions/cron/clean-chat.js`
- Modify: `.github/workflows/clean-chat.yml`
- Modify: `.dev.vars.example`
- Modify: `README.md`

**Steps:**

1. Add Bearer parsing and constant-length digest comparison without logging tokens.
2. Require `POST`, fail closed when `CRON_SECRET` is absent, and reject unauthorized requests before reading Supabase settings.
3. Return generic client errors while retaining detailed server-side logs.
4. Update GitHub Actions to send `${{ secrets.CRON_SECRET }}` and fail on non-2xx responses.
5. Document only the variable name and configuration scope.
6. Run the focused cron tests until they pass.

### Task 4: Configure the cron secret safely

**Files:**
- No source file contains the generated value.

**Steps:**

1. Generate at least 32 random bytes in memory.
2. Pipe the same value to `wrangler pages secret put CRON_SECRET --project-name tools-web-cloudflare`.
3. Pipe it to `gh secret set CRON_SECRET --repo mrdalin/tools-web-cloudflare`.
4. List secret names only and confirm `CRON_SECRET` exists in both systems.

### Task 5: Add failing D1 rate-limit and race tests

**Files:**
- Modify: `tests/functions/daily-motivations.test.js`
- Create: `functions/db/019_create_ai_daily_motivation_rate_limits.sql`

**Steps:**

1. Extend the fake D1 binding to model rate-limit rows and fresh pool reads.
2. Add a test that the fourth generation batch inside ten minutes returns `429` and does not call an AI provider.
3. Add a test that a pool replenished before/while acquiring the style lock returns `pool_not_exhausted` without generation.
4. Add input tests for excessive ID count and excessive ID length.
5. Run the focused test and confirm failures before implementation.

### Task 6: Implement persistent generation limiting

**Files:**
- Modify: `functions/api/daily-motivations.js`
- Modify: `functions/db/019_create_ai_daily_motivation_rate_limits.sql`
- Modify: `README.md`

**Steps:**

1. Derive a daily SHA-256 client key from `CF-Connecting-IP` without storing raw IP addresses.
2. Atomically consume a three-per-ten-minute D1 quota only when generation is required.
3. Return `429` and `Retry-After` when the quota is exhausted.
4. Re-read the pool after acquiring the style lock and before consuming quota or calling AI.
5. Opportunistically delete expired limiter rows.
6. Apply realistic `seenIds` count and length limits.
7. Run focused tests until they pass.

### Task 7: Verify locally and remotely

**Files:**
- Verify all modified files only.

**Steps:**

1. Run `node --test tests/**/*.test.js`.
2. Run `corepack pnpm build:pro` and require a successful type check/build.
3. Run `git diff --check` and confirm `dist/` remains ignored and non-recursive.
4. Apply migration 019 to local D1 and inspect both new tables.
5. Apply migration 019 once to remote D1 after code/tests are ready and before production deployment.
6. Commit P0/P1 as focused commits, push the branch, create a PR, and wait for GitHub CI and Cloudflare Preview.
7. Merge only after both checks pass, then verify production returns `401` for an unauthenticated cron POST without invoking deletion and that the daily pool GET remains `200`.

### Task 8: Isolate dependency remediation

**Files:**
- Later branch: `chore/security-dependency-updates`
- Review: `package.json`, `pnpm-lock.yaml`, chart spreadsheet components, and `SignImage`.

**Steps:**

1. Re-run `corepack pnpm audit --prod --json` after P0/P1 are deployed.
2. Mechanically update only compatible overrides first (`tar`, `brace-expansion`, `postcss`, `linkify-it`, `diff`, `dompurify`).
3. Separately evaluate replacement or containment for `xlsx`, `x-data-spreadsheet`, and the old `tui-image-editor`/Fabric chain.
4. Keep this work out of the endpoint-security PR.
