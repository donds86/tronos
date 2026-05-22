ALTER TABLE "ManagedDatabase" ADD COLUMN "standbyPath" TEXT;
ALTER TABLE "ManagedDatabase" ADD COLUMN "standbyStatus" TEXT NOT NULL DEFAULT 'DISABLED';
ALTER TABLE "ManagedDatabase" ADD COLUMN "standbyRequiredForPromotion" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ManagedDatabase" ADD COLUMN "lastStandbyBackupAt" TIMESTAMP(3);
ALTER TABLE "ManagedDatabase" ADD COLUMN "lastStandbyValidatedAt" TIMESTAMP(3);
ALTER TABLE "ManagedDatabase" ADD COLUMN "lastStandbyBackupSha256" TEXT;

ALTER TABLE "BackupJob" ADD COLUMN "manifestPath" TEXT;
ALTER TABLE "BackupJob" ADD COLUMN "sourceNode" TEXT;
ALTER TABLE "BackupJob" ADD COLUMN "targetAlias" TEXT;
