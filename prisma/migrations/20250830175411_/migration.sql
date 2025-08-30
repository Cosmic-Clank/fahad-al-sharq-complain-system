/*
  Warnings:

  - The values [TWENTY_FOUR_HOURS] on the enum `ConvenientTime` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ConvenientTime_new" AS ENUM ('EIGHT_AM_TO_TEN_AM', 'TEN_AM_TO_TWELVE_PM', 'TWELVE_PM_TO_TWO_PM', 'TWO_PM_TO_FOUR_PM', 'FOUR_PM_TO_SIX_PM', 'SIX_PM_TO_EIGHT_PM', 'EIGHT_PM_TO_TEN_PM', 'TEN_PM_TO_TWELVE_AM', 'TWELVE_AM_TO_TWO_AM', 'TWO_AM_TO_FOUR_AM', 'FOUR_AM_TO_SIX_AM', 'SIX_AM_TO_EIGHT_AM');
ALTER TABLE "Complaint" ALTER COLUMN "convenientTime" TYPE "ConvenientTime_new" USING ("convenientTime"::text::"ConvenientTime_new");
ALTER TYPE "ConvenientTime" RENAME TO "ConvenientTime_old";
ALTER TYPE "ConvenientTime_new" RENAME TO "ConvenientTime";
DROP TYPE "ConvenientTime_old";
COMMIT;
