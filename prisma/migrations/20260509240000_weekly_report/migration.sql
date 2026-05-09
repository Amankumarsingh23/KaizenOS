CREATE TABLE "WeeklyReport" (
  "id"        TEXT         NOT NULL PRIMARY KEY,
  "userId"    TEXT         NOT NULL,
  "weekStart" TIMESTAMP(3) NOT NULL,
  "stats"     TEXT         NOT NULL,
  "aiSummary" TEXT         NOT NULL,
  "strengths" TEXT         NOT NULL,
  "gaps"      TEXT         NOT NULL,
  "nextWeek"  TEXT         NOT NULL,
  "motNote"   TEXT         NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WeeklyReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "WeeklyReport_userId_weekStart_key" UNIQUE ("userId", "weekStart")
);
