# Security Hardening Design

## Scope

This work closes the two concrete security gaps found after the previous project handoff:

1. `/cron/clean-chat` is publicly callable while holding Supabase `service_role` deletion authority.
2. `/api/daily-motivations` can call paid AI providers without a persistent generation limit.

Previously completed baseline, AI fallback, D1 content-pool, navigation, README, and deployment work stays unchanged. Dependency remediation is intentionally separated from the endpoint fixes because `xlsx`, `x-data-spreadsheet`, and `tui-image-editor` require compatibility decisions beyond a safe mechanical version bump.

## P0: Cron Authentication

Three approaches were considered:

- Cloudflare Access service tokens: strongest infrastructure boundary, but it adds dashboard-managed policy and makes local verification harder.
- Timestamped HMAC requests: resistant to replay, but unnecessary complexity for one daily GitHub Action.
- Shared Bearer secret: minimal, testable, supported by both Cloudflare Pages secrets and GitHub Actions secrets.

The shared Bearer secret is selected. The function will fail closed if `CRON_SECRET` is missing, accept only `POST`, compare the submitted token without exposing it, and return generic production errors. GitHub Actions will send the secret through the `Authorization` header with `curl --fail-with-body`. The secret value will be randomly generated and written directly to Cloudflare and GitHub through their CLIs without appearing in source code, command output, or documentation.

## P1: Persistent AI Generation Limiting

An in-memory `Map` is not sufficient on Cloudflare because requests can land in different isolates. Cloudflare WAF rate limiting would work, but the rule would live outside the repository and be harder to reproduce. The selected design uses the existing D1 binding so the policy is versioned, testable, and consistent across isolates.

A new table stores a hashed daily client identifier, the fixed ten-minute window, request count, and update time. Only generation POSTs consume quota; pool reads remain public and cheap. The initial policy is three generation batches per client per ten minutes. The client identifier is derived from `CF-Connecting-IP` and hashed with the UTC date so raw IP addresses are not stored and identifiers rotate daily.

The endpoint will also:

- reduce `seenIds` to a bounded, realistic size and cap each ID length;
- acquire the style lock, then re-read the pool before calling AI to close the stale-request race;
- return `429` with `Retry-After` when quota is exhausted;
- opportunistically remove old rate-limit rows;
- preserve the current Agnes-to-Pollinations fallback and content deduplication behavior.

## Verification and Delivery

Tests will prove unauthenticated cron requests cannot reach Supabase, authenticated POST requests still work, repeated AI generation is limited across requests, stale requests do not generate after another request replenishes the pool, and oversized IDs are rejected. The full 14-test baseline plus new tests, type checking, production build, D1 migration syntax, Git diff checks, GitHub CI, Cloudflare Preview, and production read-only probes must pass before completion.
