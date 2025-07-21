-- CreateEnum
CREATE TYPE "ConvienientTime" AS ENUM ('EIGHT_AM_TO_TEN_AM', 'TEN_AM_TO_TWELVE_PM', 'TWELVE_PM_TO_TWO_PM', 'TWO_PM_TO_FOUR_PM');

-- AlterTable
ALTER TABLE "Complaint" ADD COLUMN     "convienientTime" "ConvienientTime" NOT NULL DEFAULT 'EIGHT_AM_TO_TEN_AM',
ALTER COLUMN "apartmentNumber" DROP DEFAULT;
