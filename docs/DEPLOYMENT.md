# Production Deployment Guide — Masar ERP (مسار)

This guide provides step-by-step instructions for deploying Masar ERP to production environments. It covers containerized VPS deployments via Docker Compose, serverless deployment on Vercel with managed PostgreSQL, database migration and backup strategies, and a comprehensive pre-launch checklist.

---

## 1. Architecture Overview

Masar ERP is a multi-tenant-ready enterprise resource planning application built on Next.js 15 (standalone server output) and PostgreSQL.

```
                  ┌──────────────────────────────────────────┐
                  │       Client Browser (HTTPS / WSS)       │
                  └────────────────────┬─────────────────────┘
                                       │ Port 443 / 80
                                       ▼
                  ┌──────────────────────────────────────────┐
                  │      Caddy / Nginx Reverse Proxy         │
                  │   - Automatic Let's Encrypt TLS          │
                  │   - Gzip / Zstandard Compression         │
                  │   - Static Asset & Upload Caching        │
                  └────────────────────┬─────────────────────┘
                                       │ Reverse Proxy :3000
                                       ▼
                  ┌──────────────────────────────────────────┐
                  │    Masar ERP Next.js Standalone Node     │
                  │   - Multi-stage Alpine container         │
                  │   - Non-root user (nextjs:nodejs)        │
                  │   - Structured Pino JSON logging         │
                  │   - Zod environment validation           │
                  │   - /api/health probe                    │
                  └────────────────────┬─────────────────────┘
                                       │ Connection Pool :5432
                                       ▼
                  ┌──────────────────────────────────────────┐
                  │          PostgreSQL 16 Database          │
                  │   - Prisma ORM Migration Management      │
                  │   - ACID Financial & Stock Transactions  │
                  │   - Named Docker Volume (masar_pgdata)   │
                  └──────────────────────────────────────────┘
```

---

## 2. System Requirements & Prerequisites

### Minimum Hardware (Production VPS)
- **CPU**: 2 vCPU cores (4 vCPU recommended for >50 concurrent users)
- **RAM**: 4 GB (8 GB recommended)
- **Disk**: 40 GB NVMe / SSD (scaled based on document attachments and audit log volume)
- **Operating System**: Ubuntu 22.04 LTS, Debian 12, or AlmaLinux 9

### Required Software
- **Docker Engine**: Version 24.0 or higher
- **Docker Compose**: Version 2.20 or higher (`docker compose` v2 plugin)
- **Git**: For source checkout and version management
- **DNS**: A / AAAA record pointing `erp.yourcompany.com` to your server's public IP address

---

## 3. Option A: Containerized VPS Deployment (Docker Compose)

This is the recommended deployment method for complete data sovereignty, localized storage, and unified container lifecycle management.

### Step 1: Clone Repository & Set Permissions

```bash
# Clone the repository
git clone https://github.com/your-org/masar-erp.git /opt/masar-erp
cd /opt/masar-erp

# Ensure secure file permissions
chmod 700 /opt/masar-erp
```

### Step 2: Configure Production Environment Variables

Copy the provided environment template:

```bash
cp .env.example .env
```

Generate secure random secrets:

```bash
# Generate AUTH_SECRET (32 bytes base64)
AUTH_SECRET=$(openssl rand -base64 32)
echo "Generated AUTH_SECRET: $AUTH_SECRET"

# Generate CRON_SECRET (24 bytes hex)
CRON_SECRET=$(openssl rand -hex 24)
echo "Generated CRON_SECRET: $CRON_SECRET"

# Generate DB Password
DB_PASS=$(openssl rand -base64 24)
echo "Generated DB Password: $DB_PASS"
```

Edit `.env` using your preferred editor (`nano .env` or `vim .env`):

```dotenv
# Database Configuration
POSTGRES_USER="masar_user"
POSTGRES_PASSWORD="<INSERT_DB_PASS>"
POSTGRES_DB="masar_erp"
DATABASE_URL="postgresql://masar_user:<INSERT_DB_PASS>@postgres:5432/masar_erp?schema=public"

# Authentication & URL
AUTH_SECRET="<INSERT_AUTH_SECRET>"
AUTH_TRUST_HOST="true"
NEXT_PUBLIC_APP_URL="https://erp.yourcompany.com"

# Cron Security
CRON_SECRET="<INSERT_CRON_SECRET>"

# Reverse Proxy / SSL (Caddy)
DOMAIN="erp.yourcompany.com"
ACME_EMAIL="sysadmin@yourcompany.com"

# Production Seeding Options
ADMIN_INITIAL_PASSWORD="<INITIAL_STRONG_ADMIN_PASSWORD>"
SEED_DEMO_DATA="false"
```

