-- DropForeignKey
ALTER TABLE "ComplaintResponse" DROP CONSTRAINT "ComplaintResponse_responderId_fkey";

-- AlterTable
ALTER TABLE "ComplaintResponse" ALTER COLUMN "responderId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "ComplaintResponse" ADD CONSTRAINT "ComplaintResponse_responderId_fkey" FOREIGN KEY ("responderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
