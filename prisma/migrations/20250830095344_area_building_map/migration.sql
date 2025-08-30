/*
  Warnings:

  - You are about to drop the column `emirate` on the `Buildings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Buildings" DROP COLUMN "emirate",
ADD COLUMN     "area" TEXT NOT NULL DEFAULT 'Taawun - Sharjah';