### Step 3: Start the PostgreSQL Database

Start the database service and verify health:

```bash
docker compose up -d postgres
docker compose ps postgres
```

Wait until `postgres` reports `healthy` (takes ~5 seconds).

### Step 4: Apply Database Migrations & Safe Seed

Apply pending schema migrations using `prisma migrate deploy`:

```bash
# Run migrations inside a temporary app container
docker compose run --rm app npx prisma migrate deploy
```

Execute the safe idempotent seed script:

```bash
# Seeds roles, permissions, chart of accounts, and default admin
docker compose run --rm app npx tsx prisma/seed.ts
```

> **Safe Seed Guarantee**: `prisma/seed.ts` uses idempotent upserts (`update: {}`). It creates missing system accounts and permissions without overwriting existing user passwords, customer balances, stock counts, or document sequence numbers. When `SEED_DEMO_DATA="false"`, sample products and demo invoices are skipped.

### Step 5: Start the Complete Stack with SSL Proxy

Launch the application container along with the Caddy reverse proxy:

```bash
# Launch with the 'proxy' profile (includes Caddy with automatic Let's Encrypt TLS)
docker compose --profile proxy up -d --build
```

Verify all containers are running and healthy:

```bash
docker compose --profile proxy ps
```

Expected output:
```text
NAME             IMAGE               STATUS                   PORTS
masar-postgres   postgres:16-alpine  Up (healthy)             5432/tcp
masar-app        masar-erp-app       Up (healthy)             0.0.0.0:3000->3000/tcp
masar-caddy      caddy:2-alpine      Up                       0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
```

### Step 6: Verify Application Logs & Health

Check application boot logs:

```bash
docker compose logs -f app
```

Verify the health check endpoint:

```bash
curl -i http://localhost:3000/api/health
```

Expected response (`HTTP 200 OK`):
```json
{
  "status": "ok",
  "timestamp": "2026-11-16T23:15:00.000Z",
  "uptime": 45.2,
  "version": "1.0.0",
  "db": {
    "status": "connected",
    "latencyMs": 3.4
  }
}
```

---

## 4. Alternative: Nginx Reverse Proxy Configuration

If your infrastructure standardizes on Nginx rather than Caddy, omit the `--profile proxy` flag and configure Nginx on the host:

```nginx
# /etc/nginx/sites-available/masar-erp.conf
server {
    listen 80;
    server_name erp.yourcompany.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name erp.yourcompany.com;

    ssl_certificate /etc/letsencrypt/live/erp.yourcompany.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/erp.yourcompany.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    client_max_body_size 15M;

    # Static file uploads
    location /uploads/ {
        alias /var/lib/docker/volumes/masar-erp_masar_uploads/_data/;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    # Next.js Application Proxy
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }
}
```

---

## 5. Option B: Vercel + Managed PostgreSQL Deployment

Deploying Masar ERP to Vercel requires a managed PostgreSQL provider (e.g., Neon, Supabase, AWS RDS, or Aiven) with connection pooling.

### Step 1: Provision Managed PostgreSQL
Create a database with connection pooling enabled (e.g. pgBouncer). Copy your connection string:
- Direct URL: `postgresql://user:password@ep-host.region.aws.neon.tech/masar_erp?sslmode=require`
- Pooled URL: `postgresql://user:password@ep-host-pooler.region.aws.neon.tech/masar_erp?sslmode=require&pgbouncer=true`

Set `DATABASE_URL` to the pooled connection string.

### Step 2: Configure Environment Variables in Vercel

In **Vercel Project Settings → Environment Variables**, configure:

| Variable Name | Environment | Value Description |
|---|---|---|
| `DATABASE_URL` | Production, Preview | Pooled PostgreSQL connection string |
| `AUTH_SECRET` | Production, Preview | Generated 32-character secret |
| `AUTH_TRUST_HOST` | Production, Preview | `true` |
| `NEXT_PUBLIC_APP_URL` | Production | `https://erp.yourcompany.com` |
| `CRON_SECRET` | Production, Preview | Strong token for `/api/cron/*` endpoints |
| `SEED_DEMO_DATA` | Production | `false` |

### Step 3: Build & Deployment Settings

