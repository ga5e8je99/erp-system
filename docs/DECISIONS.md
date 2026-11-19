# Architectural Decision Records (ADRs)

## ADR 001: Selection of Next.js 15 and App Router
- **Status:** Accepted
- **Context:** Masar ERP requires server-rendered performance, streaming, robust Server Actions for mutations, and tight TypeScript integration.
- **Decision:** Use Next.js 15 (App Router) in TypeScript strict mode with React 19.

## ADR 002: Database & ORM Strategy (PostgreSQL 16 + Prisma 6)
- **Status:** Accepted
- **Context:** The system needs strong relational integrity, ACID transactions for accounting/inventory, and type-safe database queries.
- **Decision:** Use PostgreSQL 16 managed via Docker Compose for development, with Prisma ORM 6.19.3 pinned for standard URL-based schema configurations and full client compatibility.

## ADR 003: Internationalization (next-intl) & RTL First
- **Status:** Accepted
- **Context:** The primary market operates in Arabic (RTL), but full English (LTR) support is required.
- **Decision:** Use `next-intl` with locales `["ar", "en"]` and default `ar`. All routes are grouped under `app/[locale]`. Text alignment and layout rely on CSS logical properties (`ms-`, `me-`, `ps-`, `pe-`, `text-start`).

## ADR 004: Font Application by Locale
- **Status:** Accepted
- **Context:** Arabic typography requires a modern Naskh-style font (Cairo), while English UI requires a clean sans-serif (Inter).
- **Decision:** Load `Cairo` and `Inter` via `next/font/google` with CSS variables. Apply `Cairo` as the active font class when `locale === 'ar'`, and `Inter` when `locale === 'en'`.

## ADR 005: Money Handling in Minor Units
- **Status:** Accepted
- **Context:** Financial math in trading systems cannot tolerate JavaScript IEEE-754 floating point rounding errors.
- **Decision:** Financial calculations and database values use integer minor units (or Prisma Decimal). Created `lib/money.ts` to convert between major and minor units and format currency using `Intl.NumberFormat`.

## ADR 006: UI Primitive Architecture (shadcn/ui + Radix Slot)
- **Status:** Accepted
- **Context:** The system needs 25+ accessible UI primitives that support RTL layouts and consistent design tokens.
- **Decision:** Scaffolded shadcn/ui with `@radix-ui/react-slot` support for `asChild` composition, native form integration with `react-hook-form`, and full Lucide icon library support.

## ADR 007: Relational Schema & Domain Modeling
- **Status:** Accepted
- **Context:** An ERP needs rigorous referential integrity across sales, purchasing, inventory, general ledger, and human resources.
- **Decision:** Implemented a unified Prisma schema across 6 domains. Every business entity features CUID primary keys, audit timestamps, and soft deletion (`deletedAt`). Enums are enforced at the database level for lifecycle states.

## ADR 008: Atomic Document Numbering (DocumentSequence)
- **Status:** Accepted
- **Context:** Trading systems require gapless, predictable document identifiers (e.g. `INV-2026-00001`, `SO-2026-00001`) that avoid race conditions under concurrent requests.
- **Decision:** Created a `DocumentSequence` model tracking sequences by `(type, year)` and implemented `getNextDocumentNumber()` in `src/lib/sequence.ts` running inside database transactions using atomic upsert/increment.

## ADR 009: Strict Financial Foreign Key Constraints
- **Status:** Accepted
- **Context:** Accidental deletions of customers, suppliers, accounts, or items can corrupt accounting ledgers and historic invoice records.
- **Decision:** Enforced `onDelete: Restrict` on all financial document associations (Customer, Supplier, Account, Product, User). Only direct sub-items (e.g. `SalesInvoiceItem`, `JournalLine`) cascade-delete with their parent document.

