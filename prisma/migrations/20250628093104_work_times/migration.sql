/*
  Warnings:

  - You are about to drop the column `completedAt` on the `ComplaintResponse` table. All the data in the column will be lost.
  - You are about to drop the column `startedAt` on the `ComplaintResponse` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ComplaintResponse" DROP COLUMN "completedAt",
DROP COLUMN "startedAt";

-- CreateTable
CREATE TABLE "WorkTimes" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "complaintId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkTimes_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "WorkTimes" ADD CONSTRAINT "WorkTimes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkTimes" ADD CONSTRAINT "WorkTimes_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "Complaint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