1. **Build Command**:
   ```bash
   npx prisma generate && next build
   ```
2. **Install Command**:
   ```bash
   npm ci
   ```
3. **Output Directory**: `.next`

### Step 4: Run Migrations Before Deployment

Because serverless runtime cannot execute DDL commands safely during page requests, run migrations via GitHub Actions or your local terminal before promoting to production:

```bash
DATABASE_URL="<DIRECT_UNPOOLED_POSTGRES_URL>" npx prisma migrate deploy
```

Then seed essential roles and accounts:

```bash
DATABASE_URL="<DIRECT_UNPOOLED_POSTGRES_URL>" SEED_DEMO_DATA="false" npx tsx prisma/seed.ts
```

> **Important (Serverless Storage)**: The Vercel runtime filesystem is ephemeral. Company logos uploaded through `/api/settings/logo` are stored locally in `/public/uploads`. For a fully serverless deployment, mount an S3-compatible bucket (AWS S3, Cloudflare R2, or Vercel Blob) or use the VPS Docker deployment.

---

## 6. Environment Variable Reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | PostgreSQL connection URI (`postgresql://...`) |
| `AUTH_SECRET` | Yes | — | Encryption key for Auth.js sessions (min 16 chars, 32 recommended) |
| `AUTH_TRUST_HOST` | No | `true` | Trust reverse proxy `X-Forwarded-*` headers |
| `NEXT_PUBLIC_APP_URL` | Yes | `http://localhost:3000` | Canonical public URL used for absolute redirects and QR codes |
| `CRON_SECRET` | Yes | `masar_cron_secret` | Bearer token authenticating automated background cron tasks |
| `NODE_ENV` | No | `production` | Node execution environment |
| `ADMIN_INITIAL_PASSWORD` | No | `Admin@12345` | Password assigned to `admin@masar.local` during initial seeding |
| `SEED_DEMO_DATA` | No | `false` | Set to `"true"` to seed sample inventory, sales, and customers |
| `DOMAIN` | VPS | `localhost` | Production domain used by Caddy for automated TLS certificates |
| `ACME_EMAIL` | VPS | `admin@example.com`| Contact email for Let's Encrypt certificate renewal alerts |
| `ERROR_WEBHOOK_URL` | No | — | Optional Slack/Discord webhook for centralized error notifications |

---

## 7. Health Checks & Monitoring

### Health Endpoint: `/api/health`

Masar ERP exposes a zero-dependency health check endpoint supporting both `GET` and `HEAD` methods.

- **URL**: `https://erp.yourcompany.com/api/health`
- **Cache Policy**: `Cache-Control: no-cache, no-store, must-revalidate`
- **Response Format**:
  ```json
  {
    "status": "ok",
    "timestamp": "2026-11-16T23:15:00.000Z",
    "uptime": 1284.5,
    "version": "1.0.0",
    "db": {
      "status": "connected",
      "latencyMs": 2.1
    }
  }
  ```
- **Error Response (`HTTP 503 Service Unavailable`)**:
  Returned when the database connection fails or queries time out (>3000ms).

### Setting Up Uptime Monitoring

Configure external monitoring (e.g. Uptime Kuma, Better Stack, Datadog) to probe:
- **Target**: `GET https://erp.yourcompany.com/api/health`
- **Expected Status**: `200`
- **Interval**: 30–60 seconds
- **Timeout**: 5 seconds

---

## 8. Automated Background Tasks (Cron)

Masar ERP includes background processors for automated daily recurring tasks (e.g., invoice payment reminders, low-stock threshold notifications).

### Triggering via System Crontab (VPS)

Set up a root cron entry to invoke the protected cron endpoint daily at 06:00 AM:

```bash
# Open crontab editor
crontab -e

# Add automated daily notification check
0 6 * * * curl -s -X POST -H "Authorization: Bearer <YOUR_CRON_SECRET>" http://127.0.0.1:3000/api/cron/notifications > /var/log/masar-cron.log 2>&1
```

### Triggering via External Scheduler (Vercel / Cloudflare)

Configure GitHub Actions, Cloudflare Workers, or Vercel Cron to send an authenticated POST request:

```bash
curl -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  https://erp.yourcompany.com/api/cron/notifications
```

---

## 9. PostgreSQL Backup & Disaster Recovery (DR)

### Manual Backup Command

To create an immediate compressed database dump:

