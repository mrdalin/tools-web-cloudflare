# AI Daily Motivation Cache Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Cache AI Daily Motivation content in the shared Cloudflare D1 database and only generate new content after the current browser viewing cycle has consumed the available content for a style.

**Architecture:** Add a D1 content pool and per-style generation lock behind `/api/daily-motivations`. The existing Agnes-to-Pollinations fallback remains the sole generation path. The Vue page stores displayed IDs in `localStorage`, selects unseen pool records randomly, and requests only the missing count after the pool is exhausted.

**Tech Stack:** Cloudflare Pages Functions, Cloudflare D1/SQLite, Vue 3, Axios, Vitest, Playwright CLI.

---

## 1. Add failing tests

- Add endpoint tests for pool reads, exhaustion enforcement, generation persistence, and generation locking with a fake D1 binding.
- Add pure client-selection tests for unseen selection and cycle reset behavior.
- Run the focused test files and confirm they fail before implementation.

## 2. Implement the backend pool

- Add migration `018_create_ai_daily_motivations.sql` for content and per-style lock tables.
- Export the existing AI fallback helper and add `functions/api/daily-motivations.js` with CORS, validated style/count input, pool reads, exhaustion checks, D1 locking, generation, deduplication, and inserts.
- Keep provider credentials and fallback behavior inside the existing AI module.

## 3. Implement the frontend cache flow

- Add small pure helpers for localStorage seen IDs, random unseen selection, and cycle state.
- Replace direct AI generation in `AiDailyMotivation.vue` with GET pool plus conditional POST generation.
- Preserve existing display, refresh, auto-refresh, style/count, and cover-generation behavior while changing motivation IDs to stable strings.

## 4. Verify locally

- Run focused tests, the full test suite, type checking, and production build.
- Start a local preview, use Playwright to verify initial load, refresh reuse, and no unnecessary AI request when cached content is available.

## 5. Migrate and publish

- Confirm the remote D1 tables are absent or already applied, then apply migration 018 once.
- Commit only this feature, push `main`, wait for the Cloudflare Pages deployment, and verify the production page and API behavior with Playwright.
