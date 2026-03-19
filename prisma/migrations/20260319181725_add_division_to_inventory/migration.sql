-- CreateEnum
CREATE TYPE "Division" AS ENUM ('DUBAI', 'SHARJAH');

-- AlterTable
ALTER TABLE "Inventory" ADD COLUMN     "division" "Division" NOT NULL DEFAULT 'DUBAI';
