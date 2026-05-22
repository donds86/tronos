CREATE TYPE "UserRole" AS ENUM ('ADMIN','TECNICO','CONSULTA');
CREATE TYPE "DatabaseType" AS ENUM ('PRODUCAO','LEGADO_CONSULTA','HOMOLOGACAO','TEMPLATE','RESTAURADO_TEMPORARIO','ARQUIVADO');
CREATE TYPE "AccessMode" AS ENUM ('READ_WRITE','READ_ONLY');
CREATE TYPE "JobStatus" AS ENUM ('PENDING','RUNNING','SUCCESS','FAILED','CANCELED');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'TECNICO',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "lastLoginAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE TABLE "Session" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ManagedDatabase" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "alias" TEXT NOT NULL,
  "filePath" TEXT NOT NULL,
  "type" "DatabaseType" NOT NULL DEFAULT 'HOMOLOGACAO',
  "accessMode" "AccessMode" NOT NULL DEFAULT 'READ_WRITE',
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "backupEnabled" BOOLEAN NOT NULL DEFAULT false,
  "backupFrequencyMinutes" INTEGER NOT NULL DEFAULT 60,
  "retentionDays" INTEGER NOT NULL DEFAULT 7,
  "status" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "lastCheckAt" TIMESTAMP(3),
  "lastBackupAt" TIMESTAMP(3),
  "version" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ManagedDatabase_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ManagedDatabase_alias_key" ON "ManagedDatabase"("alias");
CREATE UNIQUE INDEX "ManagedDatabase_filePath_key" ON "ManagedDatabase"("filePath");

CREATE TABLE "BackupJob" (
  "id" TEXT NOT NULL,
  "databaseId" TEXT NOT NULL,
  "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "backupPath" TEXT,
  "backupSize" BIGINT,
  "sha256" TEXT,
  "errorMessage" TEXT,
  "logPath" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BackupJob_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "BackupJob" ADD CONSTRAINT "BackupJob_databaseId_fkey" FOREIGN KEY ("databaseId") REFERENCES "ManagedDatabase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Alert" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "resolved" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT,
  "entityId" TEXT,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "details" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "SystemSetting" (
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("key")
);
