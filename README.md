# AllianceAccounting production foundation

A Next.js 15 App Router and TypeScript application for AllianceAccounting & Financial Services, Inc. It includes a public accounting-firm website, an authenticated client portal, staff/admin workspace, PostgreSQL persistence through Prisma, Auth.js role-based sessions, secure S3 document intake, and audited business APIs.

## Technology

- Next.js 15.5 App Router, React 19, TypeScript
- PostgreSQL and Prisma ORM
- Auth.js credentials authentication with JWT sessions
- bcrypt password hashing and email-verification tokens
- AWS S3 private object storage with server-side encryption
- Resend-compatible email delivery boundary
- Zod request validation

## Local setup

1. Copy `.env.example` to `.env` and replace every placeholder.
2. Create a PostgreSQL database and set `DATABASE_URL`.
3. Install and initialize:

```bash
npm install
npm run db:generate
npm run db:migrate -- --name initial
```

4. To add development accounts, set `SEED_ADMIN_PASSWORD` and `SEED_CLIENT_PASSWORD`, then run:

```bash
npm run db:seed
```

5. Start the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Production deployment

Run `npm run db:deploy` during release, then `npm run build` and `npm start`. Configure HTTPS/HSTS at the hosting layer and use a pooled PostgreSQL connection. The S3 bucket must be private, versioned, encrypted, blocked from public access, and connected to a malware-scanning quarantine workflow. A newly uploaded document remains `PENDING`; only scanner infrastructure should mark it `CLEAN`.

Required production variables are documented in `.env.example`. Generate `AUTH_SECRET` with at least 32 cryptographically random bytes. Store secrets in the deployment platform—not source control.

## Authorization model

- `CLIENT`: only their profile, documents, messages, invoices, tax returns, tasks, IRS authorizations, and service requests.
- `STAFF`: firm workflow access and client operations.
- `ADMIN`: staff access plus administrative operations.
- Protected server layouts and every API handler independently verify session roles and object ownership.

## Data and security

The Prisma schema covers Auth.js records, user roles, encrypted client profile fields, documents and requests, 16-step tax status history, secure messages and attachments, invoices, tasks, internal notes, service requests, IRS authorization tracking, leads, and audit logs.

Sensitive text fields are represented as encrypted byte columns. `lib/security.ts` deliberately marks the KMS/envelope-encryption boundary; replace the placeholder codec with your managed KMS implementation before handling taxpayer data. Never store SSNs in plain text. IRS records are accessed only with taxpayer authorization through approved IRS e-Services/TDS processes—there is no public IRS API integration.

## Validation

```bash
npm run typecheck
npm run build
npm audit
```

Before handling real taxpayer information, complete threat modeling, penetration testing, backup/restore testing, incident-response exercises, staff security training, retention policies, vendor reviews, and an IRS Publication 4557-aligned Written Information Security Plan.
