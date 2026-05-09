-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('APPLIED','OA_RECEIVED','OA_SUBMITTED','INTERVIEW_R1','INTERVIEW_R2','INTERVIEW_R3','HR_ROUND','OFFER_RECEIVED','REJECTED','WITHDRAWN');

-- CreateEnum
CREATE TYPE "RoundType" AS ENUM ('OA','HR','TECHNICAL','SYSTEM_DESIGN','MANAGERIAL','CASE_STUDY');

-- CreateEnum
CREATE TYPE "RoundOutcome" AS ENUM ('CLEARED','REJECTED','PENDING');

-- GD practice sessions
CREATE TABLE "GDSession" (
  "id"            TEXT NOT NULL PRIMARY KEY,
  "topicId"       TEXT NOT NULL,
  "userId"        TEXT NOT NULL,
  "date"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "score"         INTEGER,
  "durationMin"   INTEGER,
  "groupSize"     INTEGER,
  "keyArgument"   TEXT,
  "whatWentWell"  TEXT,
  "whatToImprove" TEXT,
  "initiated"     BOOLEAN NOT NULL DEFAULT false,
  "concluded"     BOOLEAN NOT NULL DEFAULT false,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GDSession_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "GDTopic"("id") ON DELETE CASCADE,
  CONSTRAINT "GDSession_userId_fkey"  FOREIGN KEY ("userId")  REFERENCES "User"("id")    ON DELETE CASCADE
);

-- Interview question attempts
CREATE TABLE "QuestionAttempt" (
  "id"            TEXT NOT NULL PRIMARY KEY,
  "questionId"    TEXT NOT NULL,
  "userId"        TEXT NOT NULL,
  "date"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "rating"        INTEGER NOT NULL,
  "notes"         TEXT NOT NULL,
  "whatWentWell"  TEXT,
  "whatToImprove" TEXT,
  CONSTRAINT "QuestionAttempt_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "InterviewQuestion"("id") ON DELETE CASCADE,
  CONSTRAINT "QuestionAttempt_userId_fkey"     FOREIGN KEY ("userId")     REFERENCES "User"("id")             ON DELETE CASCADE
);

-- Placement companies
CREATE TABLE "Company" (
  "id"          TEXT NOT NULL PRIMARY KEY,
  "userId"      TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "role"        TEXT NOT NULL,
  "source"      TEXT,
  "appliedDate" TIMESTAMP(3) NOT NULL,
  "status"      "CompanyStatus" NOT NULL DEFAULT 'APPLIED',
  "ctc"         TEXT,
  "notes"       TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Company_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- Company interview rounds
CREATE TABLE "CompanyRound" (
  "id"        TEXT NOT NULL PRIMARY KEY,
  "companyId" TEXT NOT NULL,
  "type"      "RoundType"    NOT NULL,
  "date"      TIMESTAMP(3),
  "duration"  INTEGER,
  "outcome"   "RoundOutcome" NOT NULL DEFAULT 'PENDING',
  "notes"     TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CompanyRound_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE
);
