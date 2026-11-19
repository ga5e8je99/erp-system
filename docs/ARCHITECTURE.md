# Masar ERP — Architecture Guide

## Overview
Masar ERP is a multi-tenant-ready, full-stack enterprise resource planning system designed for small and medium trading and distribution businesses.

---

## 1. Directory Structure

```text
src/
├── app/
│   ├── [locale]/
│   │   ├── (auth)/             # Public auth pages
│   │   ├── (dashboard)/        # Protected ERP workspaces
│   │   ├── layout.tsx          # Localized root layout (html lang/dir, fonts)
│   │   └── page.tsx            # Root landing / dashboard redirect
│   ├── api/                    # Route handlers (reserved for webhooks & file streaming)
│   └── globals.css             # Theme variables and Tailwind directives
├── features/<module>/          # Modular business domains
│   ├── components/             # Domain-specific UI components
│   ├── actions/                # Server Actions (mutations)
│   ├── queries/                # Server-side data fetching functions
│   ├── schemas/                # Zod schemas shared between client and server
│   └── types/                  # TypeScript domain models and interfaces
├── components/
│   ├── ui/                     # shadcn/ui primitive components
│   └── shared/                 # Shared widgets (DataTable, ConfirmDialog, PageHeader)
├── i18n/                       # next-intl configuration (routing, request)
├── lib/
│   ├── db.ts                   # Prisma client singleton
│   ├── auth.ts                 # Auth.js v5 setup
│   ├── rbac.ts                 # Role-based access control rules
│   ├── money.ts                # Minor units converter & currency formatter
│   ├── audit.ts                # Structured audit logging
│   └── utils.ts                # UI utility helpers
└── messages/
    ├── ar.json                 # Arabic dictionary (default)
    └── en.json                 # English dictionary
```

---

## 2. Server Action Mutation Contract
Every mutation must adhere to the 5-point contract:
1. **Zod Validation**: Validate all inputs using shared Zod schemas.
2. **Authentication**: Verify session via Auth.js `auth()`.
3. **RBAC Authorization**: Enforce permission checks via `requirePermission()`.
4. **Audit Logging**: Record action, entity, entityId, before/after snapshot via `createAuditLog()`.
5. **Typed Result**: Always return `{ ok: true, data: T }` or `{ ok: false, error: string, fieldErrors?: Record<string, string[]> }`.

---

## 3. Financial Calculations & Money
- **No floating point arithmetic**: Currency amounts are stored as integer minor units (e.g., piastres/cents) or Prisma `Decimal`.
- All financial manipulation and formatting must pass through `lib/money.ts`.

---

## 4. Internationalization & RTL
- Supported locales: Arabic (`ar` - default, RTL) and English (`en` - LTR).
- Layout dynamically sets `<html lang={locale} dir={dir}>`.
- Fonts:
  - **Cairo**: Applied when locale is Arabic (`ar`).
  - **Inter**: Applied when locale is English (`en`).
- All styles must use CSS logical properties (`ms-*`, `me-*`, `ps-*`, `pe-*`, `text-start`, `text-end`).
- All text strings must reside in `messages/{ar,en}.json`.

---

## 5. Security & Authorization
- Client state is treated as untrusted.
- Authorization is checked in Server Components before rendering and in Server Actions before mutation.
- Role-based permissions are enforced with granular keys (`module.resource.action`, e.g. `inventory.product.create`, `auth.user.manage`).
- **Auth.js v5**: Credentials provider with bcrypt hash verification and JWT sessions holding `id`, `role`, `permissions[]`, and `locale`.
- **RBAC API**:
  - `hasPermission(session, permissionKey)`: Pure verification helper for UI and tests.
  - `requirePermission(permissionKey)`: Server-side assertion that throws typed `ForbiddenError`.
  - `<Can permission="...">`: Server component to conditionally render children based on session.
  - `<CanClient permission="...">`: Client component using session context.
- **Audit Logging**: `logAudit({ action, entity, entityId, before, after })` automatically tracks user ID, IP address, and user agent.
- **Rate Limiting**: Sliding window in-memory limiter protects against brute-force login attempts (5 attempts per 15 minutes).

