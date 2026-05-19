CREATE TABLE "PhoneUsageLog" (
  "id"          TEXT         NOT NULL PRIMARY KEY,
  "userId"      TEXT         NOT NULL,
  "date"        TIMESTAMP(3) NOT NULL,
  "totalMins"   INTEGER      NOT NULL,
  "unlockCount" INTEGER      NOT NULL,
  "topApps"     TEXT         NOT NULL,
  "categories"  TEXT         NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PhoneUsageLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PhoneUsageLog_userId_date_key" UNIQUE ("userId", "date")
);
