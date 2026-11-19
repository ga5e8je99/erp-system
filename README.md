<div align="center">

# 🏢 Masar ERP (مسار)
### **Production-Grade Enterprise Resource Planning & Financial Accounting Platform**

A full-stack, transactional ERP system engineered for commercial trading and distribution enterprises. Built with **Next.js 15 App Router**, **React 19**, **TypeScript**, **Prisma ORM**, **PostgreSQL 16**, and **Auth.js v5**.

[![Live Application](https://img.shields.io/badge/Live%20Demo-erp--system.vercel.app-0F766E?style=for-the-badge&logo=vercel&logoColor=white)](https://erp-system-one-alpha.vercel.app)
[![Next.js 15](https://img.shields.io/badge/Next.js-15.0-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19.0-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16.0-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind-CSS_v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Tests Passing](https://img.shields.io/badge/Vitest%20%7C%20Playwright-Passing-2EAD33?style=for-the-badge&logo=vitest&logoColor=white)](#tests)

<br/>

**[Explore Live Demo](https://erp-system-one-alpha.vercel.app)** • **[Default Credentials](#default-credentials)** • **[Architecture Guide](#system-architecture)** • **[Deployment Guide](#production-deployment)**

</div>

---

## 🏛️ System Architecture

Masar ERP is architected around strict **ACID transactional boundaries**, database-level concurrency protection, and edge-compatible security middleware:

```mermaid
flowchart TD
  subgraph Client ["Client & Presentation Layer (RTL / LTR)"]
    direction TB
    PAGES["Next.js 15 App Router (Server & Client Components)"]
    INTL["next-intl (Arabic RTL Default / English LTR)"]
    THEME["next-themes (Adaptive Light & Dark Modes)"]
    CHARTS["Recharts Executive Telemetry & Financial Curves"]
    GRIDS["TanStack Table (Server Pagination & Sorting)"]
  end

  subgraph Gateway ["Edge & Security Middleware"]
    direction TB
    ROUTING["Edge Middleware (Locale Prefixes & Path Guards)"]
    AUTH_EDGE["auth.config.ts (Edge JWT Session Verifier)"]
    RATELIMIT["PostgreSQL-Backed Rate Limiting (IP + Email Window)"]
    CSP["Strict Content Security Policy (Per-Request Nonces)"]
  end

  subgraph Domain ["Business Domain & Transaction Engine"]
    direction TB
    ACC["Accounting Module (Automated Double-Entry Journal Engine)"]
    INV["Inventory Module (Row-Level Locking & Stock Reconciliation)"]
    SALES["Sales & Purchasing Lifecycles (RFQ, Quotations, Invoices, Payables)"]
    HR["HR & Payroll Engine (Leave Calculations & Salary Statements)"]
    RBAC["Role-Based Access Control Engine (Wildcard * & Scoped Permissions)"]
  end

  subgraph Persistence ["Persistence & Infrastructure"]
    direction TB
    PRISMA["Prisma ORM (Schema Migrations & Type-Safe Client)"]
    POSTGRES[("PostgreSQL 16 (Decimal 15,2 Money Math)")]
    BLOB["Vercel Blob Storage (Receipts & Documents)"]
    AUDIT["Audit Log Engine (Immutable Transaction Trail)"]
  end

  Client --> Gateway
  Gateway --> Domain
  Domain --> Persistence
```

---

## 🔒 Concurrency & Stock Deduction Mechanics

To guarantee **zero negative stock** and eliminate race conditions during high-volume sales fulfillment, all stock operations execute inside a single atomic `$transaction` with row-level locks:

```mermaid
sequenceDiagram
  autonumber
  actor User as Sales Operator
  participant API as Server Action (issueInvoice)
  participant DB as PostgreSQL Transaction ($transaction)
  participant Stock as Stock Warehouse Records
  participant Ledger as General Ledger

  User->>API: Submit Invoice Confirmation
  API->>DB: Begin Isolation Transaction
  API->>DB: Lock Stock Rows (SELECT * FROM "Stock" ... FOR UPDATE)
  DB->>Stock: Acquire Exclusive Row Lock
  Stock-->>API: Return Current Available Quantities
  
  alt Quantity < Requested Amount
    API->>DB: Rollback Transaction
    DB-->>User: Throw InsufficientStockError (Atomic Abort)
  else Sufficient Stock Available
    API->>Stock: Deduct Quantities (quantity - requested)
    API->>Ledger: Insert Balanced Double-Entry Journal Records
    Note over Ledger: Debit: Accounts Receivable (1200)<br/>Credit: Revenue (4100)<br/>Credit: VAT Output Tax (2310)<br/>Debit: Cost of Goods Sold (5100)<br/>Credit: Inventory Asset (1300)
    API->>DB: Commit Transaction
    DB-->>User: 200 OK (Invoice Issued & Stock Guaranteed)
  end
```

---

## ⚖️ Double-Entry Accounting Ledger Flow

Every operational business document automatically posts balanced debit and credit entries to the General Ledger:

```mermaid
flowchart LR
  subgraph Invoice ["Sales Invoice Event"]
    INV["Invoice Issued (Total: 1,140 EGP)"]
  end

  subgraph FinancialEntry ["Journal Entry (Balanced)"]
    direction TB
    AR["Debit: Accounts Receivable (1,140)"]
    REV["Credit: Commercial Sales Revenue (1,000)"]
    TAX["Credit: VAT Output Tax Payable (140)"]
  end

  subgraph InventoryEntry ["Inventory Costing Entry"]
    direction TB
    COGS["Debit: Cost of Goods Sold (650)"]
    ASSET["Credit: Inventory Merchandise (650)"]
  end

  INV --> FinancialEntry
  INV --> InventoryEntry
```

---

## ✨ Core Feature Modules

| Module | Architectural Highlights |
|---|---|
| **📊 Executive Dashboard** | Real-time KPI telemetry, Cash & Bank liquidity, MTD Sales, Accounts Receivable/Payable, Cash Flow Trend, and Top Products by Revenue. |
| **📒 Financial Accounting** | Automated double-entry journals, Chart of Accounts hierarchy, Trial Balance, Profit & Loss statements, Tax calculation, and fiscal period locking. |
| **📦 Inventory & Warehouses** | Multi-warehouse tracking, stock transfers, adjustments, minimum reorder thresholds, concurrency safety (`SELECT FOR UPDATE`), and low-stock alerts. |
| **💼 Sales & Invoicing** | Quotations, Price lists, Sales orders, Invoices (Draft, Issued, Paid, Void), Returns, and Customer account balances. |
| **🛒 Purchasing & Vendors** | Purchase orders, Goods receipts, Vendor invoices, Vendor payables, and Purchase returns. |
| **👥 Human Resources & Payroll**| Employee master data, Attendance tracking, Leave balance policies, and Automated payroll run generation. |
| **🛡️ Security & RBAC** | Edge JWT session verification, DB-backed persistent rate limiting (5 attempts / 15m), Wildcard permission engine (`*`), CSP per-request nonces. |
| **🌐 Complete i18n & RTL** | Bilingual Arabic (RTL, default) & English (LTR) with Cairo and Inter typography and 100% synchronized translation keys. |

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** >= 20.x
- **npm** >= 10.x
- **Docker & Docker Compose** (for local PostgreSQL 16)

### 2. Clone & Install
```bash
git clone https://github.com/ga5e8je99/erp-system.git
cd erp-system
npm install
```

### 3. Environment Setup
```bash
cp .env.example .env
```
Ensure `.env` contains valid secrets:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/masar_erp"
AUTH_SECRET="development-auth-secret-min-32-chars-long"
CRON_SECRET="development-cron-secret-min-24-chars-long"
```

### 4. Start Local Database
```bash
docker compose up -d
```
Spins up PostgreSQL 16 on `localhost:5432` and pgAdmin on `localhost:5050`.

### 5. Migrate & Seed Database
```bash
npm run db:migrate
npm run db:seed
```

### 6. Start Development Server
```bash
npm run dev
```
Visit **[http://localhost:3000](http://localhost:3000)** (auto-routes to `/ar/dashboard` or `/en/dashboard`).

<a id="default-credentials"></a>
> **Default Admin Credentials (Development / Seeding):**
> - **Email:** `admin@masar.local`
> - **Password:** `Admin@12345`

---

## 📦 Project Structure

```text
src/
├── app/
│   ├── [locale]/
│   │   ├── (auth)/             # Public authentication (Login, Recovery)
│   │   ├── (dashboard)/        # Authenticated ERP domains
│   │   │   ├── dashboard/      # Executive KPIs & Analytics
│   │   │   ├── accounting/     # Journal Entries, COA, Reports
│   │   │   ├── inventory/      # Products, Warehouses, Stock
│   │   │   ├── sales/          # Invoices, Quotations, Customers
│   │   │   ├── purchasing/     # Purchase Orders, Vendors, Bills
│   │   │   ├── hr/             # Employees, Leaves, Payroll
│   │   │   └── settings/       # Company profile, Roles & Permissions
│   │   ├── layout.tsx          # Localized root layout (RTL/LTR & fonts)
│   │   └── page.tsx            # Index redirector
│   ├── api/
│   │   ├── cron/               # Protected cron jobs (timingSafeEqual auth)
│   │   └── health/             # Minimal public health check endpoint
│   └── globals.css             # Tailwind v4 theme design tokens
├── components/
│   ├── ui/                     # Accessible shadcn/ui components
│   └── shared/                 # Data tables, confirm dialogs, chart cards
├── features/                   # Feature-sliced domain architecture
│   ├── accounting/             # Services, queries, actions, schemas
│   ├── auth/                   # RBAC, login forms, session providers
│   ├── inventory/              # Concurrency locks, stock deduction
│   ├── sales/                  # Invoicing actions, payments
│   └── hr/                     # Leave calculators, payroll runs
├── lib/
│   ├── auth.ts                 # Auth.js v5 handler
│   ├── auth.config.ts          # Edge-compatible session validation
│   ├── db.ts                   # Prisma singleton
│   ├── rate-limit.ts           # PostgreSQL-backed rate limiter
│   └── rbac.ts                 # Role-based permissions verifier
└── messages/
    ├── ar.json                 # Arabic localization dictionary
    └── en.json                 # English localization dictionary
```

---

<a id="production-deployment"></a>
## 🚢 Production Deployment

### 1. Required Environment Variables

| Variable | Type | Purpose |
|---|---|---|
| `DATABASE_URL` | PostgreSQL URI | Production database connection string (`postgresql://...`) |
| `AUTH_SECRET` | 32+ char string | NextAuth v5 token encryption (`openssl rand -base64 32`) |
| `CRON_SECRET` | 24+ char string | Bearer token for securing automated cron API endpoints |
| `BLOB_READ_WRITE_TOKEN` | Vercel Token | Object storage for receipts, invoices, and documents |
| `ADMIN_INITIAL_PASSWORD` | Secure password | Initial password for `admin@masar.local` during first-time seed |
| `AUTH_TRUST_HOST` | `true` | Required behind Vercel / reverse proxy |

### 2. Strict Deployment Order

```bash
# 1. Install exact locked dependencies
npm ci

# 2. Deploy database migrations safely
npm run db:deploy

# 3. Seed production essentials idempotently (COA, roles, permissions)
npm run db:seed:prod

# 4. Generate Prisma engine & build production bundle
npm run build
```

---

<a id="tests"></a>
## 🧪 Testing & Verification

The codebase is hardened with comprehensive unit, integration, and end-to-end tests:

```bash
# Run strict TypeScript validation
npm run typecheck

# Run ESLint checks
npm run lint

# Run unit & integration test suite (Vitest)
npm run test

# Run end-to-end user workflows & concurrency tests (Playwright)
npm run test:e2e
```

---

## 📄 License & Attribution

Architected and developed by **[Gamal Ahmed](https://github.com/ga5e8je99)**.  
Licensed under the [MIT License](LICENSE).
