-- Featured badges array in settings
ALTER TABLE "UserSettings" ADD COLUMN "featuredBadges" TEXT;

-- Study challenges between friends
CREATE TABLE "Challenge" (
  "id"           TEXT         NOT NULL PRIMARY KEY,
  "challengerId" TEXT         NOT NULL,
  "challengedId" TEXT         NOT NULL,
  "weekStart"    TIMESTAMP(3) NOT NULL,
  "status"       TEXT         NOT NULL DEFAULT 'PENDING',
  "winnerUserId" TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Challenge_challengerId_fkey" FOREIGN KEY ("challengerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Challenge_challengedId_fkey" FOREIGN KEY ("challengedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Challenge_challengerId_challengedId_weekStart_key" UNIQUE ("challengerId", "challengedId", "weekStart")
);
