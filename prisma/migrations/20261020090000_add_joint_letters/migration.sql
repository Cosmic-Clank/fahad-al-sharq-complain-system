-- CreateEnum
CREATE TYPE "JointLetterType" AS ENUM ('WARNING', 'PENALTY', 'NOTICE');

-- CreateTable
CREATE TABLE "JointLetter" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" "JointLetterType" NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "letterDate" TEXT NOT NULL,
    "penaltyId" INTEGER,
    "createdByName" TEXT NOT NULL,
    "employeeSignatureBase64" TEXT,
    "adminSignatureBase64" TEXT,
    "signedAt" TIMESTAMP(3),
    "signedByAdminName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JointLetter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JointLetter_userId_idx" ON "JointLetter"("userId");

-- CreateIndex
CREATE INDEX "JointLetter_penaltyId_idx" ON "JointLetter"("penaltyId");

-- AddForeignKey
ALTER TABLE "JointLetter" ADD CONSTRAINT "JointLetter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JointLetter" ADD CONSTRAINT "JointLetter_penaltyId_fkey" FOREIGN KEY ("penaltyId") REFERENCES "Penalty"("id") ON DELETE SET NULL ON UPDATE CASCADE;
