-- CreateTable
CREATE TABLE "Course" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "duration" TEXT NOT NULL,
    "thumbnail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Batch" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "courseId" INTEGER NOT NULL,
    "instructorName" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Batch_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Enrollment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "studentName" TEXT NOT NULL,
    "studentEmail" TEXT NOT NULL,
    "batchId" INTEGER NOT NULL,
    "enrollmentStatus" TEXT NOT NULL DEFAULT 'ENROLLED',
    "enrolledAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Enrollment_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "hashedPassword" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "LiveSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "meetingUrl" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" DATETIME,
    "durationMins" INTEGER,
    CONSTRAINT "Attendance_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "LiveSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Recording" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Recording_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "LiveSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
