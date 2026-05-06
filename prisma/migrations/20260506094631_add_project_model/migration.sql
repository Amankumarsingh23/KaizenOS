-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6B8F71',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Milestone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "projectName" TEXT NOT NULL,
    "phase" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "startDate" DATETIME,
    "targetDate" DATETIME NOT NULL,
    "completedDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "displayOrder" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Milestone_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Milestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Milestone" ("completedDate", "createdAt", "description", "displayOrder", "id", "projectName", "status", "targetDate", "title", "userId") SELECT "completedDate", "createdAt", "description", "displayOrder", "id", "projectName", "status", "targetDate", "title", "userId" FROM "Milestone";
DROP TABLE "Milestone";
ALTER TABLE "new_Milestone" RENAME TO "Milestone";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
