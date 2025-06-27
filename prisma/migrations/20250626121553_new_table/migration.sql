/*
  Warnings:

  - You are about to drop the column `billNumber` on the `Complaint` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Complaint" DROP COLUMN "billNumber",
ADD COLUMN     "buildingName" TEXT NOT NULL DEFAULT '';
