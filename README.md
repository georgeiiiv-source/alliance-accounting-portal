# AllianceAccountant

A polished React/Vite front-end prototype for a full-service accounting firm and secure client portal.

## Run locally

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173`. Use **Client login**; demo credentials are prefilled. All interactions use in-memory demo data.

## Production architecture

- React/Next.js frontend and server-side API routes
- PostgreSQL with row-level tenant isolation; see `database/schema.sql`
- Auth.js with Argon2id password hashing, verified email, secure HTTP-only cookies, MFA, and 15-minute idle timeout
- Private S3 buckets with KMS encryption, signed short-lived URLs, malware scanning quarantine, file signature validation, and 25 MB limit
- Stripe Payment Intents and signed webhooks; Resend/SES notifications; DocuSign/Dropbox Sign for engagement letters
- Immutable audit events for logins, file access, messages, invoice changes, and status changes

## Important security notes

This repository is a UI prototype, not a production security implementation. Before deployment: complete threat modeling, configure HTTPS/HSTS/CSP, secrets management, encrypted backups and restore tests, least-privilege IAM, dependency scanning, rate limiting, monitoring, incident response, and an IRS Publication 4557-aligned Written Information Security Plan. Never store SSNs in plain text. IRS records must only be accessed with verified taxpayer authorization through approved IRS e-Services/TDS workflows.

## Key folders

- `src/` — responsive marketing site and interactive client portal
- `database/schema.sql` — normalized PostgreSQL schema with roles, audit events, messaging, tasks, invoices, IRS authorization, and document metadata
- `api/routes.md` — production API surface and authorization expectations
