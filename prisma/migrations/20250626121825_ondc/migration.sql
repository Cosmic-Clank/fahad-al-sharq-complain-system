-- DropForeignKey
ALTER TABLE "ComplaintResponse" DROP CONSTRAINT "ComplaintResponse_complaintId_fkey";

-- AddForeignKey
ALTER TABLE "ComplaintResponse" ADD CONSTRAINT "ComplaintResponse_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "Complaint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
