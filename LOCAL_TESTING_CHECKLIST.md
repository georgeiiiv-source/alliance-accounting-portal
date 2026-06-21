# Alliance Accounting Portal — Local Testing Checklist

Use this checklist before every production deployment. It is designed for Windows PowerShell and the current Phase 3 application.

> **Important:** “Running locally” means the Next.js website runs on your computer. Neon, AWS S3, Resend, and Stripe are still external cloud services. Use a Neon test branch, a test S3 bucket, Stripe test keys, and non-client email addresses. Never test with real taxpayer information.

## Test record

| Item | Value |
|---|---|
| Tester |  |
| Test date |  |
| Git commit |  |
| Neon test branch |  |
| S3 test bucket |  |
| Stripe mode | Test |
| Overall result | Pass / Fail |

## 0. Prepare an isolated test environment

- [ ] Create or select a Neon branch used only for local testing. See [Neon branching](https://neon.com/docs/introduction/branching).
- [ ] Use a separate private S3 test bucket, or obtain approval before placing test objects in another bucket.
- [ ] Confirm Stripe keys begin with test-mode prefixes such as `sk_test_`; never use a live key locally.
- [ ] Use fictitious names and documents with no SSNs, real bank numbers, or taxpayer data.
- [ ] Confirm `.env` and `.env.local` are ignored:

```powershell
git check-ignore .env
git check-ignore .env.local
```

Both commands should print the corresponding filename.

### Required local variables

Store secrets in `.env` or `.env.local`, never `.env.example`:

```text
DATABASE_URL
AUTH_SECRET
AUTH_TRUST_HOST=true
DATA_ENCRYPTION_KEY
NEXT_PUBLIC_APP_URL=http://localhost:3000
S3_BUCKET
S3_REGION
S3_ACCESS_KEY_ID
S3_SECRET_ACCESS_KEY
DOCUMENT_SCAN_WEBHOOK_SECRET
RESEND_API_KEY
EMAIL_FROM
```

Stripe testing additionally requires:

```text
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Do not replace `DATA_ENCRYPTION_KEY` after encrypted test records exist unless those records will be deleted. Changing it makes existing encrypted messages and questionnaire answers unreadable.

## 1. Start the site locally

Open PowerShell:

```powershell
cd "C:\Users\georg\Documents\Codex\2026-06-19\build-a-full-service-accounting-firm"
npm.cmd install
npm.cmd run db:generate
npm.cmd run db:deploy
npm.cmd run dev
```

Wait for:

```text
Ready
```

Then open [http://localhost:3000](http://localhost:3000).

- [ ] Home page loads without an error.
- [ ] Browser address is exactly `localhost:3000` or `127.0.0.1:3000`.
- [ ] PowerShell shows no database, authentication, or environment errors.
- [ ] Home, Services, Pricing, About, Contact, FAQ, Privacy, Terms, and Security pages open.
- [ ] Resize the browser and confirm navigation/content remain usable on a narrow window.

## 2. Log in as administrator

### Create local seed accounts if needed

Add temporary strong values to ignored `.env`:

```text
SEED_ADMIN_PASSWORD="use-a-unique-test-password"
SEED_CLIENT_PASSWORD="use-a-different-test-password"
```

Run:

```powershell
npm.cmd run db:seed
```

The seed administrator is:

```text
admin@allianceaccountant.com
```

The seed client is:

```text
client@example.com
```

Remove the two seed password lines when finished. Do not use these accounts or passwords in production.

### Admin login test

1. Open `/login`.
2. Enter the administrator email and test password.
3. Select **Sign in securely**.
4. Confirm `/admin` opens.

- [ ] Staff dashboard shows the administrator name.
- [ ] Summary cards load from Neon.
- [ ] **Workflows** and **Audit logs** open.
- [ ] A client account cannot open `/admin`.

## 3. Create a test client

The current admin workspace does not have a polished **Create client** form. Test client creation through the real self-registration workflow:

1. Open a private/incognito browser window.
2. Go to `/register`.
3. Enter a fictitious name, an email address you control, and a unique password of at least 12 characters.
4. Submit registration.
5. Open the Resend verification email.
6. Select the verification link within 24 hours.
7. Return to the admin dashboard and confirm the active-client count increased.

- [ ] Registration rejects invalid email/password input.
- [ ] Duplicate email registration is rejected.
- [ ] Login fails before email verification.
- [ ] Verification activates the account.
- [ ] `User` and `ClientProfile` records exist in Neon.

If the firm requires staff-created clients, a dedicated admin form must be implemented before launch. Self-registration is the only polished creation screen in Phase 3.

## 4. Log in as the test client

Keep the administrator logged in in the normal browser and use the private window for the client.

1. Open `/login` in the private window.
2. Enter the verified client email and password.
3. Select **Sign in securely**.
4. Confirm `/portal` opens.

- [ ] Dashboard displays the test client's name.
- [ ] Client navigation includes Documents, Tax status, Tax organizer, Tasks, Appointments, Invoices, Messages, and Service requests.
- [ ] The client cannot open `/admin`.
- [ ] Signing out returns to login and blocks protected pages.

## 5. Upload a test document

Create a harmless test PDF or CSV with fictitious content.

1. Client opens **Documents**.
2. Select a category such as **Prior tax return**.
3. Select the test PDF/CSV.
4. Select **Upload document**.
5. Wait for the upload confirmation.

- [ ] Progress indicator appears.
- [ ] File appears with the correct name, category, date, and `PENDING` scan state.
- [ ] Files over 25 MB are rejected.
- [ ] Unsupported file types are rejected.
- [ ] Download is blocked while the file is `PENDING`.
- [ ] Staff document-upload email is recorded/sent.

### Simulate a clean scanner response locally

The app does not include the malware scanner itself. For a harmless test file only, retrieve its `storageKey` from Prisma Studio (Section 13), then run:

```powershell
$secretLine = Get-Content .env | Where-Object { $_ -match '^DOCUMENT_SCAN_WEBHOOK_SECRET=' } | Select-Object -First 1
$secret = ($secretLine -split '=', 2)[1].Trim('"')
$body = @{ storageKey = "PASTE_TEST_STORAGE_KEY"; status = "CLEAN"; scannerReference = "local-manual-test" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/documents/scan-result" -Headers @{ "x-scan-webhook-secret" = $secret } -ContentType "application/json" -Body $body
```

Refresh Documents:

- [ ] Status is `CLEAN`.
- [ ] Download works through a short-lived signed S3 link.
- [ ] Document scan email is recorded/sent.

Never use this simulated callback for real client documents. Production requires an actual malware scanner.

## 6. Send a client message

1. Client opens **Messages**.
2. Select **New message**.
3. Enter a test subject and message with no sensitive information.
4. Select **Create conversation**.

- [ ] Thread appears in the client message list.
- [ ] Message displays with the correct sender and time.
- [ ] Assigned staff receives a notification email.
- [ ] Neon contains `MessageThread` and encrypted `Message` records.
- [ ] Audit log contains the message-thread action.

## 7. Staff replies to the message

The current staff **Messages** navigation opens API data; a polished staff message screen is not complete.

### Current API test

1. Stay logged in as administrator.
2. Open `/api/clients` and copy the test client's `id`.
3. Open `/api/messages?clientId=PASTE_CLIENT_ID` and copy the thread `id`.
4. Open browser Developer Tools (`F12`) and select **Console**.
5. Paste this after replacing the thread ID:

```javascript
fetch("/api/messages/PASTE_THREAD_ID", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ body: "This is a local staff reply test." })
}).then(async response => ({ status: response.status, body: await response.json() })).then(console.log)
```

- [ ] Console reports status `201`.
- [ ] Client refreshes Messages and sees the reply.
- [ ] Client receives a Resend notification.
- [ ] Reply body is encrypted in Neon.

A dedicated staff message inbox/reply screen must be finished before live launch.

## 8. Create a test invoice

The current staff invoice editor is API-backed and does not yet have a polished form.

1. Copy the client ID from `/api/clients`.
2. While logged in as administrator, open Developer Tools → **Console**.
3. Paste this with a unique invoice number and the client ID:

```javascript
fetch("/api/invoices", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    clientId: "PASTE_CLIENT_ID",
    number: "LOCAL-TEST-001",
    description: "Local testing invoice",
    amountCents: 2500
  })
}).then(async response => ({ status: response.status, body: await response.json() })).then(console.log)
```

- [ ] Console reports status `201`.
- [ ] Client sees a $25.00 unpaid invoice.
- [ ] Client receives the invoice email.
- [ ] `Invoice` and audit records exist in Neon.
- [ ] Invoice number duplication is rejected.

An admin invoice creation/editing screen is required for non-technical staff before launch.

## 9. Test Stripe in test mode

Follow Stripe's current [testing guide](https://docs.stripe.com/testing) and [Stripe CLI guide](https://docs.stripe.com/stripe-cli/use-cli).

1. Confirm `STRIPE_SECRET_KEY` starts with `sk_test_`.
2. Install the Stripe CLI and sign in:

```powershell
stripe login
```

3. In a second PowerShell window, forward test webhooks:

```powershell
stripe listen --forward-to http://localhost:3000/api/stripe/webhook
```

4. Copy the displayed `whsec_...` value into ignored `.env` as `STRIPE_WEBHOOK_SECRET`.
5. Restart `npm.cmd run dev` so the new secret loads.
6. Client opens the test invoice and selects **Pay**.
7. Confirm Stripe Checkout is visibly in test mode.
8. Use Stripe's standard successful test card:

```text
4242 4242 4242 4242
```

Use any future expiration date, any three-digit CVC, and a test postal code. Never enter a real card while test keys are configured.

- [ ] Checkout redirects to Stripe.
- [ ] Successful payment returns to the portal.
- [ ] Stripe CLI receives `checkout.session.completed`.
- [ ] Signature verification succeeds.
- [ ] Invoice changes to `PAID` only after the webhook.
- [ ] `Payment` and `StripeWebhookEvent` records exist.
- [ ] Duplicate webhook delivery does not create a duplicate payment.
- [ ] Payment email is recorded/sent.

## 10. Update tax preparation status

The tax-status API is complete, but the polished staff status-update form is not.

1. Open `/api/tax-status?clientId=PASTE_CLIENT_ID` while logged in as administrator.
2. Copy the tax return `id`.
3. In Developer Tools → **Console**, run:

```javascript
fetch("/api/tax-status", {
  method: "PATCH",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    taxReturnId: "PASTE_TAX_RETURN_ID",
    status: "DOCUMENTS_RECEIVED",
    note: "Local status update test"
  })
}).then(async response => ({ status: response.status, body: await response.json() })).then(console.log)
```

- [ ] Console reports status `200`.
- [ ] Client tracker displays **Documents Received**.
- [ ] `TaxReturn` is updated.
- [ ] A separate `TaxStatusEvent` exists.
- [ ] Audit event exists.
- [ ] Client receives the tax-status email.

A staff status-update control must be finished before launch.

## 11. Confirm Resend notifications

Use a verified Resend test domain/sender. The `onboarding@resend.dev` sender may be restricted to the Resend account owner.

1. Open the [Resend email log](https://resend.com/docs/dashboard/emails/introduction).
2. Trigger each workflow once.
3. Confirm recipient, subject, provider status, and timestamp.
4. Open Prisma Studio and inspect corresponding `AuditLog` records.

- [ ] Registration verification.
- [ ] Password reset.
- [ ] Client message to staff.
- [ ] Staff reply to client.
- [ ] Document upload.
- [ ] Document clean/rejected result.
- [ ] Invoice created.
- [ ] Invoice paid/overdue/refunded when tested.
- [ ] Tax status changed.
- [ ] No email contains message contents, tax documents, SSNs, or card data.
- [ ] Failed delivery is recorded as `EMAIL_NOTIFICATION_SKIPPED` rather than silently ignored.

## 12. Confirm files are stored in AWS S3

1. Sign in to AWS and open the configured test bucket.
2. Search for the test object's opaque key under `clients/{clientId}/{year}/...`.
3. Review properties rather than making the object public.

- [ ] Object exists after upload.
- [ ] Original filename is metadata/content disposition, not the public object key.
- [ ] Public access remains blocked.
- [ ] Encryption is AES-256 or the configured KMS key.
- [ ] Object metadata includes client and pending scan information.
- [ ] Portal downloads use a short-lived signed URL.
- [ ] Test object is deleted after testing according to test cleanup policy.

See the official [Amazon S3 user guide](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html).

## 13. Confirm records are stored in Neon

From the project folder:

```powershell
npx.cmd prisma migrate status
npx.cmd prisma studio
```

Prisma Studio opens in the browser. Inspect—do not casually edit—these tables:

- `User` and `ClientProfile`
- `VerificationToken`
- `Document`
- `MessageThread` and `Message`
- `Invoice`, `Payment`, and `StripeWebhookEvent`
- `TaxReturn` and `TaxStatusEvent`
- `AuditLog`

- [ ] Records belong to the correct client ID.
- [ ] Message bodies appear as encrypted binary, not plaintext.
- [ ] Document row stores S3 metadata, not file contents.
- [ ] Monetary amounts are stored in integer cents.
- [ ] Audit actions show the correct actor/client/entity.
- [ ] `npx.cmd prisma migrate status` reports the schema is up to date.

Press `Ctrl+C` in the Prisma Studio PowerShell window when finished.

## 14. Make wording, layout, or function changes

Create a branch before editing:

```powershell
git switch -c local-test-change
```

Common locations:

| Change | Folder/file |
|---|---|
| Public wording | `components/marketing/` |
| Header/footer/navigation | `components/layout/` |
| Client portal screens | `components/portal/` |
| Staff/admin screens | `components/admin/` |
| Page routing/data loading | `app/` |
| API behavior | `app/api/` |
| Email wording | `lib/notifications.ts`, `lib/email.ts` |
| Colors/layout/responsive styling | `src/styles.css`, `src/phase2.css`, `src/phase3.css` |
| Database structure | `prisma/schema.prisma` plus a new migration |

1. Make one focused change.
2. Save the file; the development server should refresh automatically.
3. Test desktop and a narrow mobile-sized browser window.
4. Check client and staff roles separately.
5. Review `git diff` before committing.

Do not edit generated `.next/`, `node_modules/`, or committed migration history that has already been applied. Database changes require a new migration and careful review.

## 15. Re-run tests after changes

Run:

```powershell
npm.cmd test
npm.cmd run typecheck
npx.cmd prisma validate
npm.cmd run build
npm.cmd audit --omit=dev
git diff --check
git status --short
```

- [ ] Automated tests pass.
- [ ] TypeScript reports no errors.
- [ ] Prisma schema is valid.
- [ ] Production build succeeds.
- [ ] Production dependency audit reports no unresolved vulnerabilities.
- [ ] Diff check reports no whitespace errors.
- [ ] Re-test every workflow affected by the change.
- [ ] Re-test role boundaries if authentication, routes, or API code changed.
- [ ] Re-test email/S3/Stripe when integration code changed.

## Stop and restart the local server

### Normal stop

Click the PowerShell window running Next.js and press:

```text
Ctrl+C
```

Confirm with `Y` if PowerShell asks.

### Restart

```powershell
cd "C:\Users\georg\Documents\Codex\2026-06-19\build-a-full-service-accounting-firm"
npm.cmd run dev
```

Restart after changing `.env`, installing packages, generating Prisma, or changing migration state.

### Port 3000 is stuck

```powershell
$listener = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
$listener | Select-Object LocalPort, OwningProcess
```

Verify the process belongs to this project before stopping it:

```powershell
Get-CimInstance Win32_Process -Filter "ProcessId = $($listener.OwningProcess)" | Select-Object ProcessId, CommandLine
```

Then, only if it is the Alliance local server:

```powershell
Stop-Process -Id $listener.OwningProcess
```

## Avoid committing secrets

- Store secrets only in ignored `.env`/`.env.local`.
- Keep `.env.example` limited to names and safe placeholders.
- Never paste secrets into source code, screenshots, documentation, issues, commits, or chat.
- Never use `git add -f .env`.
- Rotate any key that is exposed.

Before every commit:

```powershell
git check-ignore .env
git check-ignore .env.local
git status --short
git diff
git diff --cached
```

Confirm `.env` and `.env.local` do not appear as staged files. If one is staged, stop and unstage it without deleting the local file:

```powershell
git restore --staged .env .env.local
```

## Common errors and fixes

| Error | Likely cause | Fix |
|---|---|---|
| `localhost refused to connect` | Server is stopped | Run `npm.cmd run dev` and keep PowerShell open |
| Port 3000 already in use | Old dev server | Identify the owning process before stopping it, or run `npm.cmd run dev -- --port 3001` |
| `npm.ps1 cannot be loaded` | PowerShell execution policy | Use `npm.cmd`, not `npm` |
| Prisma `P1000` | Wrong Neon username/password | Recopy the test connection string and rotate exposed credentials |
| Prisma `P1001` | Database unreachable | Check Neon branch, hostname, internet, and SSL parameters |
| Prisma `P2021` / missing table | Migrations not applied | Run `npm.cmd run db:deploy` against the correct test database |
| `DATA_ENCRYPTION_KEY` error | Missing/wrong-size key | Use a Base64-encoded 32-byte key; do not replace a key for records you need |
| Upload says storage not configured | Missing S3 variables | Add the test bucket, region, and least-privilege credentials, then restart |
| S3 `AccessDenied` | IAM/bucket/KMS policy mismatch | Verify the dedicated test IAM policy and bucket region; never make the bucket public |
| Document remains `PENDING` | Scanner/callback not configured | Use the harmless local callback only for test files; configure a real scanner before launch |
| Document download returns `423` | Scan status is not `CLEAN` | Complete safe scanning; do not bypass quarantine for real files |
| Resend email skipped | Missing key/sender or unverified domain | Check environment values and Resend logs; restart after changes |
| Stripe checkout unavailable | Test key/base URL missing | Set `sk_test_...`, `NEXT_PUBLIC_APP_URL`, restart, and run Stripe CLI |
| Stripe payment stays unpaid | Webhook not forwarded/secret mismatch | Check `stripe listen`, `whsec_...`, and Stripe event logs |
| Login fails | Email unverified, wrong role/password | Verify the email/account role and use password reset |
| Prisma generate `EPERM` | Dev server locks Windows engine file | Stop the local server, rerun Prisma/build, then restart |
| Staff sidebar displays JSON | Feature has API foundation but no polished screen | Use the documented local API test; finish the admin screen before launch |

## Required before live deployment

Do not accept real taxpayer information until every applicable item is complete:

### Product completion

- [ ] Polished staff screens for client management, documents/document requests, messages/replies, invoices, and tax-status updates.
- [ ] Production-quality invoice PDF generation; the current download is a text statement.
- [ ] End-user MFA enrollment and challenge flow, not only reserved database fields.
- [ ] Real e-signature provider integration and engagement-letter workflow if offered.
- [ ] Real appointment calendar/provider synchronization if required.
- [ ] Clear client/staff account provisioning and deactivation procedures.

### Security and operations

- [ ] Real malware scanner connected to S3 events and scan callback.
- [ ] Private/versioned/encrypted S3 with least-privilege IAM and tested lifecycle/restore.
- [ ] Neon production backups/point-in-time recovery and a tested restoration.
- [ ] HTTPS, HSTS, monitoring, rate limiting/WAF, error alerts, and log retention.
- [ ] Secret manager and documented key rotation; no production secrets in local files or Git.
- [ ] Independent security assessment, penetration test, and role/ownership testing.
- [ ] IRS Publication 4557-aligned WISP, incident response, staff training, vendor review, and breach procedures.
- [ ] Privacy, terms, security policy, consent, and retention language reviewed by qualified professionals.

### Production integrations

- [ ] Stripe live keys configured only in the production host; live webhook verified and monitored.
- [ ] Refund/dispute procedures documented; current automation is limited.
- [ ] Verified Resend production domain with SPF/DKIM and monitored delivery/bounce handling.
- [ ] Production `NEXT_PUBLIC_APP_URL` uses the final HTTPS domain.
- [ ] Production Neon and S3 are isolated from local/preview environments.
- [ ] Real backup, restore, incident, failed-email, failed-payment, and infected-upload drills completed.

### Final release gate

- [ ] `npm.cmd test`, typecheck, Prisma validation, build, and dependency audit pass.
- [ ] Full client/staff workflow is re-tested against a production-like staging environment.
- [ ] No demo/test users, invoices, messages, documents, tokens, or S3 objects remain.
- [ ] Deployment rollback owner and launch-day contacts are named.
- [ ] IRS records are accessed only with taxpayer authorization. No direct public IRS API is claimed or enabled.
