# Hardening, Security, Data Integrity, and Quality Review (Masar ERP)

> **Document Version**: 1.0  
> **Date**: November 2026  
> **Target Scope**: Enterprise Review Pass — Security, Concurrency, Performance, Testing, Accessibility & RTL  
> **Status**: Completed & Verified  

---

## 1. Executive Summary

This document details the comprehensive hardening and verification pass conducted across the entire **Masar ERP** codebase. The review systematically audited all server actions, API routes, database queries, file uploads, transactional operations, UI accessibility, and automated test coverage.

### Key Metrics
- **TypeScript Typecheck**: 0 errors (`tsc --noEmit`)
- **ESLint**: 0 errors, 0 warnings (`eslint`)
- **Vitest Unit & Integration Tests**: 61 / 61 tests passing (100%)
- **Playwright E2E Tests**: 31 / 31 tests passing (100%) across 12 test suites
- **Next.js Production Build**: 130 static and server-rendered pages built successfully with 0 errors

---

## 2. Security Audit & Findings

### 2.1 Server Action Authorization Audit
- **Audit Target**: All 31 files containing Server Actions (`"use server"`) in `src/features/**/actions/*.ts`.
- **Finding**: 30 files previously enforced `requirePermission(...)`. In `src/features/notifications/actions/notification-actions.ts`, user actions relied on session ID without explicit authentication assertions, and `triggerSystemNotificationScanAction` lacked RBAC authorization.
- **Fix Applied**:
  - Implemented explicit session ID validation (`UNAUTHORIZED`) across all notification mutations (`fetchNotificationsAction`, `markNotificationReadAction`, `markAllNotificationsReadAction`, `deleteNotificationAction`).
  - Restricted `triggerSystemNotificationScanAction` with `await requirePermission("company.settings.manage")`.
  - Re-verified all 31 action files with automated AST/regex analysis: 100% of exported server actions are protected by `requirePermission` or authenticated session guards.

### 2.2 Route Handlers & Combobox Search Endpoints
- **Audit Target**: `src/app/api/**/route.ts`.
- **Finding**: Autocomplete search endpoints (`/api/sales/customers/search`, `/api/inventory/products/search`, `/api/purchasing/suppliers/search`, and `/api/inventory/warehouses`) checked for `session?.user` but lacked granular permission checks, allowing any authenticated user to probe internal catalog and customer records.
- **Fix Applied**:
  - `/api/sales/customers/search`: Enforced `hasPermission` for `sales.customer.view`, `sales.customer.manage`, or sales transaction creation permissions.
  - `/api/purchasing/suppliers/search`: Enforced `hasPermission` for `purchasing.supplier.view`, `purchasing.supplier.manage`, or PO creation permissions.
  - `/api/inventory/products/search`: Enforced `hasPermission` for `inventory.product.view`, `inventory.product.create`, or document line item permissions.
  - `/api/inventory/warehouses`: Enforced `hasPermission` for `inventory.warehouse.manage`, `inventory.product.view`, or stock adjustment permissions.
  - `/api/cron/notifications`: Protected background cron triggers with `CRON_SECRET` validation (supporting both `Authorization: Bearer <token>` and query parameter fallback for dev).

### 2.3 HTTP Security Headers
- **Audit Target**: `next.config.ts`.
- **Finding**: Previously, no platform security headers were defined.
- **Fix Applied**: Added production-grade HTTP security headers applied across all routes (`/:path*`):
  - `Content-Security-Policy`:
    ```
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: blob:;
    font-src 'self' data:;
    connect-src 'self';
    frame-ancestors 'none';
    form-action 'self';
    base-uri 'self';
    object-src 'none';
    ```
  - `X-Frame-Options`: `DENY` (prevents clickjacking attacks).
  - `X-Content-Type-Options`: `nosniff` (mitigates MIME-confusion attacks).
  - `Referrer-Policy`: `strict-origin-when-cross-origin`.
  - `Permissions-Policy`: `camera=(), microphone=(), geolocation=()`.
  - `Strict-Transport-Security`: `max-age=63072000; includeSubDomains; preload` (enforces HTTPS).
  - `X-DNS-Prefetch-Control`: `on`.

