# Masar ERP — مجموعة برومتات لـ Antigravity

نظام ERP متكامل Full Stack بـ Next.js، من تصميمي.

## طريقة الاستخدام

1. افتح مشروع فاضي في Antigravity.
2. ابعت **Prompt 0** الأول (ده بيحدد القواعد والمعمارية لكل اللي بعده).
3. ابعت باقي البرومتات **بالترتيب**، واحد واحد، وراجع الشغل وشغّل المشروع بعد كل برومت قبل ما تكمل للي بعده.
4. لو الـ Agent وقف في نص أي مرحلة، ابعت: `Continue from where you stopped. Do not redo completed work.`

> البرومتات مكتوبة بالإنجليزي لأن الـ Agents بتدي نتيجة أدق كده. النظام نفسه هيدعم عربي (RTL) وإنجليزي.

---

## نظرة عامة على النظام

**الاسم:** Masar ERP
**الفكرة:** نظام ERP لشركات صغيرة ومتوسطة (تجارة وتوزيع)، متعدد المستخدمين وبصلاحيات.

**الموديولات:**
- Auth & Roles (المستخدمين والصلاحيات)
- Dashboard (لوحة التحكم)
- Inventory (المخزون)
- Sales (المبيعات)
- Purchasing (المشتريات)
- Accounting (الحسابات)
- HR (الموارد البشرية)
- Reports (التقارير)
- Settings & Audit Log (الإعدادات وسجل العمليات)

**التقنيات:**
- Next.js 15 (App Router) + TypeScript (strict)
- PostgreSQL + Prisma ORM
- Auth.js (NextAuth v5) بنظام credentials + RBAC
- Tailwind CSS + shadcn/ui + lucide-react
- TanStack Table + TanStack Query
- React Hook Form + Zod
- next-intl (عربي RTL / إنجليزي)
- Recharts للرسوم البيانية
- Vitest + Playwright للاختبارات
- Docker Compose للتشغيل

---

## Prompt 0 — Master Context (ابعته الأول دايماً)

```
You are the lead engineer building "Masar ERP", a production-grade, full-stack ERP system for small and medium trading/distribution companies.

## Tech stack (do not deviate without asking)
- Next.js 15 App Router, React 19, TypeScript in strict mode
- PostgreSQL + Prisma ORM
- Auth.js v5 (credentials provider, JWT sessions) with role-based access control
- Tailwind CSS + shadcn/ui + lucide-react
- TanStack Table (data grids) and TanStack Query (client data fetching where needed)
- React Hook Form + Zod for all forms and validation (share Zod schemas between client and server)
- next-intl for i18n: Arabic (RTL, default) and English (LTR)
- Recharts for charts
- Vitest (unit) and Playwright (e2e)
- Docker Compose for local dev (app + postgres)

## Architecture rules
1. Feature-based folder structure:
   src/
     app/[locale]/(auth)/...        public auth pages
     app/[locale]/(dashboard)/...   protected app pages
     app/api/...                    only where route handlers are truly needed
     features/<module>/{components,actions,queries,schemas,types}
     components/ui/                 shadcn primitives
     components/shared/             DataTable, PageHeader, ConfirmDialog, etc.
     lib/{db,auth,rbac,utils,money,audit}.ts
     messages/{ar,en}.json
2. Prefer Server Components and Server Actions for mutations. Every Server Action must: (a) validate input with Zod, (b) check authentication, (c) check permission via RBAC, (d) write an audit log entry, (e) return a typed result { ok: true, data } | { ok: false, error }.
3. Never trust the client. All authorization is enforced on the server.
4. Money: store as integer minor units or Prisma Decimal. Never use JS floats for money. Provide a lib/money.ts helper.
5. All tables have id (cuid), createdAt, updatedAt. Use soft delete (deletedAt) for business entities.
6. Every list page supports server-side pagination, sorting, search, and filters via URL search params.
7. All user-facing strings go through next-intl. No hardcoded text in components.
8. Use logical CSS properties (ms-, me-, ps-, pe-, text-start) so RTL/LTR both work.
9. Accessibility: keyboard navigable, proper labels, focus states, aria attributes.
10. Code quality: no `any`, small components, meaningful names, ESLint + Prettier configured.
11. After each task: run typecheck, lint, and build; fix all errors before finishing. Summarize what you did and what remains.

## Working style
- Work in small verified steps. Do not scaffold things you are not asked to build yet.
- If a requirement is ambiguous, pick the most sensible default and note it in docs/DECISIONS.md.
- Create and maintain docs/ARCHITECTURE.md and docs/DECISIONS.md as you go.

Acknowledge these rules briefly, then wait for the next prompt. Do not write code yet.
```

