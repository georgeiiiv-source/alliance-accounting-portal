# AllianceAccounting Client Portal Guide

This guide explains how clients register, sign in, and use the secure AllianceAccounting portal.

## 1. Protect your account

- Use the firm's official HTTPS website and check the address before entering a password.
- Create a unique password of at least 12 characters. Do not reuse an email or banking password.
- Never send your password, verification link, reset link, or tax documents by ordinary email.
- Use a trusted, updated device. Avoid shared computers and public Wi-Fi.
- Sign out when finished, especially on any device other people can access.

AllianceAccounting staff will not ask for your password. If a message or phone call feels suspicious, stop and contact the firm using a known phone number.

## 2. Create an account

1. Choose **Get Started** or open `/register`.
2. Enter your name and email address.
3. Create a password between 12 and 128 characters.
4. Submit the form.
5. Open the verification email from AllianceAccounting and select **Verify email** within 24 hours.
6. Return to `/login` and sign in.

Public registration creates a client account. If the email is already registered, use login or password reset instead of creating another account.

### Verification email did not arrive

- Wait a few minutes and check spam/junk folders.
- Confirm that the address was typed correctly.
- Use the portal's resend-verification option if shown.
- Contact the firm if no message arrives. Do not create multiple accounts with different addresses unless staff instructs you to do so.

## 3. Sign in, reset a password, and sign out

Open `/login`, enter the verified email and password, and choose **Sign in**. Successful client login opens the protected portal.

If the password is forgotten:

1. Select **Forgot password**.
2. Enter the account email.
3. The page always shows the same confirmation for privacy.
4. Open the reset email and use the link within one hour.
5. Enter a new unique password of at least 12 characters.

Reset links work once. Request a new link if it is expired. At the end of a session, use **Sign out** in the portal navigation.

Phase 3 does not yet include a completed portal multi-factor authentication setup screen. This guide will be updated when client MFA enrollment is available.

## 4. Portal overview

The `/portal` dashboard summarizes:

- Current tax return stage.
- Number of clean documents received and documents still requested.
- Total unpaid/overdue invoice balance.
- Unread secure messages.
- Up to five incomplete client tasks.

Use the navigation to open Documents, Tax return status, Tax organizer, My tasks, Appointments, Invoices & payments, Messages, and Service requests.

## 5. Upload documents securely

Open **Documents** or `/portal/documents`.

### Supported files

- PDF
- JPG/JPEG
- PNG
- DOCX
- XLSX
- CSV

The maximum size is 25 MB per file. Available categories include W-2, 1099, bank statements, business expenses, ID documents, prior tax return, IRS letters, payroll documents, and bookkeeping documents.

### Upload steps

1. Choose the correct document category.
2. Select one supported file from the device.
3. Choose **Upload document**.
4. Wait for the progress indicator and success message.
5. Confirm that the file appears in document history.

Every new file starts in quarantine with status `PENDING`. An external malware scanner must report it `CLEAN` before it can be downloaded. `QUARANTINED` or `REJECTED` means the file was not accepted; contact the firm and upload a clean replacement.

Files are stored in a private, encrypted Amazon S3 bucket. Approved downloads use a short-lived link. Never try to bypass the scan status.

### Upload safety

- Check that the file belongs to you and contains only the needed pages.
- Do not upload executable programs or password-protected archives.
- Do not put an SSN in the filename.
- If the wrong file is uploaded, notify staff through secure messaging promptly.

## 6. Check tax preparation status

Open **Tax return status** or `/portal/tax-status`.

The tracker can display these stages:

1. Client registered
2. Engagement letter sent
3. Engagement letter signed
4. Documents requested
5. Documents received
6. In review
7. Missing information requested
8. Tax return being prepared
9. Internal quality review
10. Client review
11. E-signature requested
12. E-file submitted
13. IRS accepted
14. State accepted
15. Completed
16. Archived

Status is updated by authorized staff. The portal does not use a direct public IRS API. IRS records are accessed only with taxpayer authorization through approved procedures.

If a status appears outdated, send a secure message. Do not assume that “E-file submitted” means accepted; IRS and state acceptance are separate stages.

## 7. Complete the tax organizer

Open **Tax organizer** or `/portal/tax-organizer`. The organizer uses the tax year in the client profile, or the prior calendar year when none is set.

The questionnaire asks about:

- Expected filing status.
- Dependents.
- Income sources.
- Major life changes.
- Potential deductions and charitable giving.
- Federal/state estimated payments.
- Foreign financial accounts.
- Digital asset activity.
- Additional notes for the tax professional.

### Save versus submit

- **Save draft** stores encrypted answers and allows later editing.
- **Submit organizer** marks it ready for staff review.
- `NEEDS UPDATE` means staff requires a revision. Check secure messages for details.
- `REVIEWED` means staff completed the organizer review.

Do not enter Social Security numbers, passwords, payment-card information, or full bank account numbers in organizer text boxes. Upload required official documents through **Documents**.

## 8. Complete assigned tasks

