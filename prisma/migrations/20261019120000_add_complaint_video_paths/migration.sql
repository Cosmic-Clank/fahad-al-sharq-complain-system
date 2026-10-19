-- AlterTable
ALTER TABLE "Complaint" ADD COLUMN     "videoPaths" TEXT[] DEFAULT ARRAY[]::TEXT[];