---

## Prompt 1 — Project Setup

```
Initialize the project.

1. Create a Next.js 15 app (TypeScript, App Router, src/ directory, Tailwind, ESLint) in the current folder.
2. Install and configure: prisma, @prisma/client, next-auth@beta, @auth/prisma-adapter (if needed), zod, react-hook-form, @hookform/resolvers, @tanstack/react-table, @tanstack/react-query, next-intl, recharts, lucide-react, date-fns, bcryptjs, sonner, class-variance-authority, clsx, tailwind-merge.
3. Initialize shadcn/ui and add: button, input, label, textarea, select, checkbox, switch, dialog, alert-dialog, dropdown-menu, sheet, tabs, table, badge, card, form, popover, calendar, command, tooltip, skeleton, separator, avatar, sidebar, breadcrumb.
4. Configure next-intl with locales ["ar", "en"], default "ar", routing under app/[locale]. Create messages/ar.json and messages/en.json with a "common" namespace to start. Set <html lang dir> correctly per locale.
5. Fonts: use "Cairo" (Arabic) and "Inter" (Latin) via next/font, applied by locale.
6. Create docker-compose.yml (postgres 16 + pgAdmin optional) and .env.example with DATABASE_URL, AUTH_SECRET, NEXT_PUBLIC_APP_URL.
7. Add scripts: dev, build, lint, typecheck, db:migrate, db:seed, db:studio, test, test:e2e.
8. Configure Prettier, ESLint, and path alias @/*.
9. Create the folder structure from the master context (empty folders with .gitkeep are fine).
10. Write README.md with setup steps.

Verify: `npm run typecheck && npm run lint && npm run build` pass, and the app runs showing a placeholder home page in both locales.
```

---

## Prompt 2 — Database Schema

```
Design and implement the full Prisma schema for Masar ERP in prisma/schema.prisma, then create the initial migration.

### Core / Auth
- User (name, email unique, passwordHash, locale, isActive, roleId, lastLoginAt)
- Role (name unique, description) and Permission (key like "sales.invoice.create") with RolePermission join
- AuditLog (userId, action, entity, entityId, before Json?, after Json?, ip, createdAt)
- Company settings (single row: name, taxNumber, address, phone, logoUrl, currency, defaultTaxRate, fiscalYearStart, invoicePrefix, etc.)

### Inventory
- Category (nested via parentId)
- Unit (name, symbol)
- Product (sku unique, barcode?, name, description, categoryId, unitId, costPrice, salePrice, taxRate, reorderLevel, isActive, trackStock)
- Warehouse (name, code, address)
- StockLevel (productId, warehouseId, quantity) unique on [productId, warehouseId]
- StockMovement (productId, warehouseId, type: IN | OUT | TRANSFER | ADJUSTMENT, quantity, reference type/id, note, createdById)

### Sales
- Customer (code, name, phone, email, address, taxNumber, creditLimit, balance)
- SalesQuotation + items
- SalesOrder + items (status: DRAFT, CONFIRMED, FULFILLED, CANCELLED)
- SalesInvoice + items (status: DRAFT, ISSUED, PARTIALLY_PAID, PAID, VOID; subtotal, discount, tax, total, paidAmount, dueDate)
- CustomerPayment (customerId, invoiceId?, amount, method: CASH | BANK | CARD | CHEQUE, date, reference)
- SalesReturn + items

### Purchasing
- Supplier (same shape as Customer)
- PurchaseOrder + items (status: DRAFT, SENT, PARTIALLY_RECEIVED, RECEIVED, CANCELLED)
- GoodsReceipt + items
- PurchaseInvoice + items
- SupplierPayment

### Accounting
- Account (code unique, name, type: ASSET | LIABILITY | EQUITY | REVENUE | EXPENSE, parentId, isPostable)
- JournalEntry (number, date, description, status: DRAFT | POSTED | REVERSED, sourceType, sourceId)
- JournalLine (entryId, accountId, debit, credit, description) with a rule that total debit must equal total credit at posting time
- FiscalPeriod (start, end, isClosed)
- Expense (category, accountId, amount, date, paidFromAccountId, note)

### HR
- Department, Position
- Employee (code, fullName, nationalId, phone, email, hireDate, departmentId, positionId, baseSalary, status, userId?)
- Attendance (employeeId, date, checkIn, checkOut, status)
- LeaveType, LeaveRequest (status: PENDING | APPROVED | REJECTED)
- PayrollRun (month, year, status) and Payslip (employeeId, base, allowances, deductions, net)

### Requirements
- Use enums for statuses and types. Add sensible indexes (foreign keys, search columns, dates) and unique constraints.
- Document numbering: create a DocumentSequence model (type, prefix, nextNumber, year) with a helper in lib/ to generate numbers like INV-2026-00001 atomically inside a transaction.
- Add `onDelete` rules thoughtfully (Restrict for financial documents).
- Seed script (prisma/seed.ts): default roles (Admin, Accountant, Sales, Warehouse, HR, Viewer), full permission list, role-permission mapping, an admin user (admin@masar.local / Admin@12345 — print a warning to change it), default chart of accounts for a trading company, units, one warehouse, default company settings, and a small amount of demo data (20 products, 10 customers, 5 suppliers, 8 employees).

Run the migration and seed against the dockerized Postgres. Generate an ERD description in docs/DATABASE.md (Mermaid erDiagram).
```

