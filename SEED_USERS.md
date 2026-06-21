# Local Seed Users

These accounts are disposable fixtures for local testing only. Their passwords are intentionally documented and therefore are **not secrets**. Never create these users in a production database, never give them real taxpayer data, and remove or rotate them before deployment.

Use a Neon development branch or another isolated test database when running the seed.

## Known local accounts

| Role | Email | Password | Expected destination |
|---|---|---|---|
| Administrator | `admin.local@allianceaccountant.test` | `LocalAdmin!2026` | `/admin` |
| Staff | `staff.local@allianceaccountant.test` | `LocalStaff!2026` | `/admin` |
| Client | `client.local@allianceaccountant.test` | `LocalClient!2026` | `/portal` |

The `.test` domain is deliberately non-routable. These accounts cannot receive real email.

## Create or refresh the accounts

Add the following to ignored `.env.local`:

```dotenv
ALLOW_LOCAL_TEST_SEED="true"
SEED_ADMIN_EMAIL="admin.local@allianceaccountant.test"
SEED_ADMIN_PASSWORD="LocalAdmin!2026"
SEED_STAFF_EMAIL="staff.local@allianceaccountant.test"
SEED_STAFF_PASSWORD="LocalStaff!2026"
SEED_CLIENT_EMAIL="client.local@allianceaccountant.test"
SEED_CLIENT_PASSWORD="LocalClient!2026"
```

Then run:

```powershell
npm.cmd run db:seed
```

The seed is idempotent: rerunning it creates missing users and replaces the three test password hashes with hashes of the configured values. It also verifies the email addresses so credentials login works immediately.

## Change or reset a seed password

1. Stop the local server with `Ctrl+C` if it is running in the same terminal.
2. Change the appropriate `SEED_*_PASSWORD` value in `.env.local`. Use at least 12 characters.
3. Run `npm.cmd run db:seed`.
4. Restart with `npm.cmd run dev` and sign in with the new value.

To exercise the actual forgot-password email flow, use a temporary client whose email is an inbox Resend is permitted to contact. With Resend's sandbox sender, that is normally the Resend account owner's email. Do not replace a real or production user's password for testing.

## Before deploying

- Set `ALLOW_LOCAL_TEST_SEED="false"` or remove it from the deployment environment.
- Do not run `npm run db:seed` against production.
- Confirm the three `.test` users do not exist in the production database.
- Use a unique production `AUTH_SECRET`; never copy local secrets into production.
- Confirm `.env` and `.env.local` remain ignored with `git check-ignore .env .env.local`.