---

## 6. Design System & App Shell Primitives
- **Visual Identity**: Slate neutral background with Deep Teal `#0F766E` brand accent, 10px radiuses (`--radius: 0.625rem`), and strict `tabular-nums` for financial numbers.
- **Theme Support**: Seamless Light / Dark / System switching powered by `next-themes`.
- **Navigation & App Shell**:
  - `AppSidebar`: Collapsible sidebar grouping modules (Inventory, Sales, Purchasing, Accounting, HR, Administration), checking granular permissions, and converting to a Sheet drawer on mobile.
  - `AppHeader`: Top bar housing dynamic breadcrumbs, Cmd/Ctrl+K global Command Palette, Language Switcher, Theme Toggle, Notifications Bell, and User Menu.
  - `PageHeader`: Standard layout container with title, description, badge, and primary action buttons.
- **Shared Business Components (`src/components/shared/`)**:
  - `DataTable`: TanStack Table v8 implementation featuring URL-synchronized pagination/filtering/sorting, column visibility toggles, multi-row selection, bulk action slots, loading skeletons, and CSV export with UTF-8 BOM (`\uFEFF`).
  - `CurrencyInput`: High-precision input working in integer minor units, preventing floating point math issues.
  - `DatePicker` & `DateRangePicker`: Popover + Calendar components localized for Arabic (`arSA`) and English (`enUS`).
  - `ComboboxAsync`: Searchable, debounced asynchronous selection for large datasets (products, customers, accounts).
  - `StatusBadge`: Maps all business entity lifecycle states to semantic colors (Emerald, Amber, Rose, Sky, Slate).
  - `ConfirmDialog`: Accessible confirmation dialog for destructive actions with built-in async loading spinner.
  - `EmptyState` & `ErrorState`: Consistent feedback placeholders for empty datasets or failed requests.
  - `LineItemsEditor`: Live editable invoice/quotation line-items grid computing real-time taxes, discounts, subtotals, and grand totals in integer minor units.
  - `Toasts`: Integrated Sonner toast alerts with rich colors and RTL alignment.
- **Review Gallery**: `/[locale]/design-system` page showcasing all components and states (dev-only link).


---

## 7. Inventory Domain (`src/features/inventory/`)
- **Stock Movement Engine**: All stock transactions flow through `stock-movement.ts` within atomic transactions.
- **Components**: Product management with dynamic pricing/stock tabs, recursive category tree view, warehouse allocations, multi-line adjustments with manager approval, and atomic multi-warehouse transfers.
- **Import/Export**: CSV batch product importer with live preview and line validation; UTF-8 BOM CSV export.

---

## 8. Sales Domain (`src/features/sales/`)
- **Workflow**: Quotations $\to$ Sales Orders $\to$ Sales Invoices $\to$ Payments & Returns.
- **Automatic Accounting Integration**: Posting an invoice locks documents and automatically records Dr AR / Cr Revenue / Cr Tax / Dr COGS / Cr Inventory.
- **Customer Statement**: Chronological running balance with debit/credit breakdown and printable account statements.
- **Printable A4 Invoice**: Bilingual (Arabic/English) layout with QR code placeholder, tax breakdown, and print-specific CSS.

---

## 9. Purchasing Domain (`src/features/purchasing/`)
- **Workflow**: Purchase Orders $\to$ Goods Receipts $\to$ Purchase Invoices $\to$ Supplier Payments & Returns.
- **Weighted Average Cost (WAC)**: Automatically recomputes product unit cost during Goods Receipt based on existing warehouse on-hand stock and inward purchase cost.
- **Supplier Ledger**: Supplier profiles with chronological transaction statements, balance tracking, and partial payment allocation.
- **Printable A4 Purchase Order**: Bilingual order voucher ready for vendor dispatch and fulfillment verification.

---

## 10. Accounting Domain (`src/features/accounting/`)
- **Centralized Posting Service (`posting.ts`)**:
  - Unified posting engine with `assertFiscalPeriodOpen` and balanced transaction validation ($\sum \text{Debit} = \sum \text{Credit}$).
  - Dynamic sequence generation (`JRN-YYYY-XXXXX`) and automated account running balance recalculations.
  - Mirrored reversal engine creating balanced reversing entries and marking original entries as `REVERSED`.