---

## Prompt 3 — Authentication & RBAC

```
Implement authentication and role-based access control.

1. Auth.js v5 with credentials provider (email + password, bcrypt), JWT session containing userId, role, permissions[], locale.
2. Pages: /[locale]/login (clean split-screen design, Arabic/English), forgot-password placeholder, and a "no access" (403) page.
3. Middleware: protect everything under (dashboard); redirect unauthenticated users to login with callbackUrl; keep next-intl routing working together with auth in the same middleware.
4. lib/rbac.ts:
   - `hasPermission(session, key)` and `requirePermission(key)` for Server Actions/Route Handlers (throws a typed error).
   - `<Can permission="...">` client/server component to conditionally render UI.
   - Permission keys follow "module.resource.action" (e.g. inventory.product.create).
5. Users module (permission-gated): list, create, edit, deactivate, reset password, assign role. Roles module: list roles, edit role-permission matrix in a grouped checkbox UI.
6. Rate-limit login attempts (simple in-memory or DB-based limiter) and record lastLoginAt.
7. Write audit log entries for login, logout, failed login, user/role changes via lib/audit.ts (`logAudit({ action, entity, entityId, before, after })` that automatically pulls user and IP).
8. Unit tests for rbac helpers; one Playwright test for login → dashboard → logout.

Do not build other modules yet. Hide navigation items the user has no permission for.
```

---

## Prompt 4 — Design System & App Shell

```
Build the app shell and design system. Design direction: modern, calm, data-dense but breathable; a professional business tool, not a flashy landing page.

### Visual language
- Neutral slate/zinc base with ONE brand accent (deep teal #0F766E as the primary). Semantic colors for success/warning/danger/info.
- Define all colors as CSS variables (light + dark themes) in globals.css and map them in Tailwind. Provide a theme toggle (light/dark/system).
- 8px spacing rhythm, radius 10px, subtle borders over heavy shadows, tabular numbers for all amounts (font-variant-numeric: tabular-nums).
- Fully RTL-safe. Test every layout in both directions.

### Layout
- Collapsible sidebar (grouped by module with icons, active state, permission-aware, remembers collapsed state), top bar (breadcrumbs, global search command palette via Cmd/Ctrl+K, language switcher, theme toggle, notifications bell, user menu), responsive: sidebar becomes a sheet on mobile.
- Page container with consistent PageHeader (title, description, primary actions).

### Shared components in components/shared/
- DataTable (TanStack Table): server-side pagination/sorting/filtering via URL params, column visibility, row selection, bulk actions slot, loading skeleton, empty state, CSV export button.
- FormField wrappers for RHF + shadcn, CurrencyInput, DatePicker, DateRangePicker, ComboboxAsync (searchable select that fetches options), StatusBadge (maps statuses to colors), ConfirmDialog, EmptyState, ErrorState, StatCard, LineItemsEditor (editable table for invoice/order lines with live totals).
- Toasts with sonner.

Create a temporary /[locale]/design-system page showing every component in all states so I can review them. Add its link only in dev mode.
```

