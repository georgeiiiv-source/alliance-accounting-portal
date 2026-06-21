# AllianceAccounting Complete User Workflow Test Report

## Test summary

| Item | Result |
|---|---|
| Overall result | **PASS** |
| Execution time | 2026-06-21 07:09:19 UTC |
| Application | Local Next.js development server at `http://127.0.0.1:3000` |
| Database | Neon PostgreSQL, `public` schema |
| File storage | Private AWS S3 bucket configured by environment |
| Email provider | Resend |
| Test data retained | No |

This test exercised the live Phase 3 application routes and external development services. Temporary client and staff users were created for the test and removed afterward. No credential values are included in this report.

## Accounts created

| Account | Role | Result |
|---|---|---|
| Temporary Workflow Client | `CLIENT` | Created, authenticated, and deleted |
| Temporary Workflow Staff | `STAFF` | Created, authenticated, and deleted |

The client login was additionally exercised through the real browser login form. The protected client dashboard loaded with the expected client identity and navigation.

## Workflow results

| Test | Evidence | Result |
|---|---|---|
| Client login | Auth.js credentials session returned the temporary client ID and `CLIENT` role; browser reached `/portal` | **PASS** |
| Staff login | Auth.js credentials session returned the temporary staff ID and `STAFF` role | **PASS** |
| Password reset | Forgot-password endpoint accepted the client request and recorded successful email delivery | **PASS** |
| Upload tax document | A temporary PDF document was uploaded through `/api/documents`, written to S3, and initially recorded as `PENDING` | **PASS** |
| Client message | Client created an encrypted message thread; assigned staff notification was sent | **PASS** |
| Staff reply | Staff replied to the same encrypted thread; client notification was sent | **PASS** |
| Create invoice | Staff created an invoice through `/api/invoices`; invoice and audit records were written | **PASS** |
| Update tax status | Staff changed the return from `CLIENT_REGISTERED` to `DOCUMENTS_RECEIVED`; history and audit records were written | **PASS** |
| Scan callback | Authenticated scan-result callback changed the document from `PENDING` to `CLEAN` | **PASS** |
| Authorized download | Client received the expected 303 redirect to a short-lived signed S3 URL | **PASS** |
| Download integrity | Downloaded bytes matched the uploaded temporary PDF byte-for-byte | **PASS** |

## Neon database verification

Prisma read the temporary client with its linked records after all workflow actions.

| Record verification | Result |
|---|---|
| Client `User` and `ClientProfile` | **PASS** |
| Staff `User` with `STAFF` role | **PASS** |
| Message thread containing one client message and one staff reply | **PASS** |
| Invoice linked to the test client | **PASS** |
| S3-backed `Document` with final `CLEAN` status | **PASS** |
| Tax return with `DOCUMENTS_RECEIVED` status | **PASS** |
| Tax status history event | **PASS** |
| Relevant audit events | **PASS** |

The combined relational assertion returned `true`, confirming that Prisma could read the expected linked data from Neon after the writes.

## Email notification verification

Email results were verified from the application's delivery results and Neon audit records. Resend accepted each requested notification. Inbox opening/read status was not tested.

| Notification | Result |
|---|---|
| Password reset email | **PASS** |
| Client message notification to staff | **PASS** |
| Staff reply notification to client | **PASS** |
| Document upload notification | **PASS** |
| Document scan-result notification | **PASS** |
| Invoice-created notification | **PASS** |
| Tax-status-update notification | **PASS** |

Six notification events were recorded as `EMAIL_NOTIFICATION_SENT`; password reset used its dedicated audit event with `emailDelivered: true`, for seven successful email sends in total.

## S3 verification

| S3 operation | Result |
|---|---|
| Authenticate and access configured bucket | **PASS** |
| Upload temporary PDF object | **PASS** |
| Generate authorized signed download | **PASS** |
| Download object and compare bytes | **PASS** |
| Delete temporary S3 object | **PASS** |

The application upload path requested server-side encryption. The test used the configured AES-256 fallback because no KMS key ID is configured.

## Cleanup verification

Cleanup used dependency-aware deletion so foreign-key protections remained enabled. The following temporary data counts were verified as zero:

- Test client and staff users
- Client profile
- Invoice and payment-related test records
- Document metadata
- Message and message-thread records
- Tax return and status event
- Password-reset verification token
- Associated audit records

The temporary S3 object, browser test session, local test state, and test credentials were also removed. The reusable test harness itself was deleted after this report was generated.

## Test boundary

The malware scanning engine itself was not part of this test. The application-side scanner integration was tested by sending an authenticated simulated `CLEAN` callback with the configured webhook secret. This verified callback authentication, the database status transition, client notification, and the rule that downloads are available only after a clean result.

Stripe card processing was outside the requested workflow. Invoice creation and invoice email notification were tested; no real charge was created.

## Conclusion

The requested complete client/staff workflow passed against the configured Neon, S3, and Resend services. All temporary external and database data was removed after verification.