- **Chart of Accounts (COA)**:
  - Recursive tree view with expand/collapse, active/postable state indicators, aggregated balance rollups across children, and deletion safeguards preventing deletion of accounts with historical journal lines.
- **Journal Entries Ledger**:
  - Manual double-entry creation form with live balance indicator, multi-line editor, account combobox, and draft or immediate posting.
  - Detailed entry view linking back to source documents (Sales Invoices, Purchase Invoices, Expenses, Payments, Returns, Voids).
- **Fiscal Periods & Lockdowns**:
  - Period date-range configuration and closure actions that strictly block journal postings into locked historical periods.
- **Expenses Ledger**:
  - Expense registration with category, expense account, and payment source (Cash/Bank), posting automatic journal entries and supporting cancellation/reversal.
- **Company Settings & GL Account Mapping**:
  - Central configuration interface mapping default general ledger accounts (AR, AP, Sales, COGS, Inventory, VAT Tax, Cash, Bank) with graceful fallbacks.
- **Financial Statements & Reports**:
  - **Trial Balance (ميزان المراجعة)**: Opening balances, period debit/credit movements, and closing balances with equality checks.
  - **General Ledger (دفتر الأستاذ العام)**: Account-by-account transaction ledger with running balance.
  - **Income Statement / P&L (قائمة الدخل - الأرباح والخسائر)**: Revenues, COGS, Gross Profit, Operating Expenses, and Net Profit.
  - **Balance Sheet (الميزانية العمومية)**: Assets, Liabilities, and Equity with verified accounting equation balance ($\text{Assets} = \text{Liabilities} + \text{Equity}$).
  - **Customer & Supplier Aging (أعمار الديون)**: Aging buckets ($0-30$, $31-60$, $61-90$, $90+$ days) with running totals.
  - **Tax Summary (إقرار ضريبة القيمة المضافة)**: Output VAT, Input VAT, and Net Payable/Refundable VAT.
  - All reports feature date-range filtering, clean printable layouts, and UTF-8 BOM CSV export for Excel.

---

## 11. Human Resources Domain (`src/features/hr/`)
- **Organizational Structure**:
  - Departments and Job Positions with hierarchy, active states, and position counts.
- **Employee Lifecycle Management**:
  - Comprehensive employee profiles (Personal details, job classification, hiring dates, salary settings, document notes).
  - Optional linkage to system `User` accounts for employee access and self-service.
  - Detail page featuring tabs for profile overview, attendance history, leave balances, and salary review.
- **Attendance & Time Tracking**:
  - Daily Attendance Sheet with bulk status updates (`PRESENT`, `ABSENT`, `LATE`, `LEAVE`), quick time entry (`09:00 - 17:00`), and real-time attendance counter.
  - Manual check-in / check-out modal for individual time recordings.
  - Normalized UTC dates (`00:00:00.000Z`) to eliminate cross-timezone discrepancies.
- **Leave Management & Entitlements**:
  - Configurable leave types (Annual, Sick, Unpaid, Emergency) with statutory annual day allowances.
  - Leave request submission form with real-time balance validation.
  - Manager / HR approval workflow with reason tracking and automated balance deduction:
    $$\text{Remaining Days} = \text{Annual Allowance} - \sum \text{Approved Leave Days (Current Year)}$$
- **Payroll Processing Engine**:
  - Monthly batch payroll generator with configurable month and year.
  - Automatic payslip generation:
    - Base salary and customized allowances (transport, housing, bonus).
    - Unexcused absence deduction based on 30-day labor law baseline: $\frac{\text{Base}}{30} \times \text{Absent Days} \times \text{Rate}$.
    - Late arrival deduction: $\frac{\text{Base}}{30} \times \text{Late Days} \times \text{Rate}$.
  - Multi-stage lifecycle: `DRAFT` $\to$ `APPROVED` $\to$ `PAID`.
  - **Accounting Integration**:
    - **Approval**: Automatically posts double-entry journal entry: Dr Salaries Expense (6100), Cr Salaries Payable (2130).
    - **Payment**: Automatically posts journal entry: Dr Salaries Payable (2130), Cr Cash/Bank (1110/1120).
  - Printable A4 bilingual Payslip (قسيمة راتب) with QR code placeholder, earnings/deductions breakdown, and net salary.