## ADR 010: NextAuth v5 Credentials Provider, JWT Strategy, and Sliding-Window Rate Limiting
- **Status:** Accepted
- **Context:** Masar ERP requires email + password authentication, granular role-based permissions (`module.resource.action`), audit trails on security events, and brute-force protection without external dependencies like Redis.
- **Decision:** Use Auth.js (NextAuth v5) with a Credentials provider, bcrypt password verification, and JWT session strategy embedding `userId`, `role`, `permissions[]`, and `locale`. Implement an in-memory sliding window rate limiter (`lib/rate-limit.ts`) allowing 5 attempts per 15 minutes, with audit logging on both success, failure, and rate limits. Enable `trustHost: true` for container and custom proxy deployments.

## ADR 011: Hybrid Middleware-Layout Authorization & Localization
- **Status:** Accepted
- **Context:** Route protection must coexist with `next-intl` multi-locale routing (`/[locale]/...`). However, Next.js Edge Middleware cannot run native Node.js cryptographic and ORM packages (e.g., bcrypt, Prisma).
- **Decision:** Implement a layered security model:
  1. `middleware.ts` runs on the edge to handle `next-intl` locale negotiation and verifies session cookie presence on `/(dashboard)` paths, redirecting unauthenticated requests to `/${locale}/login?callbackUrl=...`.
  2. `src/app/[locale]/(dashboard)/layout.tsx` runs on Node runtime, validates cryptographic JWT session via `auth()`, and verifies account active status.
  3. Individual domain pages and Server Actions enforce granular permissions via `requirePermission(key)`.

## ADR 012: Visual Language, Theme Tokens & Typography (Deep Teal Accent #0F766E)
- **Status:** Accepted
- **Context:** Enterprise ERP users need a focused, data-dense, breathable interface that avoids visual fatigue.
- **Decision:** Selected a neutral slate/zinc base paired with a singular brand accent—deep teal `#0F766E` (`oklch(0.484 0.106 189.5)` in light mode, `oklch(0.68 0.13 186)` in dark mode). Established standard 10px radiuses (`0.625rem`), 8px spacing rhythm, subtle 1px borders, and mandatory `tabular-nums` for all financial figures. Semantic status tokens (success: emerald, warning: amber, danger: rose, info: sky) are defined as CSS variables and mapped via Tailwind. Integrated `next-themes` with a light/dark/system toggle.

## ADR 013: App Shell Navigation, Command Palette, and Collapsible Sidebar
- **Status:** Accepted
- **Context:** Navigation across complex modules (Inventory, Sales, Purchasing, Accounting, HR, Administration) must be keyboard-accessible, permission-aware, and responsive.
- **Decision:** Implemented a unified App Shell composed of:
  1. Collapsible sidebar storing collapsed state in cookies, grouping items by business domain, and dynamically filtering items by session permissions. Collapses into a mobile sheet on screens under 768px.
  2. Top bar providing breadcrumbs, global Command Palette (Cmd/Ctrl+K), language switcher (Arabic/English with query param preservation), theme toggle, notifications dropdown, and user menu.
  3. Development-only access to `/design-system` gallery for visual audit.

## ADR 014: Shared Financial & Data Grid Primitives (DataTable & LineItemsEditor)
- **Status:** Accepted
- **Context:** Business documents require consistent data tables with server filtering/sorting and interactive line-item editors that prevent JavaScript floating-point errors.
- **Decision:** Built reusable primitives in `src/components/shared/`:
  1. `DataTable` powered by `@tanstack/react-table` v8 with URL-synchronized pagination/sorting/filtering, column visibility toggles, row selection, bulk actions slot, loading skeleton, and CSV export with UTF-8 BOM (`\uFEFF`) for Arabic Excel compatibility.
  2. `CurrencyInput` and `LineItemsEditor` operating strictly in integer minor units (or Prisma Decimal) via `lib/money.ts`, providing real-time calculation of subtotals, VAT tax, discounts, and grand totals.

