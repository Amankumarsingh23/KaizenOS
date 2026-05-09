-- Add cfHandle to UserSettings
ALTER TABLE "UserSettings" ADD COLUMN "cfHandle" TEXT;

-- ContestReminder table
CREATE TABLE "ContestReminder" (
  "id"          TEXT         NOT NULL PRIMARY KEY,
  "userId"      TEXT         NOT NULL,
  "contestId"   INTEGER      NOT NULL,
  "contestName" TEXT         NOT NULL,
  "startTime"   TIMESTAMP(3) NOT NULL,
  "remindAt"    TIMESTAMP(3) NOT NULL,
  "notified"    BOOLEAN      NOT NULL DEFAULT false,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContestReminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ContestReminder_userId_contestId_key" UNIQUE ("userId", "contestId")
);
