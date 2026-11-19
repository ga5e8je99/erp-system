# Masar ERP — Scheduled Tasks & Cron Documentation

Masar ERP exposes automated background worker routes designed to run on periodic cron schedules.

---

## 1. Notification Scanner Endpoint

- **Endpoint:** `GET /api/cron/notifications` or `POST /api/cron/notifications`
- **Purpose:** Automatically scans inventory stock levels, customer invoice due dates, and pending leave requests to create in-app notifications.
- **Deduplication:** Notifications for the same document (product, invoice, or leave request) are throttled to a maximum of 1 per 24 hours.

### Authentication & Security Requirements

The endpoint is strictly protected by `CRON_SECRET`:
- **Production Requirement:** `CRON_SECRET` must be at least 24 characters long in production environments.
- **Header Only:** Authentication MUST be passed via the HTTP `Authorization` header:
  ```http
  Authorization: Bearer <CRON_SECRET>
  ```
- **Query Parameter Rejected:** Query strings (e.g. `?secret=...`) are **strictly prohibited and rejected with HTTP 401** to prevent secrets from leaking into server access logs, browser history, reverse proxy traces, or referrer headers.
- **Timing-Safe Comparison:** The token is validated using Node.js `crypto.timingSafeEqual` to prevent timing side-channel attacks.
- **Error Obfuscation:** The endpoint returns a generic `"Internal Server Error"` on failures to avoid leaking stack traces or internal details.

Set `CRON_SECRET` in your `.env` or cloud provider environment settings:
```env
CRON_SECRET="your-secure-random-secret-at-least-24-characters-long"
```

---

## 2. Cron Invocation Examples

### A. Curl Command
```bash
curl -X POST https://your-masar-erp.com/api/cron/notifications \
  -H "Authorization: Bearer your-secure-random-secret-at-least-24-characters-long"
```

### B. Linux Crontab (Every hour)
Run `crontab -e` and add:
```bash
0 * * * * curl -s -X POST -H "Authorization: Bearer your-secure-random-secret-at-least-24-characters-long" https://your-masar-erp.com/api/cron/notifications > /dev/null
```

### C. Vercel Cron (`vercel.json`)
When deploying to Vercel, configure static schedules in `vercel.json`. Vercel automatically attaches the configured `CRON_SECRET` as a Bearer token:
```json
{
  "crons": [
    {
      "path": "/api/cron/notifications",
      "schedule": "0 * * * *"
    }
  ]
}
```

---

## 3. Sample Response

```json
{
  "success": true,
  "timestamp": "2026-11-19T10:00:00.123Z",
  "generated": {
    "lowStockNotifications": 3,
    "overdueInvoiceNotifications": 1,
    "leaveRequestNotifications": 2,
    "total": 6
  }
}
```