---

## Prompt 5 — Inventory Module

```
Build the Inventory module under features/inventory with full CRUD, following the architecture rules.

Pages:
- Products: list (search by name/SKU/barcode, filter by category/status/low-stock), create/edit (tabs: General, Pricing & Tax, Stock settings), detail page with stock by warehouse and movement history.
- Categories (tree view with inline add/edit), Units, Warehouses.
- Stock: current stock overview across warehouses with low-stock highlighting.
- Stock Adjustments: create adjustment with reason and lines (increase/decrease), requires approval permission.
- Stock Transfers between warehouses (atomic: creates OUT and IN movements in one transaction).
- Movement Ledger: filterable list of all StockMovement records.
- CSV import for products (preview, validation errors per row, then commit) and CSV export.

Business rules:
- Stock is only changed via StockMovement records inside Prisma transactions that also update StockLevel. Never edit StockLevel directly.
- Prevent negative stock unless a company setting allows it.
- Products with movement history can be deactivated but not deleted.
- Generate SKU automatically if left empty.

Include Zod schemas, server actions with permission checks and audit logs, translations (ar/en), and unit tests for the stock movement service.
```

---

## Prompt 6 — Sales Module

```
Build the Sales module under features/sales.

Pages:
- Customers: list, create/edit, detail page (tabs: Overview, Invoices, Payments, Statement of account with running balance, printable).
- Quotations → can be converted to Sales Order with one click.
- Sales Orders → can be converted to Invoice. Confirming an order can optionally reserve stock.
- Invoices: list with status/date/customer filters; create/edit using LineItemsEditor (product combobox with live price and stock indicator, quantity, discount per line, tax per line, invoice-level discount, notes, due date); live totals.
- Issue invoice action: locks the document, deducts stock via StockMovement (OUT), generates the sequence number atomically, increases customer balance, and posts the accounting journal entry (Dr Accounts Receivable, Cr Sales Revenue, Cr Tax Payable; plus Dr COGS, Cr Inventory).
- Record payment against invoice(s) (partial payments supported), updates invoice status and customer balance, posts journal entry (Dr Cash/Bank, Cr Accounts Receivable).
- Sales Returns / Credit Notes that reverse stock and accounting.
- Void invoice (permission-gated) that creates reversing entries rather than deleting anything.
- Printable invoice view (A4, bilingual, company logo, tax details, QR placeholder) with a "Print / Save as PDF" button via print stylesheet.

Rules:
- Issued documents are immutable except via return/void.
- Enforce customer credit limit with a warning (or block, via setting).
- All multi-table writes happen inside a single Prisma transaction.
- Server-side recalculation of totals; never trust client totals.

Write unit tests for totals calculation, invoice issuing (stock + journal correctness), and payment allocation.
```

---

## Prompt 7 — Purchasing Module

```
Build the Purchasing module under features/purchasing, mirroring the Sales module's quality.

- Suppliers: list, create/edit, detail with statement of account.
- Purchase Orders: create/edit with LineItemsEditor, statuses DRAFT → SENT → PARTIALLY_RECEIVED → RECEIVED, printable PO.
- Goods Receipt: receive against a PO (partial receipts supported). Creates StockMovement IN records, updates product cost price using weighted average cost, and updates PO status.
- Purchase Invoices: create from PO/receipt or standalone; posting creates a journal entry (Dr Inventory, Dr Input Tax, Cr Accounts Payable).
- Supplier Payments: partial payments, allocation to invoices, journal entry (Dr Accounts Payable, Cr Cash/Bank).
- Purchase Returns.

Reuse shared components. Same rules: transactions, permission checks, audit logs, translations, tests for weighted average cost and receipt status transitions.
```

