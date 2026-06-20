-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "OrganizerStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'NEEDS_UPDATE', 'REVIEWED');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('REQUESTED', 'CONFIRMED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AppointmentMode" AS ENUM ('PHONE', 'VIDEO', 'IN_PERSON');

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN "stripeCheckoutSessionId" TEXT;

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'STRIPE',
    "providerPaymentId" TEXT,
    "checkoutSessionId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "receiptUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxOrganizer" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "taxYear" INTEGER NOT NULL,
    "status" "OrganizerStatus" NOT NULL DEFAULT 'DRAFT',
    "answersEncrypted" BYTEA NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TaxOrganizer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentRequest" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "requestedStart" TIMESTAMP(3) NOT NULL,
    "alternateStart" TIMESTAMP(3),
    "timeZone" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 30,
    "mode" "AppointmentMode" NOT NULL,
    "topic" TEXT NOT NULL,
    "notesEncrypted" BYTEA,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'REQUESTED',
    "meetingUrl" TEXT,
    "assignedStaffId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AppointmentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StripeWebhookEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StripeWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_stripeCheckoutSessionId_key" ON "Invoice"("stripeCheckoutSessionId");
CREATE UNIQUE INDEX "Payment_providerPaymentId_key" ON "Payment"("providerPaymentId");
CREATE UNIQUE INDEX "Payment_checkoutSessionId_key" ON "Payment"("checkoutSessionId");
CREATE INDEX "Payment_invoiceId_status_idx" ON "Payment"("invoiceId", "status");
CREATE INDEX "TaxOrganizer_status_updatedAt_idx" ON "TaxOrganizer"("status", "updatedAt" DESC);
CREATE UNIQUE INDEX "TaxOrganizer_clientId_taxYear_key" ON "TaxOrganizer"("clientId", "taxYear");
CREATE INDEX "AppointmentRequest_clientId_status_requestedStart_idx" ON "AppointmentRequest"("clientId", "status", "requestedStart");
CREATE INDEX "AppointmentRequest_status_requestedStart_idx" ON "AppointmentRequest"("status", "requestedStart");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaxOrganizer" ADD CONSTRAINT "TaxOrganizer_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaxOrganizer" ADD CONSTRAINT "TaxOrganizer_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AppointmentRequest" ADD CONSTRAINT "AppointmentRequest_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AppointmentRequest" ADD CONSTRAINT "AppointmentRequest_assignedStaffId_fkey" FOREIGN KEY ("assignedStaffId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