- **Salary Data Privacy & Security**:
  - Granular RBAC permission `hr.salary.view`.
  - Masking utility (`maskSalary`) applied across tables, detail cards, and payslips; users without permission see masked values (`••••••`).

---

## 12. Dashboard, Reports Center & Notifications Domain

### 12.1. Executive Dashboard (`src/features/dashboard/`)
- **Permission-Aware Architecture**:
  - Automatically filters KPI cards, Recharts visualizations, and tables according to the session's active permissions.
  - KPI Cards: Today's Sales, MTD Sales vs Previous Month (% change), Accounts Receivable Outstanding, Accounts Payable Outstanding, Cash & Bank Available Balances, and Low-Stock Alert Counts.
  - Interactive Charts:
    - 12-Month Sales vs Purchases Comparison (Bar/Area).
    - Top 5 Products by Sales Revenue (Horizontal Bar).
    - Sales by Category (Donut with percentage breakdown).
    - Cash Flow Trend (Inflows vs Outflows vs Net).
  - Operational Quick-Action Tables:
    - Recent Issued Invoices.
    - Overdue Invoices with aging day counters.
    - Low-Stock Products below reorder thresholds.
    - Pending Employee Leave Requests.
- **Streaming & Responsiveness**:
  - Fast server-side data loading via React Suspense and realistic skeleton fallbacks (`DashboardSkeleton`).
  - URL-synchronized date preset selector (`today`, `month`, `last_month`, `quarter`, `year`, `custom`).

### 12.2. Cross-Module Reports Center (`src/features/reports/`)
- **Centralized Gallery Hub (`/[locale]/reports`)**:
  - Grouped by business domain: Sales, Purchasing, Inventory, Profitability, Financial, and HR.
- **Operational Report Views**:
  - **Sales by Customer** (`/reports/sales-by-customer`): Invoices count, total sales, collections, and receivables.
  - **Sales by Product** (`/reports/sales-by-product`): Quantities sold, sales revenue, and average unit price.
  - **Sales by Salesperson** (`/reports/sales-by-salesperson`): Team performance, invoices issued, and revenue attribution.
  - **Purchases by Supplier** (`/reports/purchases-by-supplier`): Purchase volume, payments, and payables balances.
  - **Inventory Valuation** (`/reports/inventory-valuation`): Quantity on hand valued at Weighted Average Cost (WAC).
  - **Stock Movement Summary** (`/reports/stock-movement`): Opening balance, inwards, outwards, adjustments, and closing stock.
  - **Profit by Product** (`/reports/profit-by-product`): Revenue vs COGS, gross profit, and margin %.
  - **HR Attendance Summary** (`/reports/hr-attendance`): Working days, present, absences, late arrivals, leaves, and attendance rate %.
- **Standardized Features**:
  - Dual visual and print headers.
  - Prominent sticky Grand Totals row.
  - CSV export with UTF-8 BOM (`\uFEFF`) for Arabic Excel compatibility.
  - Clean `@media print` layout formatting.

### 12.3. System Notifications & Cron Engine (`src/features/notifications/`)
- **In-App Notifications**:
  - Database-backed `Notification` model with `NotificationType` enum (`LOW_STOCK`, `OVERDUE_INVOICE`, `LEAVE_REQUEST`, `APPROVAL`, `INFO`, `WARNING`, `SUCCESS`, `ERROR`).
  - Real-time `NotificationsBell` dropdown in top navigation showing unread counter and quick mark-read actions.
  - Dedicated `/notifications` management center with type filtering tabs.
- **Automated Background Scanner (`/api/cron/notifications`)**:
  - Protected by `CRON_SECRET` via Bearer token or query parameter.
  - Evaluates low stock, past-due invoices, and pending leaves.
  - 24-hour throttling safeguards to prevent alert spamming. Documented in `docs/CRON.md`.
