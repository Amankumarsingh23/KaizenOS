-- CreateTable
CREATE TABLE "UserSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "notifMorning" BOOLEAN NOT NULL DEFAULT true,
    "notifAfternoon" BOOLEAN NOT NULL DEFAULT true,
    "notifEvening" BOOLEAN NOT NULL DEFAULT true,
    "notifStreak" BOOLEAN NOT NULL DEFAULT true,
    "morningTime" TEXT NOT NULL DEFAULT '08:00',
    "eveningTime" TEXT NOT NULL DEFAULT '21:00',
    "weeklySchedule" TEXT,
    "githubUsername" TEXT,
    CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");
