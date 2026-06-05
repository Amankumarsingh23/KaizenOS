-- CreateTable
CREATE TABLE "ActiveSession" (
    "id"            TEXT NOT NULL,
    "userId"        TEXT NOT NULL,
    "category"      TEXT NOT NULL,
    "startedAt"     TIMESTAMP(3) NOT NULL,
    "lastResumedAt" TIMESTAMP(3) NOT NULL,
    "baseElapsed"   INTEGER NOT NULL DEFAULT 0,
    "isPaused"      BOOLEAN NOT NULL DEFAULT false,
    "updatedAt"     TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActiveSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ActiveSession_userId_key" ON "ActiveSession"("userId");

-- AddForeignKey
ALTER TABLE "ActiveSession" ADD CONSTRAINT "ActiveSession_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