## ADR 015: Inventory Stock Ledger Architecture & Negative Stock Controls
- **Status:** Accepted
- **Context:** Accurate inventory levels require strict prevention of race conditions, auditability of all inventory modifications, and adherence to company policies regarding negative stock.
- **Decision:** Direct mutation of `StockLevel` is forbidden. All stock adjustments, receipts, transfers, and issues must be recorded as immutable `StockMovement` rows within a Prisma transaction that recalculates and updates the corresponding `StockLevel.quantity`. Negative stock validation is enforced unless explicitly permitted in `CompanySettings.allowNegativeStock`.

## ADR 016: Sales Invoice Sequence, Immutability & Double-Entry Accounting Posting
- **Status:** Accepted
- **Context:** Sales transactions require atomic sequence generation, immutable posted invoices, inventory deduction, and instant double-entry general ledger synchronization.
- **Decision:** Issuing a `SalesInvoice` generates an atomic document number (`INV-YYYY-XXXXX`), locks the invoice state to `ISSUED`, deducts inventory via `StockMovement` (type `OUT`), increments customer balance, and automatically posts balanced journal lines:
  - Debit: Accounts Receivable (1130)
  - Credit: Sales Revenue (4110)
  - Credit: VAT Output Tax (2120)
  - Debit: Cost of Goods Sold (5110)
  - Credit: Inventory Asset (1140)
  Voiding or returning an invoice creates reversing journal entries rather than hard deletion.

## ADR 017: Purchasing Weighted Average Cost (WAC) & Goods Receipt Synchronization
- **Status:** Accepted
- **Context:** Inward purchasing goods receipts must update physical inventory levels, recalculate product cost price dynamically using Weighted Average Cost, and update PO status progressively (`DRAFT` → `SENT` → `PARTIALLY_RECEIVED` → `RECEIVED`).
- **Decision:** Inward receipts (`GoodsReceipt`) execute in a Prisma transaction that:
  1. Creates `StockMovement` (type `IN`) for each line item.
  2. Updates `StockLevel.quantity`.
  3. Recomputes product `costPrice` using the WAC formula:
     $$\text{New Cost} = \frac{(\text{Current Qty} \times \text{Current Cost}) + (\text{Received Qty} \times \text{Unit Cost})}{\text{Current Qty} + \text{Received Qty}}$$
  4. Dynamically evaluates total received quantities against the purchase order to transition status to `PARTIALLY_RECEIVED` or `RECEIVED`.
  5. Invoice posting automatically credits Accounts Payable (2110) and debits Inventory (1140) and Input Tax (2120).

## ADR 018: Centralized Posting Service & Double-Entry Financial Engine
- **Status:** Accepted
- **Context:** Financial transactions across Sales, Purchasing, Expenses, and manual Adjustments must guarantee that general ledger debits and credits strictly balance ($\sum \text{Debit} = \sum \text{Credit}$), closed fiscal periods are strictly respected, and default accounts (AR, AP, Revenue, COGS, Inventory, Tax, Cash, Bank) are centrally mapped and dynamically configurable.
- **Decision:** Implemented a unified posting architecture:
  1. `CompanySettings` maintains configurable foreign keys to `Account` (`arAccountId`, `apAccountId`, `salesAccountId`, `cogsAccountId`, `inventoryAccountId`, `taxAccountId`, `cashAccountId`, `bankAccountId`) with automated fallback to standard chart-of-accounts codes.
  2. `src/features/accounting/services/posting.ts` acts as the single point of truth for journal posting:
     - `assertFiscalPeriodOpen(tx, date)` checks that the posting date does not fall within any closed `FiscalPeriod` (`isClosed: true`).
     - `postJournalEntry(tx, payload)` validates that $\sum \text{Debit} = \sum \text{Credit}$, generates sequential `JRN-YYYY-XXXXX` numbers, records line items, and updates running balances on affected accounts.
     - `reverseJournalEntry(tx, entryId, userId, reason)` locks the original entry as `REVERSED` and atomically creates a mirrored balancing reversing entry with swapped debits and credits.
  3. Sales invoicing, customer payments, sales returns, invoice voids, purchase invoicing, supplier payments, purchase returns, and expense recordings are all routed exclusively through this centralized service.
  4. Real-time financial reports (Trial Balance, General Ledger, Income Statement / P&L, Balance Sheet, Customer/Supplier Aging, and VAT Tax Summary) derive calculations directly from posted ledger records with CSV (`\uFEFF` UTF-8 BOM) export and print styling.

