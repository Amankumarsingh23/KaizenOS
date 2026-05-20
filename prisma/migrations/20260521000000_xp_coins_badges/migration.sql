-- XP and coins on User
ALTER TABLE "User" ADD COLUMN "xp"    INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "coins" INTEGER NOT NULL DEFAULT 0;

-- Streak freeze on UserSettings
ALTER TABLE "UserSettings" ADD COLUMN "streakFreezeCount"   INTEGER;
ALTER TABLE "UserSettings" ADD COLUMN "lastFreezeEarnedAt"  TIMESTAMP(3);

-- Earned badges
CREATE TABLE "EarnedBadge" (
  "id"       TEXT         NOT NULL PRIMARY KEY,
  "userId"   TEXT         NOT NULL,
  "badgeId"  TEXT         NOT NULL,
  "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EarnedBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "EarnedBadge_userId_badgeId_key" UNIQUE ("userId", "badgeId")
);

-- Coin transactions (gifting)
CREATE TABLE "CoinTransaction" (
  "id"         TEXT         NOT NULL PRIMARY KEY,
  "fromUserId" TEXT         NOT NULL,
  "toUserId"   TEXT         NOT NULL,
  "amount"     INTEGER      NOT NULL,
  "message"    TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CoinTransaction_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CoinTransaction_toUserId_fkey"   FOREIGN KEY ("toUserId")   REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Weekly XP for league tracking
CREATE TABLE "WeeklyXp" (
  "id"        TEXT         NOT NULL PRIMARY KEY,
  "userId"    TEXT         NOT NULL,
  "weekStart" TIMESTAMP(3) NOT NULL,
  "xp"        INTEGER      NOT NULL DEFAULT 0,
  CONSTRAINT "WeeklyXp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "WeeklyXp_userId_weekStart_key" UNIQUE ("userId", "weekStart")
);
