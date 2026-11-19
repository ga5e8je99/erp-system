# Masar ERP (مسار) — Comprehensive Verification & Hardening Review

> **Document Version**: 2.0 (Post-Hardening Verification)  
> **Date**: November 2026  
> **Target Scope**: Phases 1 through 6 — Security, Authentication, Infrastructure, Performance, UI/UX, Automated Testing, and CI/CD  
> **Verification Status**: Verified by Passing Test Suites (`typecheck`, `lint`, `vitest`, `playwright`, `build`)  

---

## 1. Executive Summary

This document presents a transparent, evidence-based review of the hardening, security remediation, performance optimization, and quality assurance work completed across the **Masar ERP** codebase.

All claims in this report are grounded in and verified by automated checks executed in the local environment and CI pipeline:
- **TypeScript Typecheck (`npm run typecheck`)**: 0 errors (`tsc --noEmit`)
- **ESLint (`npm run lint`)**: 0 errors, 0 warnings (`eslint`)
- **Vitest Unit & Integration Tests (`npm test`)**: 20 test files, 111 tests passing (100%)
- **Playwright End-to-End & Accessibility Tests (`npm run test:e2e`)**: 43 tests passing across 13 suites, including automated `@axe-core/playwright` audits in Arabic & English across light & dark themes
- **Next.js Production Build (`npm run build`)**: 130 static and server-rendered routes built successfully with standalone output packaging
- **Dependency Audit (`npm audit --audit-level=high`)**: 0 high or critical severity vulnerabilities

---

## 2. Audit Findings & Implemented Fixes (Phases 1–6)

### 2.1 Security & Authentication (Phase 1)
- **Demo-Admin Backdoor Removed**:
  - *Finding*: `src/lib/auth.ts` contained a fallback in the database query `catch` block that granted an administrative session for `admin@masar.local` with a hardcoded password whenever PostgreSQL was unreachable.
  - *Fix*: Deleted the fallback backdoor entirely. On DB connection failure or query error, `authorizeUser` logs via Pino structured logger and returns `null`. Added a regression test (`auth-security.test.ts`) proving that login with old demo credentials while the DB is down returns `null`.
- **Demo Credentials Removed from Production UI**:
  - *Finding*: The login form displayed demo credentials and an auto-fill button unconditionally.
  - *Fix*: Gated the demo box in `login-form.tsx` to `process.env.NODE_ENV !== "production"`. Removed demo credential values from `messages/ar.json` and `messages/en.json`.
- **Cron Authentication Hardening**:
  - *Finding*: `/api/cron/notifications` accepted a weak query parameter (`?secret=masar_cron_secret`) and defaulted to a hardcoded secret when unconfigured.
  - *Fix*: Removed query-string secret support. Required `Authorization: Bearer <CRON_SECRET>` compared using constant-time `crypto.timingSafeEqual`. Enforced minimum 24-character length in production (`env.ts`). Added tests verifying rejection of missing, query-string, invalid, or unconfigured secrets.
- **Production Seeding Security**:
  - *Finding*: `prisma/seed.ts` defaulted initial admin password to a hardcoded string and logged it to stdout.
  - *Fix*: Removed hardcoded default in `prisma/seed-prod.ts`. Throws an error in production if `ADMIN_INITIAL_PASSWORD` is missing when creating the initial administrator. Passwords are never logged.
- **File Upload Protection & Storage Abstraction**:
  - *Finding*: `/api/uploads` accepted SVG files with naive regex scanning, vulnerable to stored XSS via XML/SVG scripting, and saved only to local disk.
  - *Fix*: Dropped SVG support entirely. Restricted uploads to PNG, JPEG, and WebP only. Verified genuine file types by inspecting magic bytes (`image-validation.ts`). Abstracted storage via `src/lib/storage.ts` to seamlessly use Vercel Blob (`@vercel/blob`) when `BLOB_READ_WRITE_TOKEN` is present, falling back to local disk in dev.

### 2.2 Configuration, Build & Infrastructure (Phase 3)
- **Build & Migration Decoupling**:
  - *Finding*: `package.json` ran `(prisma migrate deploy && tsx prisma/seed.ts || true)` inside the build script, swallowing migration failures and attempting to seed on every build.
  - *Fix*: Separated commands into `build` (`prisma generate && next build`), `db:deploy` (`prisma migrate deploy`), and `db:seed:prod` (`tsx prisma/seed-prod.ts` for essential COA, roles, and initial admin without mock transactions).
- **Content Security Policy (CSP)**:
  - *Finding*: CSP previously permitted `'unsafe-eval'` in production headers.
  - *Fix*: Updated `next.config.ts` to omit `'unsafe-eval'` in production builds, maintaining strict script and frame policies.
- **Health Check Endpoint Hardening**:
  - *Finding*: `/api/health` leaked environment, latency, and database error details publicly.
  - *Fix*: Public GET requests return only `{ status: "ok" | "unhealthy" }` (200 or 503). Detailed diagnostic telemetry is restricted to authenticated callers supplying `Authorization: Bearer <CRON_SECRET>`.
- **Production Hygiene**:
  - Made `/design-system` return `notFound()` in production.
  - Replaced all application `console.*` calls with structured Pino `logger`.
  - Added overrides in `package.json` (`postcss`, `deepmerge-ts`, `zod`) resolving all high-severity vulnerabilities without breaking major version upgrades.

