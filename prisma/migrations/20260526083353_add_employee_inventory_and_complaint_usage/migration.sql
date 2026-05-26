-- CreateTable
CREATE TABLE "EmployeeInventory" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "inventoryId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplaintInventoryUsage" (
    "id" SERIAL NOT NULL,
    "complaintId" INTEGER NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "inventoryId" INTEGER NOT NULL,
    "quantityUsed" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplaintInventoryUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeInventory_employeeId_inventoryId_key" ON "EmployeeInventory"("employeeId", "inventoryId");

-- AddForeignKey
ALTER TABLE "EmployeeInventory" ADD CONSTRAINT "EmployeeInventory_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeInventory" ADD CONSTRAINT "EmployeeInventory_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplaintInventoryUsage" ADD CONSTRAINT "ComplaintInventoryUsage_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "Complaint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplaintInventoryUsage" ADD CONSTRAINT "ComplaintInventoryUsage_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplaintInventoryUsage" ADD CONSTRAINT "ComplaintInventoryUsage_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
