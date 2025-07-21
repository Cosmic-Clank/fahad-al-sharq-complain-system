/*
  Warnings:

  - You are about to drop the column `convienientTime` on the `Complaint` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ConvenientTime" AS ENUM ('EIGHT_AM_TO_TEN_AM', 'TEN_AM_TO_TWELVE_PM', 'TWELVE_PM_TO_TWO_PM', 'TWO_PM_TO_FOUR_PM');

-- AlterTable
ALTER TABLE "Complaint" DROP COLUMN "convienientTime",
ADD COLUMN     "convenientTime" "ConvenientTime" NOT NULL DEFAULT 'EIGHT_AM_TO_TEN_AM';

-- DropEnum
DROP TYPE "ConvienientTime";
