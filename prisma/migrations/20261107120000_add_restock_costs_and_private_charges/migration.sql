-- Restock purchase cost + bill (inventory-bills bucket, private) on ADD transactions made by the restock form.
-- Customer charge on private complaints (earnings report).
-- Additive only: new nullable columns, existing rows unchanged.
ALTER TABLE "InventoryTransaction" ADD COLUMN "cost" DOUBLE PRECISION;
ALTER TABLE "InventoryTransaction" ADD COLUMN "billPath" TEXT;
ALTER TABLE "InventoryTransaction" ADD COLUMN "recordedByName" TEXT;

ALTER TABLE "Complaint" ADD COLUMN "chargedAmount" DOUBLE PRECISION;
ALTER TABLE "Complaint" ADD COLUMN "chargedAt" TIMESTAMP(3);
ALTER TABLE "Complaint" ADD COLUMN "chargedByName" TEXT;
