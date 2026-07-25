-- CreateTable
CREATE TABLE "project_reviewers" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "roleKey" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_reviewers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_reviewers_userId_idx" ON "project_reviewers"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "project_reviewers_projectId_roleKey_key" ON "project_reviewers"("projectId", "roleKey");

-- AddForeignKey
ALTER TABLE "project_reviewers" ADD CONSTRAINT "project_reviewers_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_reviewers" ADD CONSTRAINT "project_reviewers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
