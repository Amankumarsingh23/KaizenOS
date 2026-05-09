CREATE TABLE "Friendship" (
  "id"        TEXT         NOT NULL PRIMARY KEY,
  "userId"    TEXT         NOT NULL,
  "friendId"  TEXT         NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Friendship_userId_fkey"    FOREIGN KEY ("userId")   REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Friendship_friendId_fkey"  FOREIGN KEY ("friendId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Friendship_userId_friendId_key" UNIQUE ("userId", "friendId")
);
