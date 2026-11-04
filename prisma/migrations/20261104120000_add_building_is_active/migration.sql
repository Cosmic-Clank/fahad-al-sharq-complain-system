-- Buildings can be deactivated instead of deleted (old complaints keep referring to them by name).
-- Additive only: every existing building stays active.
ALTER TABLE "Buildings" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