```bash
BACKUP_DIR="/var/backups/masar-erp"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
docker exec -t masar-postgres pg_dump -U masar_user -d masar_erp -F p | gzip > "$BACKUP_DIR/backup_${TIMESTAMP}.sql.gz"

echo "Backup saved to: $BACKUP_DIR/backup_${TIMESTAMP}.sql.gz"
```

### Automated Daily Backup Script

Create `/usr/local/bin/masar-backup.sh`:

```bash
#!/usr/bin/env bash
set -eo pipefail

BACKUP_DIR="/var/backups/masar-erp"
RETENTION_DAYS=14
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/masar_db_${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

# Execute pg_dump inside container and compress
docker exec -t masar-postgres pg_dump -U masar_user -d masar_erp --clean --if-exists | gzip > "${BACKUP_FILE}"

# Delete backups older than retention window
find "${BACKUP_DIR}" -type f -name "masar_db_*.sql.gz" -mtime +"${RETENTION_DAYS}" -delete

echo "[$(date -Iseconds)] Backup created successfully: ${BACKUP_FILE}"
```

Make the script executable and add to crontab:

```bash
chmod +x /usr/local/bin/masar-backup.sh

# Run every night at 02:00 AM
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/masar-backup.sh >> /var/log/masar-backup.log 2>&1") | crontab -
```

### Database Restoration Procedure

To restore a database backup:

```bash
# 1. Stop application container to prevent incoming writes
docker compose stop app

# 2. Uncompress and restore dump into PostgreSQL container
BACKUP_TO_RESTORE="/var/backups/masar-erp/masar_db_20261116_020000.sql.gz"

gunzip -c "$BACKUP_TO_RESTORE" | docker exec -i masar-postgres psql -U masar_user -d masar_erp

# 3. Restart the application
docker compose start app

# 4. Verify system health
curl -s http://localhost:3000/api/health
```

---

## 10. Zero-Downtime Application Updates

To deploy an updated release with minimal disruption:

```bash
cd /opt/masar-erp

# 1. Fetch latest changes
git pull origin main

# 2. Build the updated standalone image
docker compose build app

# 3. Apply any new schema migrations
docker compose run --rm app npx prisma migrate deploy

# 4. Recreate the application container
docker compose up -d --no-deps app

# 5. Clean up unused images
docker image prune -f
```

---

## 11. Production Go-Live Checklist

Complete all checklist items before opening Masar ERP to production users.

### Security & Credentials
- [ ] **Strong Secrets**: Verified `AUTH_SECRET` is at least 32 characters, randomly generated via `openssl rand -base64 32`.
- [ ] **Cron Protection**: `CRON_SECRET` changed from default value.
- [ ] **Default Admin Password**: Initial administrator (`admin@masar.local`) password reset immediately upon first login.
- [ ] **PostgreSQL Password**: Database password in `.env` is cryptographically strong and not using default templates.
- [ ] **No Secrets in Client**: Verified client bundle does not expose server keys or database connection strings.

### Infrastructure & Networking
- [ ] **DNS Records**: A/AAAA records configured and propagated to the production server IP.
- [ ] **TLS / HTTPS**: Caddy or Nginx successfully issued an SSL certificate with valid automatic renewals.
- [ ] **Firewall**: UFW / iptables configured to allow only ports `22` (SSH), `80` (HTTP), and `443` (HTTPS). PostgreSQL port `5432` must NOT be exposed to the public internet.
- [ ] **Docker Restart Policies**: Containers set to `restart: unless-stopped`.
- [ ] **Uploads Persistence**: Named volume `masar_uploads` mounted to `/app/public/uploads`.

### Database & Data Integrity
- [ ] **Migrations Deployed**: `prisma migrate deploy` reported zero pending migrations.
- [ ] **Production Seed**: `SEED_DEMO_DATA=false` executed; essential chart of accounts, currencies, and roles created.
- [ ] **Automated Backups**: Nightly cron backup script tested, verified with a test restore on a staging instance.
- [ ] **Retention Schedule**: Backup retention configured to retain 14 daily copies.

### Application & Operations
- [ ] **Health Check Monitored**: External uptime monitor active on `https://erp.yourcompany.com/api/health`.
- [ ] **Structured Logging**: Application logs verified in JSON format via `docker compose logs app`.
- [ ] **Company Profile Configured**: Legal entity name, base currency (SAR/USD/etc.), tax number, and fiscal year set in **Settings → Company Profile**.
- [ ] **User Accounts Provisioned**: Production employees and accountants invited with least-privilege role assignments.
