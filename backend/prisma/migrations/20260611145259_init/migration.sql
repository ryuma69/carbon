-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "housingType" TEXT NOT NULL,
    "housingOwnership" TEXT NOT NULL,
    "heatingType" TEXT NOT NULL,
    "hasEV" BOOLEAN NOT NULL,
    "hasGasCar" BOOLEAN NOT NULL,
    "commuteDistance" REAL NOT NULL,
    "primaryMode" TEXT NOT NULL,
    "diet" TEXT NOT NULL,
    "focusArea" TEXT NOT NULL DEFAULT 'general',
    "completedActions" TEXT NOT NULL DEFAULT '[]',
    "skippedActions" TEXT NOT NULL DEFAULT '[]',
    "consecutiveLogs" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CarbonLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "unit" TEXT NOT NULL,
    "emissionsKg" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CarbonLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");