### 2.3 Performance & Data Safety (Phase 4)
- **Bounded Database Queries**:
  - *Finding*: Over 40 `findMany` queries in API routes and feature queries loaded unbounded datasets without `take` or `skip`.
  - *Fix*: Bounded all search and combobox endpoints to `take: 20–50`. Paginated list views and aggregated report queries directly in SQL.
- **Pagination Parameter Clamping**:
  - *Fix*: Implemented `clampPagination` in `src/lib/pagination.ts`. Enforced server-side clamping: `page >= 1` (integer) and `pageSize` restricted strictly to `{10, 20, 50, 100}`.
- **Composite Indexes & Performance**:
  - *Fix*: Generated and applied migration `20261119171959_add_performance_indexes`, indexing document status, transaction dates, foreign keys, and soft-delete columns (`deletedAt`).
- **Transactional Integrity & Concurrency**:
  - *Fix*: Verified that all multi-step workflows (invoice issuance, payments, returns, goods receipts, journal postings) run inside single interactive `$transaction` blocks. Added atomic stock deductions and verified that concurrent requests cannot drive stock negative when `allowNegativeStock = false` (`concurrent-stock.test.ts`).

### 2.4 UI/UX & Accessibility (Phase 5)
- **Login Improvements**: Added password visibility toggle, accessible labels, specific error messages for rate limiting and credentials, and dynamic copyright/version footer.
- **i18n Parity**: Enforced 100% key parity between `messages/ar.json` and `messages/en.json` via automated recursive testing (`i18n-keys.test.ts`).
- **Responsive Tables**: Added mobile horizontal scroll affordances and solid sticky first columns across small and large viewports.
- **Unsaved Changes & Confirmations**: Added dirty-state confirmation guards on form dismissal and loading states on destructive actions.
- **Automated Axe Accessibility**: Integrated `@axe-core/playwright` in `e2e/accessibility-axe.spec.ts`. Fixed contrast ratios and discernible button labels, passing 12/12 audits across Arabic/English and light/dark themes.

### 2.5 Tests, CI & Documentation (Phase 6)
- **Automated Test Coverage**: Added tests for rate limiting (`rate-limit.test.ts`), pagination clamping (`pagination.test.ts`), and RBAC name-bypass prevention (`rbac.test.ts`).
- **CI Pipeline (`.github/workflows/ci.yml`)**: Configured automated GitHub Actions workflow running `npm audit --audit-level=high`, TypeScript typecheck, ESLint, i18n key parity, Vitest suite, and Playwright E2E with containerized PostgreSQL and dependency caching.

---

## 3. What Remains & Known Risks

1. **Distributed Rate Limiting Across Serverless Functions**:
   - *Current Implementation*: Sliding-window in-memory rate limiting (`checkRateLimit`) supplemented by database queries against `AuditLog` (`checkDbRateLimit`).
   - *Risk*: On multi-instance serverless deployments (such as Vercel Functions across diverse regions), in-memory counters are per-instance. For high-volume multi-region setups, connecting an Upstash Redis store will provide unified, sub-millisecond rate limiting.
2. **Stock Quantity Fractional Precision**:
   - *Current Implementation*: Product and stock movement quantities use `Decimal(15,2)` (2 decimal places).
   - *Risk*: Suitable for unit-based products and standard trading. If the business introduces bulk commodities sold by fractional kilograms or grams (e.g. 0.005 kg), a database migration to `Decimal(15,3)` or `Decimal(15,4)` should be planned.
3. **Transitive Development Dependency (`minimatch`)**:
   - *Current Status*: `minimatch` has a moderate-severity advisory inside `@typescript-eslint` and `shadcn` CLI tooling. It does not affect production runtime bundles, but upgrading `shadcn` to a future non-beta major version will resolve it.

---

## 4. Pre-Launch Operational Checklist

Before opening the application to production users, perform the following manual steps:

- [ ] **1. Set Production Environment Variables on Vercel / VPS**:
  - `DATABASE_URL`: Pooled PostgreSQL connection string.
  - `AUTH_SECRET`: Random 32+ character secret generated via `openssl rand -base64 32`.
  - `AUTH_TRUST_HOST`: Set to `"true"` behind reverse proxies or Vercel.
  - `CRON_SECRET`: Random 24+ character secret generated via `openssl rand -hex 24`.
  - `BLOB_READ_WRITE_TOKEN`: Token from attached Vercel Blob store (for cloud file uploads).
  - `ADMIN_INITIAL_PASSWORD`: Strong, unique password for initial admin user creation.
  - `NEXT_PUBLIC_APP_URL`: Canonical production domain (e.g. `https://erp.yourcompany.com`).
  - `SEED_DEMO_DATA`: Set to `"false"`.
- [ ] **2. Execute Database Migration & Essential Seed**:
  Run in deployment pipeline or deployment container:
  ```bash
  npm run db:deploy
  npm run db:seed:prod
  ```
- [ ] **3. Rotate Initial Administrator Password**:
  After initial deployment, log in as `admin@masar.local` and immediately update the administrator password in Company Settings / Users.
- [ ] **4. Configure Periodic Cron Trigger**:
  Ensure `/api/cron/notifications` is invoked hourly with `Authorization: Bearer <CRON_SECRET>` via Vercel Cron or crontab.
- [ ] **5. Git History Hygiene**:
  Ensure local notes or prompt archives (e.g. `erp-antigravity-prompts.md`, now in `.gitignore`) are purged from git history if any private keys or connection strings were ever committed.
