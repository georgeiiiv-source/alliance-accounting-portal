# AllianceAccounting Deployment Guide

This guide is written for a business owner or office manager, not a software developer. It explains how to run and publish the AllianceAccounting client portal, what each service does, and what must be checked before real taxpayer information is accepted.

> **Recommended setup:** Keep the domain at GoDaddy if desired, host the website on Vercel, use a managed PostgreSQL provider such as Neon, store documents in a private AWS S3 bucket, and send email through Resend. This is the least operationally demanding option described here.

> **Important security note:** Deployment alone does not make a system compliant. Before accepting taxpayer data, have a qualified security professional review the system and complete the firm's Written Information Security Plan (WISP), vendor review, incident-response plan, and IRS Publication 4557 controls. Do not accept real documents until malware scanning, backups, access controls, and multi-factor authentication have been tested.

Prices in this guide were checked on June 20, 2026. Cloud pricing and promotions change, so confirm the current quote before purchasing.

## 1. Run the site locally on Windows

Running locally means opening the site only on your own computer for testing.

### Install the required programs

Install:

1. [Git for Windows](https://git-scm.com/download/win)
2. [Node.js 20 LTS or newer](https://nodejs.org/en/download)
3. PostgreSQL, using either the managed option in Section 3 or the [Windows PostgreSQL installer](https://www.postgresql.org/download/windows/)

Restart PowerShell after installing. Confirm the programs are available:

```powershell
git --version
node --version
npm.cmd --version
```

### Download and configure the project

Open PowerShell and run these commands one line at a time:

```powershell
git clone https://github.com/georgeiiiv-source/alliance-accounting-portal.git
cd alliance-accounting-portal
Copy-Item .env.example .env
npm.cmd install
```

Open `.env` in Notepad:

```powershell
notepad .env
```

Complete it using Sections 3 through 6. Never email this file or commit it to GitHub.

Generate two different secret values. Run this block once for `AUTH_SECRET`, then run it again for `DATA_ENCRYPTION_KEY`:

```powershell
$bytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
[Convert]::ToBase64String($bytes)
```

After `DATABASE_URL` and the secrets are set, prepare the database:

```powershell
npm.cmd run db:generate
npm.cmd run db:deploy
```

To create optional demonstration accounts, set strong `SEED_ADMIN_PASSWORD` and `SEED_CLIENT_PASSWORD` values in `.env`, then run:

```powershell
npm.cmd run db:seed
```

Do not use seeded demonstration passwords in production.

Start the site:

```powershell
npm.cmd run dev
```

Open [http://localhost:3000](http://localhost:3000). Keep the PowerShell window open while using the site. Press `Ctrl+C` to stop it.

## 2. Required accounts

| Account | Purpose | Required for production? |
|---|---|---:|
| GitHub | Stores the application source code | Yes |
| Vercel, GoDaddy VPS, or another VPS host | Runs the website | Yes, choose one |
| PostgreSQL provider (for example Neon) | Stores users, messages, status, and other records | Yes |
| Amazon Web Services (AWS) | Private S3 document storage and encryption | Yes for uploads |
| Resend | Verification, password-reset, and portal notification email | Yes |
| Domain/DNS provider such as GoDaddy | Controls the public web address and email DNS records | Yes |
| Stripe | Future online invoice payments | Not required for current Phase 2 functions |
| Monitoring/security service | Error alerts, uptime monitoring, and security operations | Strongly recommended |

Turn on multi-factor authentication for every provider account. Use separate named accounts for staff; never share the AWS root login, GitHub password, or deployment login.

## 3. PostgreSQL setup

PostgreSQL is the database. It stores account and portal records; uploaded document contents remain in S3.

### Recommended: managed PostgreSQL with Neon

1. Create an account at [Neon](https://neon.com/).
2. Create a project and select a US region near the majority of clients and the Vercel region.
3. Name the database `alliance_accounting`.
4. In the Neon dashboard, open **Connect** and copy the PostgreSQL connection string.
5. Use a pooled connection string for the running Vercel application. Keep SSL enabled.
6. Paste it into `.env` or Vercel as `DATABASE_URL`.
7. From the project folder, apply the committed migrations:

```powershell
npm.cmd run db:generate
npm.cmd run db:deploy
```

If the provider requires a direct connection for migrations, temporarily use its direct connection string as `DATABASE_URL` while running `db:deploy`, then restore the pooled application connection string. Follow the provider's [connection guidance](https://neon.com/docs/connect/connect-from-any-app).

Create separate development and production databases. Never test destructive changes against production.

### Alternative: PostgreSQL on the local Windows computer

During the PostgreSQL installation, record the password assigned to the `postgres` user. Open **SQL Shell (psql)** from the Start menu and run:

```sql
CREATE DATABASE alliance_accounting;
```

Set this value in `.env`, replacing `YOUR_PASSWORD`:

```text
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/alliance_accounting?schema=public"
```

Local PostgreSQL is suitable for development. For production, a managed service is safer and easier to back up than a database on an office computer.

### Database operations and backups

- Run `npm.cmd run db:deploy` for production releases. Do not run `db:migrate` against production.
- Enable provider backups or point-in-time recovery.
- Restrict database access to authorized networks and encrypted SSL connections.
- Test a restoration at least quarterly. A backup that has never been restored is not yet proven.
- Store database credentials only in the host's encrypted environment-variable system.

## 4. AWS S3 document storage

S3 is where client documents are stored. The bucket must never be public.

### Create and protect the bucket

1. Sign in to the [AWS Console](https://console.aws.amazon.com/) with an administrative account protected by MFA.
2. Open **S3**, choose **Create bucket**, enter a unique name such as `alliance-accounting-documents-production`, and choose the same general region as the application.
3. Leave **Block all public access** enabled. AWS provides detailed [bucket creation](https://docs.aws.amazon.com/AmazonS3/latest/userguide/creating-bucket.html) and [public-access blocking](https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html) instructions.
4. Enable **Bucket Versioning** so accidental replacement or deletion can be recovered.
5. Enable default encryption. Prefer **SSE-KMS** with a customer-managed AWS KMS key; record its key ID for `S3_KMS_KEY_ID`. AES-256 S3 encryption is the fallback.
6. Add lifecycle rules that follow the firm's written record-retention policy. Do not guess a deletion period without professional tax/legal advice.
7. Enable appropriate S3 access logging or AWS CloudTrail data events and billing alerts.

### Give the application limited access

For Vercel, create a dedicated IAM identity and access key for this application. Never create an access key for the AWS root user. Grant only the bucket/object permissions the app needs. A security professional should review the final policy.

Record:

- Bucket name → `S3_BUCKET`
- Region → `S3_REGION`
- Access key ID → `S3_ACCESS_KEY_ID`
- Secret access key → `S3_SECRET_ACCESS_KEY`
- KMS key ID, if used → `S3_KMS_KEY_ID`

If hosting inside AWS, prefer an IAM role rather than permanent access keys.

### Configure malware scanning

New files are deliberately quarantined as `PENDING`; clients and staff cannot download them until a scanner reports `CLEAN`.

1. Configure an S3 malware-scanning solution, such as a reviewed AWS Lambda/ClamAV design or a reputable managed scanning service.
2. Configure an S3 event to scan each new upload.
3. Have the scanner call:

```text
POST https://YOUR-DOMAIN/api/documents/scan-result
```

4. Include the request header `x-scan-webhook-secret` with the same value stored in `DOCUMENT_SCAN_WEBHOOK_SECRET`.
5. Test both a clean file and the harmless EICAR antivirus test file before launch.

Never bypass the `PENDING` state or manually mark unknown files clean.

## 5. Resend email setup

1. Create an account at [Resend](https://resend.com/).
2. In **Domains**, add the firm's sending domain, such as `mail.yourdomain.com`.
3. Resend will display DNS records. Add every supplied SPF/DKIM record at GoDaddy or the current DNS provider, then wait for Resend to show **Verified**. See Resend's [domain guide](https://resend.com/docs/dashboard/domains/introduction).
4. Create a production API key in **API Keys** and restrict it to sending access where available. See the [API-key guide](https://resend.com/docs/dashboard/api-keys/introduction).
5. Store the key as `RESEND_API_KEY`.
6. Set `EMAIL_FROM` to a verified sender, for example:

```text
EMAIL_FROM="Alliance Accounting <portal@mail.yourdomain.com>"
```

7. Set `NEXT_PUBLIC_APP_URL` to the final HTTPS address so email links return users to the correct portal.
8. Test registration verification, password reset, staff replies, and document-request notices with at least two external email providers.

Emails contain links and non-sensitive summaries only. Never put tax documents, SSNs, or private message contents in ordinary email.

## 6. Environment variables

Environment variables are private settings. Local values go in `.env`; production values go in the host's encrypted settings. Do not add secrets to GitHub.

| Variable | Production status | What to enter |
|---|---|---|
| `DATABASE_URL` | Required | PostgreSQL connection string; use a provider-supported pooled connection for the live app |
| `AUTH_SECRET` | Required | Unique random 32-byte-or-longer secret |
| `AUTH_TRUST_HOST` | Required on the recommended host | `true` |
| `DATA_ENCRYPTION_KEY` | Required | Base64-encoded 32-byte AES key generated independently from `AUTH_SECRET` |
| `S3_BUCKET` | Required for uploads | Private S3 bucket name |
| `S3_REGION` | Required for uploads | AWS region, for example `us-east-1` |
| `S3_ACCESS_KEY_ID` | Required on Vercel | Dedicated least-privilege IAM access key ID |
| `S3_SECRET_ACCESS_KEY` | Required on Vercel | Matching secret access key |
| `S3_KMS_KEY_ID` | Recommended | Customer-managed KMS key ID; blank uses the configured fallback |
| `DOCUMENT_SCAN_WEBHOOK_SECRET` | Required for scanning | Long random secret shared only with the malware scanner |
| `RESEND_API_KEY` | Required for email | Resend production API key |
| `EMAIL_FROM` | Required for email | Sender address on a verified Resend domain |
| `NEXT_PUBLIC_APP_URL` | Required | Exact public HTTPS URL, with no trailing slash; local value is `http://localhost:3000` |
| `STRIPE_SECRET_KEY` | Future/optional | Stripe secret key when live payments are implemented |
| `STRIPE_WEBHOOK_SECRET` | Future/optional | Stripe webhook signing secret when live payments are implemented |
| `SEED_ADMIN_PASSWORD` | Development only | Temporary strong password used only by `db:seed` |
| `SEED_CLIENT_PASSWORD` | Development only | Temporary strong password used only by `db:seed` |

Do not change `DATA_ENCRYPTION_KEY` after encrypted records exist unless a planned key-rotation process re-encrypts the data. Losing this key makes encrypted messages and request details unreadable.

For Vercel, add variables under **Project → Settings → Environment Variables**. Keep production data and credentials out of Preview deployments, or create isolated preview resources. Vercel documents [environment-variable management here](https://vercel.com/docs/environment-variables).

## 7. Deployment options

### Option A: Vercel — recommended

Vercel is the simplest match for this Next.js application.

1. Create a Vercel account and connect GitHub.
2. Choose **Add New → Project** and import `alliance-accounting-portal`.
3. Keep the detected framework as **Next.js**.
4. Add every required environment variable before deploying.
5. Create the production database and run migrations from the local project folder with the production `DATABASE_URL`:

```powershell
npm.cmd run db:deploy
```

6. Deploy. Vercel runs the project's build command automatically.
7. Add the business domain under **Project → Settings → Domains**.
8. At GoDaddy DNS, enter the exact A/CNAME records Vercel displays. DNS changes can take time to propagate.
9. Confirm HTTPS is active and change `NEXT_PUBLIC_APP_URL` to the final domain, then redeploy.

See Vercel's [Next.js deployment guide](https://vercel.com/docs/frameworks/full-stack/nextjs). For a commercial accounting business, budget for Pro rather than relying on a personal-use plan.

### Option B: GoDaddy

GoDaddy is useful for registering the domain and managing DNS. Standard shared hosting or Website Builder plans are generally not the right environment for this full Next.js/Node.js application with Prisma.

Two workable approaches are:

- **Recommended:** Keep the domain at GoDaddy and point its DNS to Vercel.
- **Advanced:** Buy a GoDaddy Linux VPS and manage it like the VPS option below.

A GoDaddy VPS requires server administration, security patching, firewall configuration, monitoring, backups, HTTPS, and incident response. Promotional pricing and renewal pricing can differ; obtain a written checkout/renewal quote. If no qualified administrator will maintain it, use Vercel instead.

### Option C: self-managed VPS

A VPS from DigitalOcean, GoDaddy, AWS Lightsail, or another provider gives more control but also makes the firm responsible for the server.

A qualified administrator must:

1. Provision a current Ubuntu LTS server.
2. Create a non-root administrator, SSH keys, firewall rules, and automatic security updates.
3. Install Node.js 20+, Git, Nginx, and a process manager such as systemd or PM2.
4. Clone the repository and store environment variables outside Git.
5. Run `npm ci`, `npm run db:generate`, `npm run db:deploy`, and `npm run build`.
6. Run `npm start` behind Nginx.
7. Install and automatically renew an HTTPS certificate.
8. Add uptime/error monitoring, log retention, intrusion protection, off-site backups, and tested restoration.
9. Patch the operating system and dependencies continuously.

The lowest DigitalOcean Droplet is advertised at $4/month, but a production portal should not be sized solely by the cheapest tier. A small 2 GB server is currently listed at $12/month, before backups, monitoring, administration, database, S3, email, and scanning. See [DigitalOcean Droplet pricing](https://www.digitalocean.com/pricing/droplets).

## 8. Estimated monthly cost

These are planning estimates for a small firm with light initial traffic, not quotes.

| Item | Entry cost | Practical small-firm budget | Notes |
|---|---:|---:|---|
| Vercel | $20/month Pro | $20–$40+ | [Vercel lists Pro at $20/month plus usage](https://vercel.com/pricing) |
| Managed PostgreSQL | $0 development tier | $10–$30+ | [Neon offers Free and usage-based Launch](https://neon.com/pricing); production use depends on compute, storage, and backups |
| AWS S3/KMS/requests | Usually a few dollars at low volume | $2–$15+ | Region, storage, requests, downloads, KMS, logs, and versions all affect cost; use the [AWS calculator/pricing page](https://aws.amazon.com/s3/pricing/) |
| Malware scanning | Varies | $5–$50+ | Depends on Lambda workload or managed scanner pricing |
| Resend | $0 Free | $20 Pro | [Free includes 3,000 emails/month; Pro is $20 for 50,000](https://resend.com/pricing) at the date checked |
| Domain | About $15–$30/year | $1–$3/month averaged | Renewal and privacy pricing vary |
| Monitoring/backups | $0–$10 | $10–$40+ | Depends on retention and alerting needs |

**Recommended managed stack:** approximately **$50–$150 per month** at modest usage, plus security review and IT support. A free-tier demonstration may cost very little, but free tiers should not be treated as the production security or continuity plan.

**Self-managed VPS stack:** approximately **$30–$120+ per month** for infrastructure, plus administrator time or a managed-services contract. Human maintenance often costs more than the server.

## 9. Common errors and fixes

| Error or symptom | Likely cause | Fix |
|---|---|---|
| “This site can't be reached” or “localhost refused to connect” | Development server is not running | In the project folder run `npm.cmd run dev`, keep the window open, and use the port shown in PowerShell |
| `npm.ps1 cannot be loaded` | Windows PowerShell execution policy | Use `npm.cmd` as shown in this guide |
| Port 3000 is already in use | Another program is using it | Stop the other Node process or run `npm.cmd run dev -- --port 3001`, then open that port |
| Prisma `P1001` or “Can't reach database server” | Wrong URL, stopped local PostgreSQL, blocked network, or SSL setting | Recopy `DATABASE_URL`, confirm the database is running and allows the host, and use the provider's SSL connection string |
| Prisma table/model does not exist (`P2021`) | Migrations were not applied | Run `npm.cmd run db:deploy` against the correct database |
| Login fails after deployment | Missing `AUTH_SECRET`, wrong app URL, or user has not verified email | Set the production variables, redeploy, and complete email verification |
| Verification/reset email never arrives | Resend key/domain/sender problem | Check Resend logs, verified DNS, `RESEND_API_KEY`, `EMAIL_FROM`, spam folders, and `NEXT_PUBLIC_APP_URL` |
| Upload says storage is not configured | Missing S3 variables | Add all S3 values and redeploy |
| S3 `AccessDenied` | IAM policy, bucket, KMS key, or region mismatch | Confirm the dedicated IAM identity can access only the intended bucket and KMS key; verify `S3_REGION` |
| Uploaded file remains `PENDING` | Malware scanner or callback is not working | Check the S3 event, scanner logs, callback URL, HTTPS access, and matching webhook secret |
| Document download is blocked | Scan status is not `CLEAN` | Fix scanning; do not bypass quarantine |
| Encrypted content cannot be read | `DATA_ENCRYPTION_KEY` was changed, lost, or malformed | Restore the original 32-byte Base64 key from the secret manager/backup; do not generate a replacement for existing data |
| Vercel build fails on Prisma | Database variable is absent or dependencies/migrations are stale | Confirm build-time environment settings, run `npm.cmd install`, `npm.cmd run db:generate`, and review the Vercel build log |
| VPS shows `502 Bad Gateway` | Node process stopped or Nginx points to the wrong port | Check the process manager and application logs, restart the app, and verify the Nginx upstream |
| Windows reports `EPERM` during install/build | A Node process has files locked | Stop the development server and other Node processes, then retry |

When reporting an error, remove passwords, API keys, database URLs, access tokens, and client information from screenshots and logs.

## 10. Final pre-launch checklist

### Accounts and infrastructure

- [ ] Production domain points to the live host and HTTPS is valid.
- [ ] Every provider account uses MFA and named individual access.
- [ ] Production and development databases, buckets, keys, and email credentials are separate.
- [ ] PostgreSQL migrations have been applied and a restoration has been tested.
- [ ] S3 blocks all public access, uses versioning, encryption, least-privilege IAM, and reviewed retention rules.
- [ ] Malware scanning has passed clean-file and EICAR tests; unscanned files cannot be downloaded.
- [ ] Database, S3, KMS, email, and hosting billing/usage alerts are active.
- [ ] Off-site backups and a documented restore procedure exist.

### Application tests

- [ ] Registration, email verification, login, logout, and password reset work.
- [ ] Client, staff, and admin accounts see only their permitted areas and records.
- [ ] Automatic session timeout and the application's MFA workflow have been verified; do not launch until required MFA is fully operational.
- [ ] A client can upload each allowed file type and oversized/disallowed files are rejected.
- [ ] Clean, infected, and failed scans produce the expected secure result.
- [ ] Secure message replies notify the right recipient without exposing message contents by email.
- [ ] Document requests and tax-status changes work for the correct client.
- [ ] Audit logs record logins, uploads, downloads, messages, and administrative actions.
- [ ] Mobile, tablet, and desktop testing has been completed on current browsers.
- [ ] Error monitoring and uptime alerts reach at least two responsible people.

### Business, privacy, and security

- [ ] A qualified professional has completed a security and privacy review.
- [ ] The firm has an IRS Publication 4557-aligned WISP, incident-response plan, and annual staff training.
- [ ] Vendor agreements and security documentation for Vercel, PostgreSQL, AWS, Resend, monitoring, and support providers have been reviewed.
- [ ] Privacy Policy, Terms of Service, Data Security Policy, consent language, retention schedule, and breach procedures have legal review.
- [ ] No SSN is stored in plain text, logs, email, analytics, or support tickets.
- [ ] IRS records are accessed only with taxpayer authorization. Form 8821/2848 handling and approved IRS e-Services/TDS procedures are documented.
- [ ] A launch-day owner, technical contact, security contact, and rollback decision-maker are named.
- [ ] Staff know how to report suspicious access, phishing, lost devices, and client data incidents immediately.

## Recommended launch sequence

1. Build and test locally with demonstration data.
2. Create isolated production PostgreSQL, S3, malware-scanning, and Resend resources.
3. Deploy to Vercel with a temporary protected URL and apply migrations.
4. Complete security, access-control, backup, email, and scanning tests.
5. Complete the professional security/legal review and staff training.
6. Connect the public domain and re-test every workflow.
7. Invite a small pilot group before opening general registration.
8. Review logs, email delivery, costs, backups, and alerts daily during the first week.

