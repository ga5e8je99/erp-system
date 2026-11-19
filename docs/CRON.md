# Masar ERP — Scheduled Tasks & Cron Documentation

Masar ERP exposes automated background worker routes designed to run on periodic cron schedules.

---

## 1. Notification Scanner Endpoint

- **Endpoint:** `GET /api/cron/notifications` or `POST /api/cron/notifications`
- **Purpose:** Automatically scans inventory stock levels, customer invoice due dates, and pending leave requests to create in-app notifications.
- **Deduplication:** Notifications for the same document (product, invoice, or leave request) are throttled to a maximum of 1 per 24 hours.

### Authentication
The endpoint requires authentication using `CRON_SECRET`.
Set `CRON_SECRET` in your `.env` file:
```env
CRON_SECRET="your-secure-random-secret"
```

Pass the token either as a Bearer token or as a URL query parameter:
1. **Authorization Header (Recommended):**
   ```http
   Authorization: Bearer your-secure-random-secret
   ```
2. **Query Parameter:**
   ```http
   /api/cron/notifications?secret=your-secure-random-secret
   ```

---

## 2. Cron Invocation Examples

### A. Linux crontab (Every hour)
Run `crontab -e` and add:
```bash
0 * * * * curl -s -H "Authorization: Bearer your-secure-random-secret" https://your-masar-erp.com/api/cron/notifications > /dev/null
```

### B. Vercel Cron (`vercel.json`)
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

### C. Systemd Timer or Docker Sidecar (Daily at 08:00 AM)
```bash
curl -X POST https://your-masar-erp.com/api/cron/notifications \
  -H "Authorization: Bearer your-secure-random-secret"
```

---

## 3. Sample Response

```json
{
  "success": true,
  "timestamp": "2026-11-17T04:00:00.123Z",
  "generated": {
    "lowStockNotifications": 3,
    "overdueInvoiceNotifications": 1,
    "leaveRequestNotifications": 2,
    "total": 6
  }
}
```
