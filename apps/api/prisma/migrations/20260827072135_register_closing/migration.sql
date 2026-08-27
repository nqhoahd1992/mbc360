-- CreateTable
CREATE TABLE "register_closures" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "registerKey" TEXT NOT NULL,

    CONSTRAINT "register_closures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "register_closure_sign_offs" (
    "id" TEXT NOT NULL,
    "closureId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "name" TEXT,
    "signedByUserId" TEXT,
    "signedAt" TIMESTAMP(3),
    "roleAtSigning" TEXT,
    "recordVersion" INTEGER,
    "signatureImage" TEXT,
    "signatureVerifiedAt" TIMESTAMP(3),

    CONSTRAINT "register_closure_sign_offs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "register_closures_projectId_registerKey_key" ON "register_closures"("projectId", "registerKey");

-- CreateIndex
CREATE UNIQUE INDEX "register_closure_sign_offs_closureId_role_key" ON "register_closure_sign_offs"("closureId", "role");

-- AddForeignKey
ALTER TABLE "register_closures" ADD CONSTRAINT "register_closures_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "register_closure_sign_offs" ADD CONSTRAINT "register_closure_sign_offs_closureId_fkey" FOREIGN KEY ("closureId") REFERENCES "register_closures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "register_closure_sign_offs" ADD CONSTRAINT "register_closure_sign_offs_signedByUserId_fkey" FOREIGN KEY ("signedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
