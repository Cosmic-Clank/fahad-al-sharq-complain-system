/*
  Warnings:

  - You are about to drop the column `area` on the `Buildings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Buildings" DROP COLUMN "area",
ADD COLUMN     "emirate" TEXT NOT NULL DEFAULT 'dubai';
