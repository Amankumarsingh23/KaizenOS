-- AlterTable: add nullable userId to GDTopic
ALTER TABLE "GDTopic" ADD COLUMN "userId" TEXT;

-- AlterTable: add nullable userId to InterviewQuestion
ALTER TABLE "InterviewQuestion" ADD COLUMN "userId" TEXT;

-- AddForeignKey
ALTER TABLE "GDTopic" ADD CONSTRAINT "GDTopic_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewQuestion" ADD CONSTRAINT "InterviewQuestion_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
