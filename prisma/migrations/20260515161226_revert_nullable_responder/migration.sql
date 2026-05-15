/*
  Warnings:

  - Made the column `responderId` on table `ComplaintResponse` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "ComplaintResponse" DROP CONSTRAINT "ComplaintResponse_responderId_fkey";

-- AlterTable
ALTER TABLE "ComplaintResponse" ALTER COLUMN "responderId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "ComplaintResponse" ADD CONSTRAINT "ComplaintResponse_responderId_fkey" FOREIGN KEY ("responderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
