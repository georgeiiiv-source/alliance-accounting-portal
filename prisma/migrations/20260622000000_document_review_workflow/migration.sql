CREATE TYPE "DocumentReviewStatus" AS ENUM ('PENDING', 'REVIEWED', 'ACCEPTED', 'REJECTED', 'NEEDS_REPLACEMENT');

ALTER TABLE "Document"
ADD COLUMN "reviewStatus" "DocumentReviewStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "reviewedAt" TIMESTAMP(3),
ADD COLUMN "reviewedById" TEXT,
ADD COLUMN "reviewNote" TEXT;

ALTER TABLE "Document"
ADD CONSTRAINT "Document_reviewedById_fkey"
FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Document_reviewStatus_createdAt_idx" ON "Document"("reviewStatus", "createdAt" DESC);
