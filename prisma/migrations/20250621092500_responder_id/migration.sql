/*
  Warnings:

  - Added the required column `responderId` to the `ComplaintResponse` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ComplaintResponse" ADD COLUMN     "responderId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "ComplaintResponse" ADD CONSTRAINT "ComplaintResponse_responderId_fkey" FOREIGN KEY ("responderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
