-- Apply once after lms/migration.sql. No existing data is changed.
CREATE TABLE "LmsReportDelivery" (
    "id" SERIAL NOT NULL,
    "periodKey" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "recipients" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "lastError" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LmsReportDelivery_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LmsReportDelivery_periodKey_key" ON "LmsReportDelivery"("periodKey");