## ADR 019: Human Resources Architecture, Salary Data Privacy & Automated Payroll Accounting Synchronization
- **Status:** Accepted
- **Context:** Managing human resources within Masar ERP requires:
  1. Organizational structure (Departments, Positions) and Employee lifecycle management (personal details, job classifications, compensation packages, system user links).
  2. Daily attendance sheets with bulk actions, manual time logging (check-in/check-out), and monthly calendar views.
  3. Leave management with customizable leave categories, annual allowances, running balance calculations, and multi-stage approval workflows.
  4. Monthly payroll processing that automatically computes base salary, allowances, and statutory/custom deductions (unexcused absences and late arrival penalties based on labor law standards).
  5. Accounting integration: Payroll approval and disbursement must automatically generate and post balanced double-entry journal entries into the general ledger.
  6. Salary privacy: Compensation details must be strictly protected against unauthorized internal exposure across both server and client layers.
  7. RTL UI ergonomics: The application shell sidebar must dynamically align to the layout direction so that primary action buttons remain un-obscured in Arabic mode.
- **Decision:** Implemented a unified, secure HR architecture:
  1. **Organizational Hierarchy & Employee Records**: Built `Department`, `Position`, and `Employee` models with CUID primary keys, sequential code generation (`EMP-001`), soft deletion (`deletedAt`), and optional 1:1 linkage to `User` for employee self-service capabilities.
  2. **Attendance Management**: Daily attendance tracking with bulk status updates (`PRESENT`, `ABSENT`, `LATE`, `LEAVE`) and normalized UTC dates (`00:00:00.000Z`) to prevent timezone drift across client-server boundaries. Check-in and check-out times are stored in 24-hour format with automated status derivation.
  3. **Leave Tracking & Balance Computation**: Configured `LeaveType` with annual entitlement quotas and `LeaveRequest` with status transitions (`PENDING` → `APPROVED` / `REJECTED`). Running balance is calculated dynamically:
     $$\text{Remaining Balance} = \text{Annual Allowance} - \sum \text{Approved Leave Days (Current Year)}$$
  4. **Configurable Payroll Engine**: Calculated on standard 30-day labor law baseline:
     $$\text{Daily Rate} = \frac{\text{Base Salary}}{30}$$
     $$\text{Absence Deduction} = \text{Absent Days} \times \text{Daily Rate} \times \text{Absence Penalty Multiplier}$$
     $$\text{Late Deduction} = \text{Late Days} \times \text{Daily Rate} \times \text{Late Penalty Multiplier}$$
     $$\text{Net Salary} = \text{Base Salary} + \text{Allowances} - \text{Deductions}$$
     Configured `salaryExpenseAccountId` (default 6100 - Salaries Expense), `salaryPayableAccountId` (default 2130 - Salaries Payable), `absenceDeductionRate` (default 1.0x), and `lateDeductionRate` (default 0.25x) in `CompanySettings`.
  5. **Automated Double-Entry Posting**:
     - On Payroll Run **Approve** (`DRAFT` → `APPROVED`): Automatically calls `features/accounting/services/posting.ts` to post:
       - Debit: Salaries Expense (6100)
       - Credit: Salaries Payable (2130)
     - On Payroll Run **Mark Paid** (`APPROVED` → `PAID`): Automatically calls `posting.ts` to post:
       - Debit: Salaries Payable (2130)
       - Credit: Cash on Hand (1110) or Bank (1120)
  6. **Salary Data Masking & RBAC**: Introduced `hr.salary.view` permission. All salary figures across employee listings, detail cards, payroll runs, and payslips are conditionally rendered: authorized users view formatted amounts, while unauthorized users view masked placeholders (`••••••`). Server Actions and queries strip or mask sensitive compensation data when the caller lacks `hr.salary.view`.
  7. **RTL-Native Sidebar Positioning**: Updated `<AppSidebar>` to dynamically configure `side={locale === "ar" ? "right" : "left"}`, anchoring the sidebar to the right viewport edge in Arabic RTL mode and preserving accessible pointer interaction for left-aligned toolbar actions.

