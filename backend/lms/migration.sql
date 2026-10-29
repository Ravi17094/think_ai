-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "completionThreshold" DOUBLE PRECISION NOT NULL DEFAULT 80;

-- AlterTable
ALTER TABLE "Module" ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN     "durationSeconds" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "videoBytes" INTEGER;

-- AlterTable
ALTER TABLE "Assessment" ADD COLUMN     "maxAttempts" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "passPercentage" DOUBLE PRECISION NOT NULL DEFAULT 60;

-- AlterTable
ALTER TABLE "AssessmentSubmission" ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "flaggedQuestionIds" JSONB,
ADD COLUMN     "gradingError" TEXT,
ADD COLUMN     "gradingLeaseAt" TIMESTAMP(3),
ADD COLUMN     "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "SubmissionAnswer" ADD COLUMN     "language" TEXT;

-- CreateTable
CREATE TABLE "LmsNote" (
    "id" SERIAL NOT NULL,
    "enrollmentId" INTEGER NOT NULL,
    "lessonId" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LmsNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LmsCertificateDelivery" (
    "id" SERIAL NOT NULL,
    "enrollmentId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LmsCertificateDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LmsNote_enrollmentId_lessonId_key" ON "LmsNote"("enrollmentId", "lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "LmsCertificateDelivery_enrollmentId_key" ON "LmsCertificateDelivery"("enrollmentId");

-- AddForeignKey
ALTER TABLE "LmsNote" ADD CONSTRAINT "LmsNote_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LmsNote" ADD CONSTRAINT "LmsNote_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LmsCertificateDelivery" ADD CONSTRAINT "LmsCertificateDelivery_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
