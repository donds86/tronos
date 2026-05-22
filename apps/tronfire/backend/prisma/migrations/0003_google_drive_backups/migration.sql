ALTER TABLE "BackupJob" ADD COLUMN "driveStatus" TEXT NOT NULL DEFAULT 'DISABLED';
ALTER TABLE "BackupJob" ADD COLUMN "driveFileId" TEXT;
ALTER TABLE "BackupJob" ADD COLUMN "driveFileName" TEXT;
ALTER TABLE "BackupJob" ADD COLUMN "driveWebLink" TEXT;
ALTER TABLE "BackupJob" ADD COLUMN "driveUploadedAt" TIMESTAMP(3);
ALTER TABLE "BackupJob" ADD COLUMN "driveErrorMessage" TEXT;
