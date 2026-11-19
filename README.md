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
- pgAdmin on `localhost:5050` (user: `admin@masar.local`, pass: `adminpassword`)

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

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start development server on port 3000 |
| `npm run build` | Build optimized production bundle |
| `npm run start` | Run production server |
| `npm run typecheck` | Run strict TypeScript checks without emit |
| `npm run lint` | Run ESLint across codebase |
| `npm run test` | Run unit tests with Vitest |
| `npm run test:e2e` | Run end-to-end browser tests with Playwright |
| `npm run db:migrate` | Run Prisma migrations in development |
| `npm run db:seed` | Seed database using `tsx prisma/seed.ts` |
| `npm run db:studio` | Open Prisma Studio database viewer |

---

## Documentation
- Production deployment guide: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- Architecture guidelines: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Architectural Decision Records: [docs/DECISIONS.md](docs/DECISIONS.md)
# erp-system