## ADR 020: Executive Dashboard, Cross-Module Reports Center & Automated Notification Engine
- **Status:** Accepted
- **Context:** Managing a growing enterprise requires:
  1. A centralized real-time dashboard consolidating KPIs and trends across Sales, Purchasing, General Ledger, Inventory, and HR without module coupling or permission leakage.
  2. Sub-second initial response times using streaming server rendering and fallback skeletons.
  3. A dedicated Reports Center providing drill-down operational reports with date filters, sticky grand totals, Excel-friendly UTF-8 BOM CSV exports, and printable A4 layouts.
  4. Proactive alerting for critical business events (stock below safety reorder thresholds, customer invoices past due dates, pending employee leave requests).
- **Decision:** Implemented a unified executive reporting and notification system:
  1. **Permission-Aware Dashboard (`/[locale]/dashboard`)**:
     - Built streaming architecture with React Suspense and `<DashboardSkeleton>` for instantaneous page loads.
     - Implemented permission guards on every widget:
       - Sales KPIs, Sales vs Purchases comparison, Top 5 Products, Category Donut, Recent Invoices, and Overdue Invoices are gated by `sales.invoice.view`.
       - Payables KPI and vendor purchasing trends are gated by `purchasing.invoice.view`.
       - Cash & Bank balance and Cash Flow Trend area chart are gated by `accounting.account.view`.
       - Low-Stock KPI and alerts table are gated by `inventory.product.view`.
       - Pending Leave Requests table is gated by `hr.leave.manage`.
     - Integrated a URL-synchronized Date Range Filter supporting quick presets (`today`, `month`, `last_month`, `quarter`, `year`) and custom calendar pickers.
  2. **Cross-Module Reports Center (`/[locale]/reports`)**:
     - Hub gallery categorizing reports across 6 domains (Sales, Purchasing, Inventory, Profitability, Financial, HR).
     - Built 8 specialized operational report views:
       - **Sales by Customer**: Customer sales volume, invoice counts, payments, and receivables balance.
       - **Sales by Product**: Units sold per item, revenue generated, and average unit price.
       - **Sales by Salesperson**: Rep performance, invoices issued, and revenue attribution.
       - **Purchases by Supplier**: Supplier order volume, billed amounts, payments, and payables balance.
       - **Inventory Valuation (WAC)**: On-hand stock quantity valued at Weighted Average Cost.
       - **Stock Movement Summary**: Opening balance, inward receipts, outbound issues, physical adjustments, and closing balance.
       - **Profit by Product**: Sales revenue vs COGS, computing gross profit and margin percentages.
       - **HR Attendance Summary**: Workforce working days, present, absences, late arrivals, leaves, and overall adherence rate %.
     - Unified `ReportShell` component handling date filtering, sticky Grand Totals rows, UTF-8 BOM (`\uFEFF`) CSV exports, and print layouts (`@media print`).
  3. **Notification Engine & Cron Architecture (`/api/cron/notifications`)**:
     - Added `Notification` model with `NotificationType` enum (`LOW_STOCK`, `OVERDUE_INVOICE`, `LEAVE_REQUEST`, `APPROVAL`, `INFO`, `WARNING`, `SUCCESS`, `ERROR`).
     - Connected live `NotificationsBell` in top navigation with unread count badge and quick mark-read actions.
     - Created full `/notifications` dashboard with type filtering tabs and manual scan triggers.
     - Built authenticated cron job route handler (`/api/cron/notifications`) protected by `CRON_SECRET` with 24-hour throttling to prevent alert spamming. Documented in `docs/CRON.md`.
  4. **Sequential Integration Test Execution**:
     - Configured `fileParallelism: false` in `vitest.config.mts` to prevent cross-test transaction collisions in database integration test suites.