### 2.4 File Upload Sanitization
- **Audit Target**: `src/app/api/uploads/route.ts`.
- **Finding**: File extension was derived from user-supplied `file.name`, and SVG files were accepted without scanning for embedded scripts.
- **Fix Applied**:
  - **MIME Whitelist & Extension Derivation**: Strict mapping `MIME_TO_EXT` (`image/png` -> `.png`, `image/jpeg` -> `.jpg`, `image/webp` -> `.webp`, `image/svg+xml` -> `.svg`). The saved file extension is strictly derived from the validated MIME type, eliminating file extension spoofing (e.g. uploading `.php` or `.html` disguised as an image).
  - **SVG Script & XSS Protection**: Injected content checks scanning for `<script`, `javascript:`, `data:text/html`, `<iframe`, `<embed`, `<object`, `<foreignObject`, and DOM event handlers (`onload=`, `onerror=`, `onclick=`, `onmouseover=`, `onfocus=`).
  - **CSRF Origin Verification**: Inspects `Origin` and `Host` request headers to ensure upload requests originate from the application domain.

### 2.5 SQL Injection & Secret Leakage Verification
- **Prisma Raw SQL Audit**: Verified using codebase search; zero raw SQL queries (`$queryRaw`, `$queryRawUnsafe`, `$executeRawUnsafe`) exist in application code. All database queries use Prisma's strongly typed query engine, guaranteeing full parameterization.
- **Client Bundle Audit**: Scanned all client components (`"use client"`). Confirmed that no private server environment variables (`DATABASE_URL`, `AUTH_SECRET`, `CRON_SECRET`) are imported or exposed. The only `process.env` references in client code are build-time flags (`process.env.NODE_ENV === "development"`).

---

## 3. Data Integrity & Concurrency Architecture

### 3.1 Transactional Operations
All multi-table business mutations are strictly executed inside Prisma interactive transactions (`db.$transaction(async (tx) => { ... })`):
1. **Sales Invoicing (`issueSalesInvoiceTransaction`)**:
   - Status transition guard: checks `invoice.status === DRAFT`.
   - Sequential document number increment via atomic `documentSequence.upsert({ update: { nextNumber: { increment: 1 } } })`.
   - Atomic Stock Movement `OUT` generation with negative stock verification.
   - Customer balance increment.
   - Double-entry Journal Entry posting (Dr Accounts Receivable, Cr Sales Revenue, Cr Tax Payable, Dr COGS, Cr Inventory).
2. **Customer Payment Collection (`recordCustomerPaymentTransaction`)**:
   - Customer payment record creation.
   - Invoice `paidAmount` update and status transition (`PARTIALLY_PAID` or `PAID`).
   - Customer balance decrement.
   - Journal entry posting (Dr Cash/Bank, Cr Accounts Receivable).
3. **Goods Receipt (`receiveGoodsTransaction`)**:
   - Goods receipt record creation.
   - Product Weighted Average Cost (WAC) recalculation.
   - Atomic Stock Movement `IN` generation.
   - PO status update (`PARTIALLY_RECEIVED` or `RECEIVED`).
4. **Stock Transfer (`executeStockTransfer`)**:
   - Atomic creation of both `TRANSFER_OUT` and `TRANSFER_IN` movements in a single transaction.
5. **Stock Adjustment (`executeStockAdjustment`)**:
   - Atomic batch delta calculations and movement logging.
6. **Payroll Approval (`approvePayrollRunAction`)**:
   - Status transition guard (`status === DRAFT -> APPROVED`).
   - Automatic GL posting (Dr Salaries Expense, Cr Salaries Payable).

### 3.2 Double-Submission & State Machine Guards
- UI buttons are disabled during active Server Action mutation (`disabled={isSubmitting || isPending}`).
- Server-side status checks verify document state before executing actions (e.g. only `DRAFT` invoices can be issued; only `ISSUED` or `PARTIALLY_PAID` invoices can receive payments; only un-posted journal entries can be posted).
- Concurrency collisions fail gracefully with typed error responses rather than corrupting financial or inventory balances.

