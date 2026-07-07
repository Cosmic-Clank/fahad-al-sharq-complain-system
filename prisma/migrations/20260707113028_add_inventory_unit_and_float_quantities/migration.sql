-- CreateEnum
CREATE TYPE "Unit" AS ENUM ('PIECES', 'METERS');

-- AlterTable
ALTER TABLE "ComplaintInventoryUsage" ALTER COLUMN "quantityUsed" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "EmployeeInventory" ALTER COLUMN "quantity" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Inventory" ADD COLUMN     "unit" "Unit" NOT NULL DEFAULT 'PIECES',
ALTER COLUMN "quantity" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "InventoryRequest" ALTER COLUMN "quantity" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "InventoryTransaction" ALTER COLUMN "quantity" SET DATA TYPE DOUBLE PRECISION;