---

## Prompt 8 — Accounting Module

```
Build the Accounting module under features/accounting.

- Chart of Accounts: tree view with add/edit/deactivate, prevent deleting accounts that have journal lines.
- Journal Entries: manual entry form (lines table with debit/credit, live balance check, cannot post unless balanced), list with filters, post and reverse actions (reversal creates a mirrored entry), view entry with source document link. Auto-generated entries (from sales/purchasing) are read-only.
- Fiscal periods: create, close period (blocks posting into closed periods).
- Expenses: record expense with category, account, payment source; posts journal entry automatically.
- Reports (all with date range filters, CSV export, and print view):
  1. Trial Balance
  2. General Ledger (per account, running balance)
  3. Income Statement (P&L)
  4. Balance Sheet
  5. Customer and Supplier Aging (0-30, 31-60, 61-90, 90+)
  6. Tax Summary (output vs input tax)
- Put the posting logic in a single service (features/accounting/services/posting.ts) used by sales/purchasing/expenses so rules live in one place. Account mapping (which account to use for AR, AP, Sales, COGS, Inventory, Tax, Cash, Bank) must be configurable in Settings with sensible defaults from the seed.

Add tests proving the books balance after a sequence of sales, purchases, payments, returns, and a void.
```

---

## Prompt 9 — HR Module

```
Build the HR module under features/hr.

- Departments and Positions CRUD.
- Employees: list, create/edit (personal, job, salary, documents note), detail page with attendance summary and leave balance. Optional link to a system user.
- Attendance: daily sheet (bulk mark present/absent/late/leave), monthly calendar view per employee, manual check-in/out.
- Leave: leave types with annual allowance, request form, approval workflow (manager/HR approve or reject with reason), balance calculation.
- Payroll: monthly payroll run — generates payslips from base salary + allowances − deductions (absence/late deduction rules configurable in settings), review screen, then "Approve" which posts a journal entry (Dr Salaries Expense, Cr Salaries Payable) and "Mark paid" which posts (Dr Salaries Payable, Cr Cash/Bank). Printable payslip.
- Salary data is sensitive: gate behind hr.salary.view permission and mask it for other roles.

Include validations, audit logs, translations, and tests for payroll calculation.
```

---

## Prompt 10 — Dashboard, Reports & Notifications

```
Build the main dashboard and the cross-module reports center.

Dashboard (permission-aware: each widget only appears if the user can view its module):
- KPI cards: today's sales, month-to-date sales vs previous month (% change), receivables outstanding, payables outstanding, cash balance, low-stock items count.
- Charts (Recharts): sales vs purchases last 12 months, top 5 products, sales by category (donut), cash flow trend.
- Tables: recent invoices, overdue invoices, low-stock products, pending leave requests, with quick links.
- Date range selector affecting the widgets. Use cached/aggregated server queries and Suspense with skeletons so the page streams quickly.

Reports Center (/reports): a gallery of all reports grouped by module (Sales by customer/product/salesperson, Purchases by supplier, Inventory valuation, Stock movement, Profit by product, accounting reports from the Accounting module, HR attendance summary). Each report: filters, table, totals row, CSV export, print layout.

Notifications: in-app notifications (model + bell dropdown + page) for low stock, overdue invoices, leave requests, and approvals. Create a lightweight scheduled job route (protected by a secret) that generates overdue/low-stock notifications, documented for cron usage.
```

---

## Prompt 11 — Settings, Audit Log & Polish

```
Build the Settings area and finish cross-cutting features.

Settings (permission-gated tabs): Company profile (logo upload to local /uploads with validation), Currency & number formats, Tax rates, Document numbering, Accounting account mapping, Inventory rules (allow negative stock, costing method), Sales rules (credit limit behavior), Payroll rules, Backup note.

Audit Log viewer: filterable by user, entity, action, date; diff viewer showing before/after JSON.

Cross-cutting polish:
- Global error boundaries, not-found pages, and loading states per route segment.
- Consistent empty states with a call-to-action.
- Keyboard shortcuts: N for "new" on list pages, "/" to focus search.
- Unsaved-changes warning on forms.
- Optimistic UI for simple toggles.
- Full translation audit: find any hardcoded strings and move them to messages/ar.json and messages/en.json; ensure number, currency, and date formatting follow the locale (use Arabic-Indic digits only if a user setting enables it).
- Mobile responsiveness pass on every page; tables scroll horizontally with sticky first column.
```