## ADR 021: Enterprise Settings, System Auditing & Cross-Cutting Polish
- **Status:** Accepted
- **Context:** An enterprise ERP system requires configurable business policies, secure audit trails for regulatory compliance, and a cohesive user experience across all modules.
- **Decision:**
  1. **Enterprise Settings Architecture (`/[locale]/settings`)**:
     - Gated by permission `company.settings.manage`.
     - Organized into 9 dedicated tabs:
       - **Company Profile**: Legal identity, tax ID, commercial register, contact details, and secure logo upload to `/uploads` with strict MIME-type validation (PNG, JPEG, WebP, SVG) and 2MB limit.
       - **Currency & Formats**: Currency code, symbol, decimal places (0-4), and an optional Arabic-Indic numerals (`١، ٢، ٣`) toggle with live preview.
       - **Tax Rates**: Default VAT rate % and tax registration number.
       - **Document Numbering**: Configurable prefixes for 10 document types (`INV-`, `SO-`, `PO-`, `GR-`, `PAY-`, `JRN-`, `EXP-`, `RTN-`, `PRTN-`, `QUO-`).
       - **Account Mapping**: Default GL accounts for AR, AP, Sales, COGS, Inventory, Tax, Cash, Bank, Salaries Expense, and Salaries Payable.
       - **Inventory Rules**: Toggle for allowing negative stock, and inventory costing method selection (`WAC`, `FIFO`, `LIFO`).
       - **Sales Rules**: Customer credit limit behavior (`STRICT_BLOCK`, `WARN_ONLY`, `IGNORE`).
       - **Payroll Rules**: Multipliers for unauthorized absence deduction, tardiness hourly deduction, and overtime pay.
       - **Backup Guide**: Operational commands for compressed `pg_dump`, `gunzip` database restore, automated cron archiving to cloud storage, and RPO/RTO guidance.
     - Implemented `useUnsavedChanges` hook with dirty-state tracking, `beforeunload` warning, and top alert banner with discard/save actions.
  2. **Audit Log Viewer (`/[locale]/audit-logs`)**:
     - Gated by `auth.audit.view` and `auth.user.manage`.
     - Supports multi-criteria filtering: user, entity, action, date range, and free-text search.
     - Built `AuditDiffViewer` showing color-coded comparisons (Added = green, Removed = red, Modified = amber, Unchanged) plus formatted JSON tabs with copy-to-clipboard functionality.
  3. **Cross-Cutting UX Polish**:
     - **Global Error Boundaries & Not-Found Pages**: Implemented `src/app/[locale]/error.tsx` (with reset and reload actions), `src/app/[locale]/not-found.tsx`, and `src/app/not-found.tsx`.
     - **Route-Segment Loading Skeletons**: Created `loading.tsx` skeletons across all 9 route segments (`(dashboard)`, `inventory`, `sales`, `purchasing`, `accounting`, `hr`, `reports`, `settings`, `audit-logs`).
     - **Keyboard Shortcuts**: Added global shortcut listener (`/` to focus primary search input, `N` to trigger primary new/create actions on list pages).
     - **Optimistic UI**: Implemented immediate UI status toggling for users and products with automatic rollback on server error.
     - **Mobile Responsiveness**: Applied sticky first column pinning (`[&_th:first-child]:sticky [&_td:first-child]:sticky`) across all data tables for smooth horizontal scrolling on mobile and tablet displays.
     - **Locale Formatting**: Updated `src/lib/money.ts` to support Western Latin digits by default in Arabic mode, with optional Arabic-Indic numerals (`numberingSystem: "arab"`) driven by company settings.
