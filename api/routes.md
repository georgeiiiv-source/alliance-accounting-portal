# API surface

All routes require CSRF protection, rate limiting, schema validation, secure cookies, and role checks. Client access is scoped to the authenticated client ID; staff access is scoped by assignment; admin access is audited.

- `POST /api/auth/register|verify-email|login|mfa|forgot-password|reset-password`
- `GET|PATCH /api/profile`
- `GET|POST /api/documents`; `POST /api/documents/presign`; `GET /api/documents/:id/download`
- `GET|POST /api/document-requests`; `PATCH /api/document-requests/:id`
- `GET /api/tax-returns/:id/status`; `PATCH /api/admin/tax-returns/:id/status`
- `GET|POST /api/messages/threads`; `POST /api/messages/threads/:id/replies`
- `GET /api/invoices`; `POST /api/admin/invoices`; `POST /api/invoices/:id/pay`
- `POST /api/webhooks/stripe` (verify raw-body signature; idempotent event processing)
- `GET|POST /api/tasks`; `POST /api/service-requests`; `GET|POST /api/appointments`
- `POST /api/irs-authorizations`; `PATCH /api/admin/irs-authorizations/:id/verify`
- `GET /api/admin/clients`; `GET /api/admin/audit-logs`; `GET /api/admin/clients.csv`

Notification jobs are queued transactionally for verification, password reset, document requests/reminders, messages, invoices, and tax-status events. Templates must never include sensitive document content.