---

## 4. Performance & Database Optimization

### 4.1 Database Indexing Additions
Added composite and filtered PostgreSQL indexes in `prisma/schema.prisma` targeting high-frequency operational queries:
- **`StockMovement`**:
  - `@@index([productId, warehouseId])` (optimizes product warehouse ledger lookups).
  - `@@index([warehouseId, createdAt])` (optimizes warehouse chronological ledger streams).
- **`SalesInvoice`**:
  - `@@index([customerId, status])` (optimizes customer statement and balance queries).
  - `@@index([status, dueDate])` (optimizes aging analysis and overdue dashboard widgets).
  - `@@index([status, issueDate])` (optimizes fiscal report date filtering).
- **`PurchaseInvoice`**:
  - `@@index([supplierId, status])` (optimizes supplier statement queries).
  - `@@index([status, dueDate])` (optimizes accounts payable aging).
  - `@@index([status, issueDate])` (optimizes purchase reports).
- **`SalesOrder` & `PurchaseOrder`**:
  - `@@index([customerId, status])` and `@@index([supplierId, status])`.
- **Soft-Delete Indexes**:
  - `Product`: `@@index([deletedAt])` and `@@index([categoryId, deletedAt])`.
  - `Customer`: `@@index([deletedAt])`.
  - `Supplier`: `@@index([deletedAt])`.
  - `Account`: `@@index([deletedAt])`.
  - `Employee`: `@@index([deletedAt])` and `@@index([departmentId, status])`.
- **`JournalEntry`**:
  - `@@index([status, date])` (optimizes General Ledger and Trial Balance date queries).
- **`AuditLog`**:
  - `@@index([entity, createdAt])` (optimizes audit trail searches by entity type and date range).

### 4.2 Query Payload Trimming & Pagination
- All primary entity listings implement cursor/offset pagination (`take` and `skip`).
- Auxiliary lookup queries (e.g. `getPaymentAccounts`) use Prisma `select` projections to fetch only necessary columns (`id`, `code`, `name`), avoiding unnecessary memory overhead.

---

## 5. Automated Testing & Verification

### 5.1 Vitest Unit & Integration Suites (61 Tests Passing)
- `src/lib/__tests__/money.test.ts`: Floating-point safety, minor unit conversions, Arabic-Indic vs. Western digits formatting.
- `src/lib/__tests__/rbac.test.ts`: Admin bypass, wildcard permissions, permission key matching, `ForbiddenError`.
- `src/lib/__tests__/sequence.test.ts`: Sequential document numbering and padding.
- `src/features/inventory/services/__tests__/stock-movement.test.ts`: Negative stock checks, atomic ledger transactions, transfer pairing.
- `src/features/purchasing/services/__tests__/purchasing-calculations.test.ts`: WAC recalculation, PO receipt status transitions.
- `src/features/purchasing/services/__tests__/purchasing-service.test.ts`: Goods receipt transactions, inventory movements.
- `src/features/sales/services/__tests__/sales.test.ts`: Order/invoice calculations, credit limit enforcement, payment allocations.
- `src/features/accounting/services/__tests__/accounting-lifecycle.test.ts`: Proves books balance across complete cycle (`purchase -> pay -> return -> sell -> collect -> return -> void`).
- `src/features/hr/services/__tests__/payroll-calculation.test.ts`: Allowances, absence deductions, net salary rules.