Open **My tasks** or `/portal/tasks`.

Each task shows a title and optional due date. Select the circle next to a task when it is complete. Select the completed item again to reopen it if it was checked accidentally.

Completing a task does not automatically upload a document or change a tax-return status. If the task asks for a document, upload it first and then mark the task complete. Task changes are recorded in the audit history.

## 9. Request an appointment

Open **Appointments** or `/portal/appointments`.

1. Choose a preferred future date and time.
2. Optionally add an alternate time.
3. Select video, phone, or in-person meeting.
4. Select a duration.
5. Enter a short topic and optional notes.
6. Choose **Request appointment**.

The browser supplies the local time zone. A request is not final until staff changes it to `CONFIRMED`. A confirmed video appointment may display a **Join meeting** link. Other possible statuses are `COMPLETED` and `CANCELLED`.

Do not place SSNs or other highly sensitive values in the appointment topic or notes.

## 10. View and pay invoices

Open **Invoices & payments** or `/portal/invoices`.

The page shows current balance, invoice number, description, creation date, due date, amount, and status:

- `UNPAID`: payment is due.
- `OVERDUE`: due date has passed.
- `PAID`: Stripe confirmed payment or staff recorded it through an authorized process.
- `REFUNDED`: the invoice was refunded.

### Pay with Stripe

1. Find an unpaid or overdue invoice.
2. Choose **Pay**.
3. The portal opens Stripe's secure hosted checkout page.
4. Enter payment details directly with Stripe.
5. After payment, return to the portal and refresh if necessary.

AllianceAccounting does not store card numbers. The invoice is marked paid only after Stripe sends a signature-verified confirmation matching the invoice amount and currency.

The download button currently produces a text invoice statement (`.txt`). True PDF invoice generation is not yet part of Phase 3.

If Stripe reports success but the portal remains unpaid, do not submit a second payment immediately. Contact staff through secure messaging with the invoice number—never send card details.

## 11. Send secure messages

Open **Messages** or `/portal/messages`.

### Start a conversation

1. Choose **New message**.
2. Enter a clear subject.
3. Write the message.
4. Choose **Create conversation**.

### Reply

Select a thread, type the response at the bottom, and choose the send icon. Message bodies are encrypted in the database. Staff receives a normal email notice that a secure message is waiting, but sensitive message contents are not copied into email.

Use secure messages for questions about tax work, document requests, invoices, or appointments. Do not include an SSN unless the firm has given a specific approved method; document upload is generally safer for official forms.

The database supports document-to-message attachments, but the Phase 3 client screen does not yet provide an attachment selector. Upload the document in **Documents** and reference its filename in the message.

## 12. Request additional services

Open **Service requests** or `/portal/service-requests`.

Current choices include:

- Payroll service.
- Sales tax service.
- Entity formation.
- IRS notice help.
- Bookkeeping consultation.

Select the service, describe the request, and choose **Send secure request**. Request details are encrypted and the request appears in history with its current status.

For an IRS notice, upload the notice securely under **IRS letters** and reference the filename. Do not paste the entire notice into ordinary email.

## 13. Form 8821 and Form 2848

The system can track taxpayer authorization using an uploaded signed Form 8821 or Form 2848. The current client portal does not yet include a polished authorization-linking screen, so follow staff instructions after uploading the signed form under the appropriate document category.

Staff verifies authorization and uses approved IRS e-Services/TDS workflows outside the portal. The portal does not provide automatic access to IRS records.

## 14. Email notifications

Depending on the activity, email may be sent for:

- Account verification.
- Password reset.
- Verification success.
- A new secure message.
- Document scan success or rejection.

Email notifications contain a portal link and non-sensitive summary. Sign in through the known firm website if a link looks unusual. Never reply to a notification email with tax documents or account information.

## 15. Common problems

| Problem | What to do |
|---|---|
| Verification email is missing | Check spam, wait a few minutes, request a new verification email, then contact staff |
| Reset link expired | Request a new password-reset email; links expire after one hour |
| Login is rejected | Confirm verification, email spelling, and password; then reset the password |
| File type or size is rejected | Use PDF/JPG/PNG/DOCX/XLSX/CSV and keep it at or below 25 MB |
| Document remains pending | Malware scanning is not complete; contact staff if it remains pending unusually long |
| Document is quarantined/rejected | Do not open or resend the same file; create a clean copy and contact staff |
| Appointment is requested but not confirmed | Wait for staff confirmation or send a secure message |
| Payment succeeded but invoice looks unpaid | Do not pay twice; send staff the invoice number through secure messages |
| Page says unauthorized or returns to login | Sign in again; the session may have expired |

## 16. Report a security concern

Contact the firm immediately using a known phone number if:

- Someone else may know the password.
- An unexpected reset/verification email arrives.
- A document or message appears under the wrong account.
- A device containing downloaded tax documents is lost.
- A suspicious email claims to be AllianceAccounting or Stripe.

Do not send screenshots containing SSNs, full account numbers, passwords, reset links, or tax documents through ordinary email.
