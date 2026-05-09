-- Add isPublic to UserSettings
ALTER TABLE "UserSettings" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false;

-- DSA Skill self-rating grid
CREATE TABLE "DSASkill" (
  "id"            TEXT        NOT NULL PRIMARY KEY,
  "userId"        TEXT        NOT NULL,
  "topic"         TEXT        NOT NULL,
  "level"         INTEGER     NOT NULL DEFAULT 0,
  "practiceCount" INTEGER     NOT NULL DEFAULT 0,
  "lastPracticed" TIMESTAMP(3),
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DSASkill_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "DSASkill_userId_topic_key" UNIQUE ("userId", "topic")
);
