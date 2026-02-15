-- DropIndex
DROP INDEX "Inventory_itemCode_key";

-- AlterTable
ALTER TABLE "Inventory" ALTER COLUMN "itemCode" DROP NOT NULL,
ALTER COLUMN "category" DROP NOT NULL,
ALTER COLUMN "unitPrice" DROP NOT NULL;