---

## Prompt 12 — Testing, Security & Performance Review

```
Perform a rigorous review and hardening pass across the whole codebase.

1. Security: verify EVERY server action and route handler checks auth + permission; verify no secrets leak to the client; add security headers (CSP, X-Frame-Options, Referrer-Policy) in next.config; sanitize file uploads; confirm Prisma queries never use raw unsafe SQL; add CSRF considerations where relevant. List findings and fix them.
2. Data integrity: confirm all financial and stock operations are transactional and idempotent against double-submit (use idempotency keys or disabled-while-pending plus server checks).
3. Performance: add missing DB indexes, remove N+1 queries, use `select` to limit columns, paginate everything, and add caching/revalidation tags where beneficial.
4. Testing: ensure Vitest coverage for money, stock, posting, payroll, and RBAC services; write Playwright e2e for the critical flows: login → create product → purchase & receive → create customer → sell & issue invoice → record payment → verify dashboard and trial balance.
5. Accessibility and RTL audit on 10 key pages.
6. Produce docs/REVIEW.md listing what you checked, what you fixed, and any remaining known issues.

Do not add new features in this pass.
```

---

## Prompt 13 — Deployment

```
Prepare the project for production deployment.

- Multi-stage Dockerfile for Next.js (standalone output) and a production docker-compose.yml (app + postgres + optional nginx/caddy reverse proxy with HTTPS notes).
- Environment variable validation at startup using Zod (fail fast with clear messages).
- Prisma migration strategy for production (`prisma migrate deploy`) and a safe seed that never overwrites existing data.
- Health check endpoint /api/health (DB connectivity).
- Structured logging (pino) and basic error reporting hook.
- GitHub Actions workflow: install, typecheck, lint, unit tests, build, and e2e on pull requests.
- Write docs/DEPLOYMENT.md with step-by-step instructions (VPS with Docker, and Vercel + managed Postgres alternative), backup and restore commands for Postgres, and a go-live checklist.
```

---

## برومتات مساعدة (استخدمها عند الحاجة)

### إصلاح أخطاء
```
The build/runtime is failing with the error below. Find the root cause (do not just suppress the error), fix it, and explain what was wrong in two sentences. Then re-run typecheck, lint, and build.

[paste error here]
```

### إضافة موديول جديد بنفس الأسلوب
```
Add a new module "<MODULE_NAME>" following exactly the same conventions as the Inventory module: feature folder structure, Zod schemas, server actions with auth + RBAC + audit log, DataTable list page with URL-driven filters, create/edit forms, permissions added to the seed, ar/en translations, sidebar entry, and tests. Entities and rules: <describe here>.
```

### مراجعة جودة قبل الانتقال لمرحلة جديدة
```
Before moving on, review the work from the last prompt against the master rules: Zod validation, auth + permission checks, audit logging, transactions, i18n (no hardcoded strings), RTL safety, and tests. List any gaps and fix them.
```

### إعادة تصميم صفحة
```
Redesign the <PAGE_NAME> page for better clarity and information hierarchy while keeping the existing design system (colors, spacing, components). Improve: layout, empty/loading/error states, mobile behavior, and RTL. Show what changed.
```

---

## ملاحظات مهمة

- **متدمجش برومتين مع بعض.** كل مرحلة بتبني على اللي قبلها.
- **بعد Prompt 2** افتح `npx prisma studio` وراجع الجداول بنفسك، تعديل الـ schema بعد كده بيبقى مكلف.
- **بعد Prompt 6 و 8** اختبر بإيدك إن الحسابات بتتوازن (Trial Balance لازم يطلع صفر فرق).
- غيّر باسورد الأدمن الافتراضي فوراً قبل أي نشر.
- لو عايز تقلل المشروع: ابدأ بـ Prompts 0 → 6 (Setup, DB, Auth, Shell, Inventory, Sales) وده هيدّيك MVP شغال، وبعدين زوّد الباقي.
