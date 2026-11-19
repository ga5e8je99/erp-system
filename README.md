# Masar ERP (مسار)

A production-grade, full-stack ERP system built for small and medium trading and distribution companies.

## Tech Stack
- **Framework:** Next.js 15 (App Router, Server Actions) + React 19 + TypeScript (strict mode)
- **Database & ORM:** PostgreSQL 16 + Prisma ORM
- **Authentication & RBAC:** Auth.js v5 (NextAuth.js beta) with JWT sessions and role-based permissions
- **Styling & UI:** Tailwind CSS v4 + shadcn/ui + Lucide React + CVA
- **Data Grids & State:** TanStack Table + TanStack Query
- **Forms & Validation:** React Hook Form + Zod (shared schemas)
- **Internationalization (i18n):** next-intl with Arabic (RTL, default) & English (LTR)
- **Fonts:** Cairo (Arabic) & Inter (English/Latin) via `next/font`
- **Charts:** Recharts
- **Testing:** Vitest (unit/integration) + Playwright (e2e)
- **DevOps:** Docker Compose (PostgreSQL 16 + pgAdmin)

---

## Getting Started

### 1. Prerequisites
- Node.js >= 20
- npm >= 10
- Docker & Docker Compose

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default connection string connects to local PostgreSQL on port 5432.

### 3. Start Database Containers
```bash
docker compose up -d
```
This spins up:
- PostgreSQL 16 on `localhost:5432`
- pgAdmin on `localhost:5050` (Local development only — user: `admin@masar.local`, pass: `adminpassword`. Never expose pgAdmin in production environments.)

### 4. Install Dependencies
```bash
npm install
```

### 5. Generate Prisma Client & Migrate
```bash
npm run db:migrate
npm run db:seed
```

### 6. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) (redirects to default Arabic locale at `/ar`, or visit `/en` for English).

---

## Project Structure

```text
src/
├── app/
│   ├── [locale]/
│   │   ├── (auth)/             # Public auth routes (login, forgot-password)
│   │   ├── (dashboard)/        # Protected ERP routes (inventory, sales, etc.)
│   │   ├── layout.tsx          # Root localized layout (lang, dir, fonts)
│   │   └── page.tsx            # Home / landing overview page
│   ├── api/                    # Route handlers (webhooks, exports only)
│   └── globals.css             # Tailwind v4 theme variables
├── components/
│   ├── ui/                     # shadcn/ui base components
│   └── shared/                 # Reusable domain components (DataTable, PageHeader, etc.)
├── features/                   # Feature-sliced ERP modules
│   ├── auth/
│   ├── dashboard/
│   ├── inventory/
│   ├── sales/
│   ├── purchasing/
│   ├── accounting/
│   ├── hr/
│   ├── reports/
│   └── settings/
├── i18n/                       # next-intl routing and request configuration
├── lib/
│   ├── db.ts                   # Prisma client singleton
│   ├── auth.ts                 # NextAuth v5 configuration
│   ├── rbac.ts                 # Role-based access control engine
│   ├── money.ts                # Integer minor units money math & formatting
│   ├── audit.ts                # Server action audit logger
│   └── utils.ts                # Class merging utility (clsx + tailwind-merge)
└── messages/
    ├── ar.json                 # Arabic translation strings
    └── en.json                 # English translation strings
```

---

## Production Deployment

### 1. Required Environment Variables

Configure these variables in your hosting environment (Vercel Project Settings or `.env` on VPS):

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Direct or pooled PostgreSQL connection string (`postgresql://...`) |
| `AUTH_SECRET` | Yes | 32+ character random secret (`openssl rand -base64 32`) |
| `CRON_SECRET` | Yes | 24+ character secret for securing automated cron endpoints (`openssl rand -hex 24`) |
| `BLOB_READ_WRITE_TOKEN` | Yes (Vercel) | Vercel Blob token for cloud file uploads (receipts, avatars, logos) |
| `ADMIN_INITIAL_PASSWORD` | Yes (Prod Seed) | Secure initial password assigned to `admin@masar.local` during first-time seeding |
| `AUTH_TRUST_HOST` | Recommended | Set to `true` behind reverse proxies (Vercel, Caddy, Nginx) |
| `NEXT_PUBLIC_APP_URL` | Recommended | Canonical domain URL (e.g. `https://erp.yourcompany.com`) |

### 2. Deployment Command Sequence

Always execute production deployments in this strict sequence:

```bash
# Step 1: Install pinned dependencies cleanly
npm ci

# Step 2: Apply database migrations safely
npm run db:deploy

# Step 3: Seed essential system data (idempotent: Chart of Accounts, roles, permissions, admin)
npm run db:seed:prod

# Step 4: Build optimized Next.js production bundle
npm run build
```

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start development server on port 3000 |
| `npm run build` | Build optimized production bundle (`prisma generate && next build`) |
| `npm run start` | Run production server |
| `npm run typecheck` | Run strict TypeScript checks without emit |
| `npm run lint` | Run ESLint across codebase |
| `npm run test` | Run unit & integration tests with Vitest |
| `npm run test:e2e` | Run end-to-end browser & accessibility tests with Playwright |
| `npm run db:migrate` | Create or run Prisma migrations in development (`prisma migrate dev`) |
| `npm run db:deploy` | Apply pending Prisma migrations in production (`prisma migrate deploy`) |
| `npm run db:seed` | Seed development database with mock business data (`tsx prisma/seed.ts`) |
| `npm run db:seed:prod` | Seed production essentials only (COA, roles, permissions, initial admin) |
| `npm run db:studio` | Open Prisma Studio database viewer |

---

## Documentation
- Production deployment guide: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- Security & hardening review: [docs/REVIEW.md](docs/REVIEW.md)
- Scheduled tasks & cron: [docs/CRON.md](docs/CRON.md)
- Architecture guidelines: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Architectural Decision Records: [docs/DECISIONS.md](docs/DECISIONS.md)
