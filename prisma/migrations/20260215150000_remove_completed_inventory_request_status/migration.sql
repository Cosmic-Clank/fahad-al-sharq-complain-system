-- Remove completedAt and drop COMPLETED enum value
BEGIN;

ALTER TABLE
    "InventoryRequest"
ALTER COLUMN
    "status" DROP DEFAULT;

CREATE TYPE "InventoryRequestStatus_new" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

ALTER TABLE
    "InventoryRequest"
ALTER COLUMN
    "status" TYPE "InventoryRequestStatus_new" USING ("status" :: text :: "InventoryRequestStatus_new");

ALTER TYPE "InventoryRequestStatus" RENAME TO "InventoryRequestStatus_old";

ALTER TYPE "InventoryRequestStatus_new" RENAME TO "InventoryRequestStatus";

DROP TYPE "InventoryRequestStatus_old";

ALTER TABLE
    "InventoryRequest"
ALTER COLUMN
    "status"
SET
    DEFAULT 'PENDING';

ALTER TABLE
    "InventoryRequest" DROP COLUMN "completedAt";

COMMIT;