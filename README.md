# AllianceAccounting portal

A Next.js 15 App Router and TypeScript application for AllianceAccounting & Financial Services, Inc. It includes a public firm website, authenticated client portal, staff/admin workspace, PostgreSQL persistence through Prisma, Auth.js role-based sessions, secure S3 document workflows, encrypted messaging, Resend notifications, and audit logging.

## Technology

- Next.js 15.5, React 19, TypeScript
- PostgreSQL and Prisma ORM with committed migrations
- Auth.js credentials authentication and role-aware JWT sessions
- bcrypt password hashing, email verification, and expiring password-reset tokens
- AES-256-GCM application encryption for sensitive text
- Private AWS S3 storage, server-side encryption, quarantine scanning, and signed downloads
- Resend transactional notifications
- Zod request validation

## Local setup

1. Copy `.env.example` to `.env` and replace every placeholder.
2. Create a PostgreSQL database and set `DATABASE_URL`.
3. Generate a 32-byte encryption key in PowerShell and add the output to `DATA_ENCRYPTION_KEY`:

```powershell
$bytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
[Convert]::ToBase64String($bytes)
```

4. Install dependencies and apply the database migration:

```powershell
npm.cmd install
npm.cmd run db:generate
npm.cmd run db:deploy
```

5. Optionally seed the guarded admin, staff, and client fixtures described in [Local Seed Users](SEED_USERS.md):

```powershell
npm.cmd run db:seed
```

6. Start the app:

```powershell
npm.cmd run dev
```

Open `http://localhost:3000`.

For a plain-language walkthrough covering local setup, cloud accounts, PostgreSQL, AWS S3, Resend, hosting choices, costs, troubleshooting, and launch checks, see the [non-developer deployment guide](docs/DEPLOYMENT_GUIDE.md).

Additional documentation:

- [Local testing checklist](LOCAL_TESTING_CHECKLIST.md)
- [Local seed users](SEED_USERS.md)
- [System architecture](docs/SYSTEM_ARCHITECTURE.md)
- [Staff and administrator guide](docs/ADMIN_USER_GUIDE.md)
- [Client portal guide](docs/CLIENT_USER_GUIDE.md)

## Production deployment

Run `npm run db:deploy` during release, followed by `npm run build` and `npm start`. Configure HTTPS/HSTS at the hosting layer and use a pooled PostgreSQL connection. The initial migration is committed at `prisma/migrations/20260620000000_phase2_initial/migration.sql`.

The S3 bucket must be private, versioned, blocked from public access, and encrypted using KMS or AES-256. New uploads remain `PENDING` and cannot be downloaded until scanning reports `CLEAN`. Configure the scanner to POST to `/api/documents/scan-result` with `x-scan-webhook-secret`. Authorized downloads use 60-second signed S3 URLs.

Required production variables are documented in `.env.example`. Generate `AUTH_SECRET` and `DATA_ENCRYPTION_KEY` independently and store them in the deployment platform, never source control.

## Authorization model

- `CLIENT`: access only to their profile, documents, messages, invoices, tax returns, tasks, IRS authorizations, and service requests.
- `STAFF`: client workflow and communication access.
- `ADMIN`: staff access plus administrative operations.
- Protected layouts and every API handler independently enforce roles and object ownership.

## Data and security

The Prisma schema covers Auth.js records, roles, client profiles, documents and requests, the 16-step tax workflow, messages and attachments, invoices, tasks, internal notes, service requests, IRS authorization tracking, leads, and audit logs.

Message bodies and service-request details use AES-256-GCM with a unique nonce and authentication tag per value. Protect and rotate `DATA_ENCRYPTION_KEY` through your cloud key-management process. Resend notifications contain portal links and non-sensitive summaries only; financial message contents are never copied into email. Never store SSNs in plain text.

IRS records are accessed only with taxpayer authorization through approved IRS e-Services/TDS processes. There is no public IRS API integration.

## Validation

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
npm.cmd audit
npx.cmd prisma validate
```

## Phase 3 integrations

Stripe Checkout sessions are created for unpaid client invoices and finalized only by signature-verified, idempotent webhook processing at `/api/stripe/webhook`. Configure that endpoint in Stripe and subscribe to `checkout.session.completed` and `checkout.session.expired`. Card data is handled by Stripe and is not stored by this application.

Phase 3 also adds encrypted tax-organizer submissions, client task checklists, appointment requests and staff confirmation links, a staff workflow manager, and searchable/paginated audit-log views. IRS functionality remains limited to taxpayer authorization and manually recorded status workflows; there is no direct IRS API access.

Before handling taxpayer information, complete threat modeling, penetration testing, backup/restore testing, incident-response exercises, staff security training, retention policies, vendor reviews, and an IRS Publication 4557-aligned Written Information Security Plan.