### 5.2 Playwright End-to-End Suites (31 Tests Passing across 12 Suites)
1. `e2e/critical-flow.spec.ts`: **The Complete Business Lifecycle Test**:
   - Admin authentication.
   - Product master creation (`/ar/inventory/products`).
   - Supplier creation and Goods Receipt receipt (`receiveGoodsTransaction` -> 100 units deposited in `WH-MAIN`).
   - Verification that `/ar/inventory/stock` displays 100 units.
   - Customer master creation (`/ar/sales/customers`).
   - Sales Invoice creation and issue (`issueSalesInvoiceTransaction` -> 10 units sold @ 250 EGP + 14% VAT = 2,850 EGP).
   - Verification that stock in `/ar/inventory/stock` decreased from 100 to 90 units.
   - Payment collection (`recordCustomerPaymentTransaction` -> 2,850 EGP).
   - Verification that invoice status becomes `PAID` in `/ar/sales/invoices`.
   - Verification that `/ar/dashboard` renders updated KPI cards and invoice feed.
   - Verification that `/ar/accounting/reports/trial-balance` renders with green balanced banner ("ميزان المراجعة متزن تماماً") and total debits match total credits.
2. `e2e/accessibility-rtl.spec.ts`: **20 Tests auditing 10 key pages**:
   - Audits `/login`, `/dashboard`, `/inventory/products`, `/sales/invoices`, `/purchasing/orders`, `/accounting/journal`, `/accounting/reports/trial-balance`, `/hr/employees`, `/reports`, and `/settings` in both Arabic (`/ar`, RTL) and English (`/en`, LTR).
   - Verifies `dir="rtl"` / `dir="ltr"` HTML attributes, zero horizontal viewport overflow, and accessible element labeling.
3. `e2e/dashboard-reports.spec.ts`: Dashboard widgets, date filtering, reports gallery, CSV export, in-app notifications, and background cron route handler.
4. `e2e/settings-audit.spec.ts`: All 9 settings tabs, file upload API, audit log diff dialog, and keyboard shortcuts (`N`, `/`).
5. `e2e/auth.spec.ts`, `e2e/app-shell.spec.ts`, `e2e/home.spec.ts`, `e2e/inventory.spec.ts`, `e2e/sales.spec.ts`, `e2e/purchasing.spec.ts`, `e2e/accounting.spec.ts`, `e2e/hr.spec.ts`.

---

## 6. Accessibility & RTL Audit Findings

| Page Route | RTL Direction (`dir="rtl"`) | LTR Direction (`dir="ltr"`) | Responsive Layout (No Horizontal Overflow) | Accessible Buttons / Inputs |
| :--- | :---: | :---: | :---: | :---: |
| `/login` | Pass | Pass | Pass | Pass |
| `/dashboard` | Pass | Pass | Pass | Pass |
| `/inventory/products` | Pass | Pass | Pass | Pass |
| `/sales/invoices` | Pass | Pass | Pass | Pass |
| `/purchasing/orders` | Pass | Pass | Pass | Pass |
| `/accounting/journal` | Pass | Pass | Pass | Pass |
| `/accounting/reports/trial-balance` | Pass | Pass | Pass | Pass |
| `/hr/employees` | Pass | Pass | Pass | Pass |
| `/reports` | Pass | Pass | Pass | Pass |
| `/settings` | Pass | Pass | Pass | Pass |

### Observations:
- RTL text alignments correctly adjust when switching between Arabic and English without visual overlapping or mirrored icon defects.
- Tabular numbers (`font-variant-numeric: tabular-nums`) maintain column alignment in both LTR and RTL orientations.
- Form controls throughout dialogs have corresponding labels or ARIA descriptions.

---

## 7. Known Issues & Operational Recommendations

1. **Local File Storage vs. Cloud Object Storage**:
   - Company logos are currently stored under `public/uploads/` on the local filesystem. For multi-instance clustered or serverless production deployments (e.g. containerized environments with read-only root filesystems), configure an S3/GCS bucket adapter or Cloudflare R2 storage provider.
2. **In-Memory Rate Limiting**:
   - Auth login rate-limiting currently uses an in-memory sliding window store. For multi-replica deployments behind a load balancer, connect a shared Redis or Upstash instance to share login attempt counters across instances.
3. **Database Migration Pipeline**:
   - Schema modifications were verified using `npx prisma db push`. In team production deployments, run `npx prisma migrate dev --name <migration-name>` to generate migration SQL scripts for audit tracking.

---
*End of Hardening & Review Report.*
